import { and, desc, eq, like, sql } from "drizzle-orm";
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
        dataEvento: pedidos.dataEvento,
        dataEntrega: pedidos.dataEntrega,
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

    return result;
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
          dataEvento: pedidos.dataEvento,
          dataEntrega: pedidos.dataEntrega,
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
        dataEvento: z.coerce.date(),
        dataEntrega: z.coerce.date(),
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
      const reservadoNaData = await getReservadoPorItemNaData(db, input.dataEntrega);
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
        dataEvento: input.dataEvento,
        dataEntrega: input.dataEntrega,
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
        dataEvento: z.coerce.date().optional(),
        dataEntrega: z.coerce.date().optional(),
        ruaEntrega: z.string().optional(),
        bairroEntrega: z.string().optional(),
        numeroEntrega: z.string().optional(),
        observacoes: z.string().optional(),
        valorTaxaEntrega: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...campos } = input;
      return db.update(pedidos).set(campos).where(eq(pedidos.id, id));
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
});
