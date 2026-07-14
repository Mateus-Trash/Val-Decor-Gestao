import { and, desc, eq, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { addDays } from "date-fns";
import { z } from "zod";
import {
  colaboradores,
  comissoes,
  itens,
  itensPedido,
  kitItens,
  kits,
  kitsPedido,
  pedidos,
  transacoesFinanceiras,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getReservadoPorItemNaData } from "../estoqueUtils";

const statusEnum = z.enum(["Pendente", "Confirmado", "EntregueNaoPago", "EntreguePago", "Concluido"]);

export const pedidosRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db
      .select({
        id: pedidos.id,
        nomeCliente: pedidos.nomeCliente,
        colaboradorId: pedidos.colaboradorId,
        data: pedidos.data,
        ruaEntrega: pedidos.ruaEntrega,
        bairroEntrega: pedidos.bairroEntrega,
        numeroEntrega: pedidos.numeroEntrega,
        valorTotal: pedidos.valorTotal,
        valorTaxaEntrega: pedidos.valorTaxaEntrega,
        status: pedidos.status,
        observacoes: pedidos.observacoes,
        createdAt: pedidos.createdAt,
        updatedAt: pedidos.updatedAt,
        nomeColaborador: colaboradores.nome,
      })
      .from(pedidos)
      .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
      .orderBy(desc(pedidos.createdAt));

    // Query composition details for itens and kits per pedido
    const itensCompRows = await db
      .select({
        pedidoId: itensPedido.pedidoId,
        nome: itens.nome,
        quantidade: itensPedido.quantidade,
      })
      .from(itensPedido)
      .innerJoin(itens, eq(itensPedido.itemId, itens.id));

    const kitsCompRows = await db
      .select({
        pedidoId: kitsPedido.pedidoId,
        nome: kits.nome,
        quantidade: kitsPedido.quantidade,
      })
      .from(kitsPedido)
      .innerJoin(kits, eq(kitsPedido.kitId, kits.id));

    const itensMap = new Map<number, { nome: string; quantidade: number }[]>();
    for (const row of itensCompRows) {
      if (!itensMap.has(row.pedidoId)) itensMap.set(row.pedidoId, []);
      itensMap.get(row.pedidoId)!.push({ nome: row.nome, quantidade: row.quantidade });
    }

    const kitsMap = new Map<number, { nome: string; quantidade: number }[]>();
    for (const row of kitsCompRows) {
      if (!kitsMap.has(row.pedidoId)) kitsMap.set(row.pedidoId, []);
      kitsMap.get(row.pedidoId)!.push({ nome: row.nome, quantidade: row.quantidade });
    }

    return result.map((p) => ({
      ...p,
      composicaoItens: itensMap.get(p.id) ?? [],
      composicaoKits: kitsMap.get(p.id) ?? [],
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const pedido = await db
        .select({
          id: pedidos.id,
          nomeCliente: pedidos.nomeCliente,
          colaboradorId: pedidos.colaboradorId,
          data: pedidos.data,
          ruaEntrega: pedidos.ruaEntrega,
          bairroEntrega: pedidos.bairroEntrega,
          numeroEntrega: pedidos.numeroEntrega,
          valorTotal: pedidos.valorTotal,
          valorTaxaEntrega: pedidos.valorTaxaEntrega,
          status: pedidos.status,
          observacoes: pedidos.observacoes,
          createdAt: pedidos.createdAt,
          nomeColaborador: colaboradores.nome,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(eq(pedidos.id, input.id))
        .limit(1);

      if (pedido.length === 0) throw new Error("Pedido não encontrado");

      // Buscar itens do pedido
      const itensResult = await db
        .select({
          id: itensPedido.id,
          itemId: itensPedido.itemId,
          nome: itens.nome,
          quantidade: itensPedido.quantidade,
          valorUnitario: itensPedido.valorUnitario,
        })
        .from(itensPedido)
        .innerJoin(itens, eq(itensPedido.itemId, itens.id))
        .where(eq(itensPedido.pedidoId, input.id));

      // Buscar kits do pedido
      const kitsResult = await db
        .select({
          id: kitsPedido.id,
          kitId: kitsPedido.kitId,
          nome: kits.nome,
          quantidade: kitsPedido.quantidade,
          valorUnitario: kitsPedido.valorUnitario,
        })
        .from(kitsPedido)
        .innerJoin(kits, eq(kitsPedido.kitId, kits.id))
        .where(eq(kitsPedido.pedidoId, input.id));

      return {
        ...pedido[0],
        itens: itensResult,
        kits: kitsResult,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        nomeCliente: z.string().min(1, "Nome do cliente é obrigatório"),
        colaboradorId: z.number().int().positive(),
        data: z.coerce.date(),
        ruaEntrega: z.string().min(1, "Rua é obrigatória"),
        bairroEntrega: z.string().min(1, "Bairro é obrigatório"),
        numeroEntrega: z.string().min(1, "Número é obrigatório"),
        valorTaxaEntrega: z.number().min(0).default(0),
        observacoes: z.string().optional(),
        itens: z.array(
          z.object({
            itemId: z.number().int().positive(),
            quantidade: z.number().int().positive(),
            valorUnitario: z.number().int().positive(),
          })
        ),
        kits: z
          .array(
            z.object({
              kitId: z.number().int().positive(),
              quantidade: z.number().int().positive(),
              valorUnitario: z.number().int().positive(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // ─── Consolidar demanda total por item (diretos + kits) ───
      const demandaPorItem = new Map<number, number>();

      for (const item of input.itens) {
        demandaPorItem.set(item.itemId, (demandaPorItem.get(item.itemId) || 0) + item.quantidade);
      }

      for (const kit of input.kits) {
        const kitItensResult = await db
          .select({ itemId: kitItens.itemId, quantidade: kitItens.quantidade })
          .from(kitItens)
          .where(eq(kitItens.kitId, kit.kitId));

        for (const ki of kitItensResult) {
          const qtdNecessaria = kit.quantidade * ki.quantidade;
          demandaPorItem.set(ki.itemId, (demandaPorItem.get(ki.itemId) || 0) + qtdNecessaria);
        }
      }

      // ─── Verificar estoque por data ───
      const reservadoNaData = await getReservadoPorItemNaData(db, input.data);
      for (const [itemId, qtdTotal] of Array.from(demandaPorItem.entries())) {
        const [itemDb] = await db
          .select({ nome: itens.nome, quantidadeTotal: itens.quantidadeTotal })
          .from(itens)
          .where(eq(itens.id, itemId))
          .limit(1);
        if (!itemDb) throw new Error(`Item com id ${itemId} não encontrado`);
        const disponivel = itemDb.quantidadeTotal - (reservadoNaData.get(itemId) || 0);
        if (disponivel < qtdTotal) {
          throw new Error(`Estoque insuficiente para ${itemDb.nome} nesta data`);
        }
      }

      // Calcular valorTotal
      const totalItens = input.itens.reduce(
        (acc, i) => acc + i.valorUnitario * i.quantidade,
        0
      );
      const totalKits = input.kits.reduce(
        (acc, k) => acc + k.valorUnitario * k.quantidade,
        0
      );
      const valorTotal = totalItens + totalKits;

      // Inserir pedido
      const result = await db.insert(pedidos).values({
        nomeCliente: input.nomeCliente,
        colaboradorId: input.colaboradorId,
        data: input.data,
        ruaEntrega: input.ruaEntrega,
        bairroEntrega: input.bairroEntrega,
        numeroEntrega: input.numeroEntrega,
        valorTotal,
        valorTaxaEntrega: input.valorTaxaEntrega,
        status: "Pendente",
        observacoes: input.observacoes,
      });

      const pedidoId = Number(result[0].insertId);

      // Inserir itensPedido (sem deduzir estoque)
      for (const item of input.itens) {
        await db.insert(itensPedido).values({
          pedidoId,
          itemId: item.itemId,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
        });
      }

      // Inserir kitsPedido (sem deduzir estoque)
      for (const kit of input.kits) {
        await db.insert(kitsPedido).values({
          pedidoId,
          kitId: kit.kitId,
          quantidade: kit.quantidade,
          valorUnitario: kit.valorUnitario,
        });
      }

      // Criar transação receita
      await db.insert(transacoesFinanceiras).values({
        pedidoId,
        tipo: "receita",
        descricao: `Pedido #${pedidoId}`,
        valor: valorTotal,
      });

      // Se taxa de entrega > 0, criar transação taxa_entrega
      if (input.valorTaxaEntrega > 0) {
        await db.insert(transacoesFinanceiras).values({
          pedidoId,
          tipo: "taxa_entrega",
          descricao: `Taxa de entrega - Pedido #${pedidoId}`,
          valor: Math.round(input.valorTaxaEntrega * 100),
        });
      }

      return { pedidoId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nomeCliente: z.string().min(1, "Nome do cliente é obrigatório").optional(),
        colaboradorId: z.number().int().positive().optional(),
        data: z.coerce.date().optional(),
        ruaEntrega: z.string().optional(),
        bairroEntrega: z.string().optional(),
        numeroEntrega: z.string().optional(),
        observacoes: z.string().optional(),
        valorTaxaEntrega: z.number().min(0).optional(),
        itens: z.array(
          z.object({
            itemId: z.number().int().positive(),
            quantidade: z.number().int().positive(),
            valorUnitario: z.number().int().positive(),
          })
        ).optional(),
        kits: z.array(
          z.object({
            kitId: z.number().int().positive(),
            quantidade: z.number().int().positive(),
            valorUnitario: z.number().int().positive(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, itens: novosItens, kits: novosKits, ...campos } = input;
      const camposUpdate: Record<string, unknown> = { ...campos };

      // Buscar pedido atual para saber a data atual (necessário para estoque)
      const [pedidoAtual] = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, id))
        .limit(1);
      if (!pedidoAtual) throw new Error("Pedido não encontrado");

      const dataEfetiva = input.data ?? pedidoAtual.data;

      // Se itens ou kits foram enviados, refazer composição
      if (novosItens !== undefined || novosKits !== undefined) {
        const itensArr = novosItens ?? [];
        const kitsArr = novosKits ?? [];

        // ─── Consolidar demanda total por item (diretos + kits) ───
        const demandaPorItem = new Map<number, number>();
        for (const item of itensArr) {
          demandaPorItem.set(item.itemId, (demandaPorItem.get(item.itemId) || 0) + item.quantidade);
        }
        for (const kit of kitsArr) {
          const kitItensResult = await db
            .select({ itemId: kitItens.itemId, quantidade: kitItens.quantidade })
            .from(kitItens)
            .where(eq(kitItens.kitId, kit.kitId));
          for (const ki of kitItensResult) {
            const qtdNecessaria = kit.quantidade * ki.quantidade;
            demandaPorItem.set(ki.itemId, (demandaPorItem.get(ki.itemId) || 0) + qtdNecessaria);
          }
        }

        // ─── Verificar estoque por data (excluindo o próprio pedido da reserva) ───
        const reservadoNaData = await getReservadoPorItemNaData(db, dataEfetiva);
        // Subtrair a reserva do próprio pedido (itens diretos + kits atuais)
        const itensAtuais = await db
          .select({ itemId: itensPedido.itemId, quantidade: itensPedido.quantidade })
          .from(itensPedido)
          .where(eq(itensPedido.pedidoId, id));
        for (const ia of itensAtuais) {
          reservadoNaData.set(ia.itemId, (reservadoNaData.get(ia.itemId) || 0) - ia.quantidade);
        }
        const kitsAtuais = await db
          .select({ kitId: kitsPedido.kitId, quantidade: kitsPedido.quantidade })
          .from(kitsPedido)
          .where(eq(kitsPedido.pedidoId, id));
        for (const ka of kitsAtuais) {
          const composicao = await db.select().from(kitItens).where(eq(kitItens.kitId, ka.kitId));
          for (const ki of composicao) {
            const qtd = ka.quantidade * ki.quantidade;
            reservadoNaData.set(ki.itemId, (reservadoNaData.get(ki.itemId) || 0) - qtd);
          }
        }

        for (const [itemId, qtdTotal] of Array.from(demandaPorItem.entries())) {
          const [itemDb] = await db
            .select({ nome: itens.nome, quantidadeTotal: itens.quantidadeTotal })
            .from(itens)
            .where(eq(itens.id, itemId))
            .limit(1);
          if (!itemDb) throw new Error(`Item com id ${itemId} não encontrado`);
          const disponivel = itemDb.quantidadeTotal - (reservadoNaData.get(itemId) || 0);
          if (disponivel < qtdTotal) {
            throw new Error(`Estoque insuficiente para ${itemDb.nome} nesta data`);
          }
        }

        // ─── Deletar composição antiga ───
        await db.delete(itensPedido).where(eq(itensPedido.pedidoId, id));
        await db.delete(kitsPedido).where(eq(kitsPedido.pedidoId, id));

        // ─── Inserir nova composição ───
        for (const item of itensArr) {
          await db.insert(itensPedido).values({
            pedidoId: id,
            itemId: item.itemId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
          });
        }
        for (const kit of kitsArr) {
          await db.insert(kitsPedido).values({
            pedidoId: id,
            kitId: kit.kitId,
            quantidade: kit.quantidade,
            valorUnitario: kit.valorUnitario,
          });
        }

        // ─── Recalcular valorTotal ───
        const totalItens = itensArr.reduce((acc, i) => acc + i.valorUnitario * i.quantidade, 0);
        const totalKits = kitsArr.reduce((acc, k) => acc + k.valorUnitario * k.quantidade, 0);
        const valorTotal = totalItens + totalKits;
        camposUpdate.valorTotal = valorTotal;

        // ─── Atualizar transação financeira de receita ───
        const receitaExistente = await db
          .select()
          .from(transacoesFinanceiras)
          .where(
            and(
              eq(transacoesFinanceiras.pedidoId, id),
              eq(transacoesFinanceiras.tipo, "receita")
            )
          );
        if (receitaExistente.length > 0) {
          await db
            .update(transacoesFinanceiras)
            .set({ valor: valorTotal })
            .where(eq(transacoesFinanceiras.id, receitaExistente[0].id));
        } else {
          await db.insert(transacoesFinanceiras).values({
            pedidoId: id,
            tipo: "receita",
            descricao: `Pedido #${id}`,
            valor: valorTotal,
          });
        }
      }

      // ─── Recalcular comissão se o pedido já estiver Concluído ───
      if (camposUpdate.valorTotal !== undefined) {
        const comissaoExistente = await db
          .select()
          .from(comissoes)
          .where(eq(comissoes.pedidoId, id))
          .limit(1);

        if (comissaoExistente.length > 0) {
          const colab = await db
            .select()
            .from(colaboradores)
            .where(eq(colaboradores.id, pedidoAtual.colaboradorId))
            .limit(1);

          if (colab.length > 0) {
            const novoValorComissao = Math.floor(
              (Number(camposUpdate.valorTotal) * colab[0].percentualComissao) / 100
            );

            await db
              .update(comissoes)
              .set({ valor: novoValorComissao })
              .where(eq(comissoes.id, comissaoExistente[0].id));

            // Atualizar também a transação financeira de despesa da comissão
            const despesaComissao = await db
              .select()
              .from(transacoesFinanceiras)
              .where(
                and(
                  eq(transacoesFinanceiras.pedidoId, id),
                  eq(transacoesFinanceiras.tipo, "despesa")
                )
              )
              .limit(1);

            if (despesaComissao.length > 0) {
              await db
                .update(transacoesFinanceiras)
                .set({ valor: novoValorComissao })
                .where(eq(transacoesFinanceiras.id, despesaComissao[0].id));
            }
          }
        }
      }

      // ─── Se colaborador mudou e pedido está Concluído, refazer comissão ───
      if (input.colaboradorId !== undefined && input.colaboradorId !== pedidoAtual.colaboradorId) {
        const comissaoExistente = await db
          .select()
          .from(comissoes)
          .where(eq(comissoes.pedidoId, id))
          .limit(1);

        if (comissaoExistente.length > 0) {
          // Remover comissão antiga
          await db.delete(comissoes).where(eq(comissoes.id, comissaoExistente[0].id));

          // Remover transação financeira de despesa da comissão antiga
          await db
            .delete(transacoesFinanceiras)
            .where(
              and(
                eq(transacoesFinanceiras.pedidoId, id),
                eq(transacoesFinanceiras.tipo, "despesa"),
                like(transacoesFinanceiras.descricao, "Comissão%")
              )
            );

          // Criar nova comissão para o novo colaborador
          const novoColab = await db
            .select()
            .from(colaboradores)
            .where(eq(colaboradores.id, input.colaboradorId))
            .limit(1);

          if (novoColab.length > 0) {
            const valorTotalEfetivo = Number(camposUpdate.valorTotal ?? pedidoAtual.valorTotal);
            const novaComissao = Math.floor(
              (valorTotalEfetivo * novoColab[0].percentualComissao) / 100
            );

            await db.insert(comissoes).values({
              colaboradorId: input.colaboradorId,
              pedidoId: id,
              valor: novaComissao,
            });

            await db.insert(transacoesFinanceiras).values({
              pedidoId: id,
              tipo: "despesa",
              descricao: `Comissão - ${novoColab[0].nome}`,
              valor: novaComissao,
            });
          }
        }
      }

      // ─── Atualizar transação de taxa_entrega se valorTaxaEntrega mudou ───
      if (input.valorTaxaEntrega !== undefined) {
        const taxaExistente = await db
          .select()
          .from(transacoesFinanceiras)
          .where(
            and(
              eq(transacoesFinanceiras.pedidoId, id),
              eq(transacoesFinanceiras.tipo, "taxa_entrega")
            )
          );
        const taxaValorCentavos = Math.round(input.valorTaxaEntrega * 100);

        if (taxaValorCentavos > 0) {
          if (taxaExistente.length > 0) {
            await db
              .update(transacoesFinanceiras)
              .set({ valor: taxaValorCentavos })
              .where(eq(transacoesFinanceiras.id, taxaExistente[0].id));
          } else {
            await db.insert(transacoesFinanceiras).values({
              pedidoId: id,
              tipo: "taxa_entrega",
              descricao: `Taxa de entrega - Pedido #${id}`,
              valor: taxaValorCentavos,
            });
          }
        } else {
          // Se taxa passou a 0, remover transação existente
          if (taxaExistente.length > 0) {
            await db
              .delete(transacoesFinanceiras)
              .where(eq(transacoesFinanceiras.id, taxaExistente[0].id));
          }
        }
      }

      return db.update(pedidos).set(camposUpdate).where(eq(pedidos.id, id));
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusEnum,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar status atual do pedido
      const pedidoAtual = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, input.id))
        .limit(1);

      if (pedidoAtual.length === 0) throw new Error("Pedido não encontrado");

      const statusAnterior = pedidoAtual[0].status;

      // Se mudar para "Concluido": calcular e inserir comissão
      if (input.status === "Concluido" && statusAnterior !== "Concluido") {
        const pedido = pedidoAtual[0];

        // Buscar colaborador
        const colab = await db
          .select()
          .from(colaboradores)
          .where(eq(colaboradores.id, pedido.colaboradorId))
          .limit(1);

        if (colab.length > 0) {
          // Verificar se já existe comissão para este pedido
          const comissaoExistente = await db
            .select()
            .from(comissoes)
            .where(eq(comissoes.pedidoId, input.id))
            .limit(1);

          if (comissaoExistente.length === 0) {
            const valorComissao = Math.floor(
              (pedido.valorTotal * colab[0].percentualComissao) / 100
            );

            await db.insert(comissoes).values({
              colaboradorId: pedido.colaboradorId,
              pedidoId: input.id,
              valor: valorComissao,
            });

            await db.insert(transacoesFinanceiras).values({
              pedidoId: input.id,
              tipo: "despesa",
              descricao: `Comissão - ${colab[0].nome}`,
              valor: valorComissao,
            });
          }
        }
      }

      // Se mudar DE "Concluido" para outro status: remover comissão
      if (statusAnterior === "Concluido" && input.status !== "Concluido") {
        await db.delete(comissoes).where(eq(comissoes.pedidoId, input.id));

        // Deletar transação de despesa de comissão
        await db
          .delete(transacoesFinanceiras)
          .where(
            and(
              eq(transacoesFinanceiras.pedidoId, input.id),
              eq(transacoesFinanceiras.tipo, "despesa"),
              like(transacoesFinanceiras.descricao, "Comissão%")
            )
          );
      }

      // Se mudar para status que cancela o pedido (futuro "Cancelado"): devolver estoque
      // Preparado para quando o enum incluir "Cancelado"
      // Por agora, nenhuma ação de estoque para outras transições de status

      // Atualizar status
      return db.update(pedidos).set({ status: input.status }).where(eq(pedidos.id, input.id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deletar na ordem correta (estoque é calculado dinamicamente, não precisa devolver)
      await db.delete(itensPedido).where(eq(itensPedido.pedidoId, input.id));
      await db.delete(kitsPedido).where(eq(kitsPedido.pedidoId, input.id));
      await db.delete(comissoes).where(eq(comissoes.pedidoId, input.id));
      await db.delete(transacoesFinanceiras).where(eq(transacoesFinanceiras.pedidoId, input.id));
      return db.delete(pedidos).where(eq(pedidos.id, input.id));
    }),


  /**
   * Retorna entregas e coletas do dia para a tela de Logística.
   * - Entregas: DATE(data) = data selecionada AND status != Concluido
   * - Coletas: data de coleta efetiva = data selecionada AND status != Concluido
   *   Data de coleta efetiva = coletaAdiadaPara se preenchido, senão data + 1 dia
   * Ambos os grupos são ordenados por bairroEntrega para otimizar rota.
   */
  listByDataLogistica: protectedProcedure
    .input(z.object({ data: z.coerce.date() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dataStr = input.data.toISOString().slice(0, 10);

      // Entregas: DATE(data) = data selecionada AND status != Concluido
      const entregas = await db
        .select({
          id: pedidos.id,
          nomeCliente: pedidos.nomeCliente,
          colaboradorId: pedidos.colaboradorId,
          data: pedidos.data,
          ruaEntrega: pedidos.ruaEntrega,
          bairroEntrega: pedidos.bairroEntrega,
          numeroEntrega: pedidos.numeroEntrega,
          valorTotal: pedidos.valorTotal,
          valorTaxaEntrega: pedidos.valorTaxaEntrega,
          status: pedidos.status,
          observacoes: pedidos.observacoes,
          coletaAdiadaPara: pedidos.coletaAdiadaPara,
          createdAt: pedidos.createdAt,
          updatedAt: pedidos.updatedAt,
          nomeColaborador: colaboradores.nome,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            sql`DATE(${pedidos.data}) = ${dataStr}`,
            sql`${pedidos.status} != 'Concluido'`
          )
        )
        .orderBy(pedidos.bairroEntrega, pedidos.nomeCliente);

      // Coletas: data de coleta efetiva = data selecionada AND status != Concluido
      // Data de coleta efetiva = coletaAdiadaPara se preenchido, senão data + 1 dia
      const dataAnterior = addDays(input.data, -1).toISOString().slice(0, 10);
      const coletas = await db
        .select({
          id: pedidos.id,
          nomeCliente: pedidos.nomeCliente,
          colaboradorId: pedidos.colaboradorId,
          data: pedidos.data,
          ruaEntrega: pedidos.ruaEntrega,
          bairroEntrega: pedidos.bairroEntrega,
          numeroEntrega: pedidos.numeroEntrega,
          valorTotal: pedidos.valorTotal,
          valorTaxaEntrega: pedidos.valorTaxaEntrega,
          status: pedidos.status,
          observacoes: pedidos.observacoes,
          coletaAdiadaPara: pedidos.coletaAdiadaPara,
          createdAt: pedidos.createdAt,
          updatedAt: pedidos.updatedAt,
          nomeColaborador: colaboradores.nome,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            or(
              // Coleta adiada: coletaAdiadaPara = data selecionada
              sql`DATE(${pedidos.coletaAdiadaPara}) = ${dataStr}`,
              // Coleta normal: coletaAdiadaPara é null E data + 1 = data selecionada
              and(
                isNull(pedidos.coletaAdiadaPara),
                sql`DATE(${pedidos.data}) = ${dataAnterior}`
              )
            ),
            sql`${pedidos.status} != 'Concluido'`
          )
        )
        .orderBy(pedidos.bairroEntrega, pedidos.nomeCliente);

      // Query composition details for itens and kits
      const todosPedidoIds = [...entregas.map((p) => p.id), ...coletas.map((p) => p.id)];
      if (todosPedidoIds.length === 0) return { entregas: [], coletas: [] };

      const itensCompRows = await db
        .select({
          pedidoId: itensPedido.pedidoId,
          nome: itens.nome,
          quantidade: itensPedido.quantidade,
        })
        .from(itensPedido)
        .innerJoin(itens, eq(itensPedido.itemId, itens.id))
        .where(inArray(itensPedido.pedidoId, todosPedidoIds));

      const kitsCompRows = await db
        .select({
          pedidoId: kitsPedido.pedidoId,
          nome: kits.nome,
          quantidade: kitsPedido.quantidade,
        })
        .from(kitsPedido)
        .innerJoin(kits, eq(kitsPedido.kitId, kits.id))
        .where(inArray(kitsPedido.pedidoId, todosPedidoIds));

      const itensMap = new Map<number, { nome: string; quantidade: number }[]>();
      for (const row of itensCompRows) {
        if (!itensMap.has(row.pedidoId)) itensMap.set(row.pedidoId, []);
        itensMap.get(row.pedidoId)!.push({ nome: row.nome, quantidade: row.quantidade });
      }
      const kitsMap = new Map<number, { nome: string; quantidade: number }[]>();
      for (const row of kitsCompRows) {
        if (!kitsMap.has(row.pedidoId)) kitsMap.set(row.pedidoId, []);
        kitsMap.get(row.pedidoId)!.push({ nome: row.nome, quantidade: row.quantidade });
      }

      return {
        entregas: entregas.map((p) => ({ ...p, composicaoItens: itensMap.get(p.id) ?? [], composicaoKits: kitsMap.get(p.id) ?? [] })),
        coletas: coletas.map((p) => ({ ...p, composicaoItens: itensMap.get(p.id) ?? [], composicaoKits: kitsMap.get(p.id) ?? [] })),
      };
    }),

  /**
   * Posterga a coleta de uma lista de pedidos para o dia seguinte.
   * Incrementa coletaAdiadaPara em 1 dia (base = coletaAdiadaPara atual ?? data + 1 dia).
   */
  postergarColeta: protectedProcedure
    .input(z.object({ pedidoIds: z.array(z.number().int().positive()).min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar os pedidos para calcular a nova data
      const pedidosParaPostergar = await db
        .select({ id: pedidos.id, data: pedidos.data, coletaAdiadaPara: pedidos.coletaAdiadaPara })
        .from(pedidos)
        .where(inArray(pedidos.id, input.pedidoIds));

      // Para cada pedido, calcular nova data: (coletaAdiadaPara ?? data + 1) + 1 dia
      for (const pedido of pedidosParaPostergar) {
        const baseColeta = pedido.coletaAdiadaPara
          ? new Date(pedido.coletaAdiadaPara)
          : addDays(new Date(pedido.data), 1);
        const novaData = addDays(baseColeta, 1);
        await db
          .update(pedidos)
          .set({ coletaAdiadaPara: novaData })
          .where(eq(pedidos.id, pedido.id));
      }

      return { updated: pedidosParaPostergar.length };
    }),
});
