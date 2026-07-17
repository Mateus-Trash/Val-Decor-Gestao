import { and, count, desc, eq, gte, isNotNull, lte, sql, sum, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { pedidos, colaboradores, transacoesFinanceiras, itensPedido, itens, kitsPedido, kits, comissoes } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const dashboardRouter = router({
  getPedidosCalendario: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0, 23, 59, 59);

      const result = await db
        .select({
          id: pedidos.id,
          status: pedidos.status,
          data: pedidos.data,
          nomeCliente: pedidos.nomeCliente,
          nomeColaborador: colaboradores.nome,
          bairroEntrega: pedidos.bairroEntrega,
          valorTotal: pedidos.valorTotal,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            gte(pedidos.data, dataInicio),
            lte(pedidos.data, dataFim),
            isNotNull(pedidos.data)
          )
        );

      const pedidoIds = result.map((p) => p.id);
      if (pedidoIds.length === 0) return [];

      const itensCompRows = await db
        .select({
          pedidoId: itensPedido.pedidoId,
          nome: itens.nome,
          quantidade: itensPedido.quantidade,
        })
        .from(itensPedido)
        .innerJoin(itens, eq(itensPedido.itemId, itens.id))
        .where(inArray(itensPedido.pedidoId, pedidoIds));

      const kitsCompRows = await db
        .select({
          pedidoId: kitsPedido.pedidoId,
          nome: kits.nome,
          quantidade: kitsPedido.quantidade,
        })
        .from(kitsPedido)
        .innerJoin(kits, eq(kitsPedido.kitId, kits.id))
        .where(inArray(kitsPedido.pedidoId, pedidoIds));

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

  getKPIs: protectedProcedure
    .input(
      z.object({
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        faturamentoTotal: 0,
        faturamentoAteHoje: 0,
        taxasEntrega: 0,
        totalDespesas: 0,
        totalDespesasNormais: 0,
        totalDespesasNormaisAteHoje: 0,
        totalComissoes: 0,
        totalComissoesAteHoje: 0,
        comissoesEstimadas: 0,
        saldo: 0,
        totalPedidosNoPeriodo: 0,
        taxaConclusao: 0,
        ticketMedio: 0,
        pedidosPorStatus: [] as { status: string; count: number }[],
        top5Itens: [] as { nome: string; totalQuantidade: number }[],
      };

      // Despesas normais (gasolina, oficina, etc.): NÃO têm pedidoId, continuam
      // filtradas pela data de criação da transação.
      const [despesasNormaisRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            sql`NOT (${transacoesFinanceiras.descricao} LIKE 'Comissão%')`,
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, input.dataFim)
          )
        );
      const totalDespesasNormais = Number(despesasNormaisRow?.total ?? 0);

      // Comissões: têm pedidoId, filtradas pela DATA DO ALUGUEL (pedidos.data) via
      // join — mesmo critério do faturamento, para bater com o mês do aluguel.
      const [comissoesRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            like(transacoesFinanceiras.descricao, "Comissão%"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        );
      const totalComissoes = Number(comissoesRow?.total ?? 0);

      // Comissões estimadas/futuras: pedidos NÃO concluídos no período
      const pedidosPendentesPeriodo = await db
        .select({
          valorTotal: pedidos.valorTotal,
          percentual: colaboradores.percentualComissao,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim),
            sql`${pedidos.status} != 'Concluido'`
          )
        );

      const comissoesEstimadas = pedidosPendentesPeriodo.reduce(
        (acc, p) => acc + Math.round(Number(p.valorTotal) * Number(p.percentual) / 100),
        0
      );

      const totalDespesas = totalDespesasNormais + totalComissoes;

      // Faturamento (receita) e taxas de entrega no período: baseado na DATA DO ALUGUEL
      // (pedidos.data), via join com a tabela pedidos — não mais na data de criação da
      // transação. Evita contar, no mês errado, um pedido criado no fim de um mês com
      // aluguel marcado pro mês seguinte.
      const receitaETaxasPeriodo = await db
        .select({
          tipo: transacoesFinanceiras.tipo,
          total: sum(transacoesFinanceiras.valor),
        })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            inArray(transacoesFinanceiras.tipo, ["receita", "taxa_entrega"]),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        )
        .groupBy(transacoesFinanceiras.tipo);

      const faturamentoTotal = Number(receitaETaxasPeriodo.find(f => f.tipo === "receita")?.total ?? 0);
      const taxasEntrega = Number(receitaETaxasPeriodo.find(f => f.tipo === "taxa_entrega")?.total ?? 0);
      const saldo = faturamentoTotal + taxasEntrega - totalDespesas;

      // Faturamento até hoje: mesma base do faturamentoTotal, mas limitando o fim do
      // período ao menor valor entre o fim selecionado e a data de hoje — exclui
      // aluguéis com data futura dentro do período (ainda não aconteceram).
      const hoje = new Date();
      const cutoffAteHoje = input.dataFim < hoje ? input.dataFim : hoje;

      const [receitaAteHojeRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, cutoffAteHoje)
          )
        );
      const faturamentoAteHoje = Number(receitaAteHojeRow?.total ?? 0);

      // Despesas normais até hoje: mesma query mas limitando ao cutoffAteHoje
      const [despesasNormaisAteHojeRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            sql`NOT (${transacoesFinanceiras.descricao} LIKE 'Comissão%')`,
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, cutoffAteHoje)
          )
        );
      const totalDespesasNormaisAteHoje = Number(despesasNormaisAteHojeRow?.total ?? 0);

      // Comissões até hoje: filtradas pela data do aluguel até cutoffAteHoje
      const [comissoesAteHojeRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            like(transacoesFinanceiras.descricao, "Comissão%"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, cutoffAteHoje)
          )
        );
      const totalComissoesAteHoje = Number(comissoesAteHojeRow?.total ?? 0);

      // Pedidos por status no período
      const pedidosStatus = await db
        .select({
          status: pedidos.status,
          count: count(),
        })
        .from(pedidos)
        .where(
          and(
            gte(pedidos.createdAt, input.dataInicio),
            lte(pedidos.createdAt, input.dataFim)
          )
        )
        .groupBy(pedidos.status);

      const totalPedidosNoPeriodo = pedidosStatus.reduce((acc, p) => acc + Number(p.count), 0);
      const pedidosConcluidos = Number(pedidosStatus.find((p) => p.status === "Concluido")?.count ?? 0);
      const taxaConclusao = totalPedidosNoPeriodo > 0 ? (pedidosConcluidos / totalPedidosNoPeriodo) * 100 : 0;
      const ticketMedio = totalPedidosNoPeriodo > 0 ? Math.round(faturamentoTotal / totalPedidosNoPeriodo) : 0;

      // Top 5 itens mais alugados (itens diretos + kits, ranqueados juntos)
      const topItensDiretos = await db
        .select({
          nome: itens.nome,
          valorUnitario: itensPedido.valorUnitario,
          valorPadrao: itens.valorAluguel,
          totalQuantidade: sum(itensPedido.quantidade),
        })
        .from(itensPedido)
        .innerJoin(itens, eq(itensPedido.itemId, itens.id))
        .innerJoin(pedidos, eq(itensPedido.pedidoId, pedidos.id))
        .where(and(gte(pedidos.createdAt, input.dataInicio), lte(pedidos.createdAt, input.dataFim)))
        .groupBy(itens.id, itens.nome, itensPedido.valorUnitario, itens.valorAluguel);

      const topKits = await db
        .select({
          nome: kits.nome,
          valorUnitario: kitsPedido.valorUnitario,
          valorPadrao: kits.valorAluguel,
          totalQuantidade: sum(kitsPedido.quantidade),
        })
        .from(kitsPedido)
        .innerJoin(kits, eq(kitsPedido.kitId, kits.id))
        .innerJoin(pedidos, eq(kitsPedido.pedidoId, pedidos.id))
        .where(and(gte(pedidos.createdAt, input.dataInicio), lte(pedidos.createdAt, input.dataFim)))
        .groupBy(kits.id, kits.nome, kitsPedido.valorUnitario, kits.valorAluguel);

      const formatarNomeComPreco = (nome: string, valorUnitario: number, valorPadrao: number) =>
        valorUnitario !== valorPadrao
          ? `${nome} (R$ ${(valorUnitario / 100).toFixed(2).replace(".", ",")})`
          : nome;

      const top5 = [...topItensDiretos, ...topKits]
        .map((t) => ({
          nome: formatarNomeComPreco(t.nome, Number(t.valorUnitario), Number(t.valorPadrao)),
          totalQuantidade: Number(t.totalQuantidade ?? 0),
        }))
        .sort((a, b) => b.totalQuantidade - a.totalQuantidade)
        .slice(0, 5);

      return {
        faturamentoTotal,
        faturamentoAteHoje,
        taxasEntrega,
        totalDespesas,
        totalDespesasNormais,
        totalDespesasNormaisAteHoje,
        totalComissoes,
        totalComissoesAteHoje,
        comissoesEstimadas,
        saldo,
        totalPedidosNoPeriodo,
        taxaConclusao,
        ticketMedio,
        pedidosPorStatus: pedidosStatus.map(p => ({ status: p.status, count: Number(p.count) })),
        top5Itens: top5,
      };
    }),

  getComparativoMensal: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { mesAtual: 0, mesAnterior: 0, percentualVariacao: 0 };

      // Mês atual
      const inicioAtual = new Date(input.ano, input.mes - 1, 1);
      const fimAtual = new Date(input.ano, input.mes, 0, 23, 59, 59);

      // Mês anterior
      const mesAnt = input.mes === 1 ? 12 : input.mes - 1;
      const anoAnt = input.mes === 1 ? input.ano - 1 : input.ano;
      const inicioAnterior = new Date(anoAnt, mesAnt - 1, 1);
      const fimAnterior = new Date(anoAnt, mesAnt, 0, 23, 59, 59);

      const [receitaAtual] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(pedidos.data, inicioAtual),
            lte(pedidos.data, fimAtual)
          )
        );

      const [receitaAnterior] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(pedidos.data, inicioAnterior),
            lte(pedidos.data, fimAnterior)
          )
        );

      const mesAtual = Number(receitaAtual?.total ?? 0);
      const mesAnterior = Number(receitaAnterior?.total ?? 0);
      const percentualVariacao = mesAnterior === 0 ? 0 : ((mesAtual - mesAnterior) / mesAnterior) * 100;

      return { mesAtual, mesAnterior, percentualVariacao };
    }),

  getFluxoCaixaMensal: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as { semana: number; receitas: number; despesas: number }[];

      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0, 23, 59, 59);

      // Despesas: mantém agrupado pela data de criação da transação
      const despesasSemana = await db
        .select({
          valor: transacoesFinanceiras.valor,
          data: transacoesFinanceiras.data,
        })
        .from(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            gte(transacoesFinanceiras.data, dataInicio),
            lte(transacoesFinanceiras.data, dataFim)
          )
        );

      // Receitas e taxas de entrega: agrupadas pela DATA DO ALUGUEL (pedidos.data),
      // via join com pedidos — não mais pela data de criação da transação.
      const receitasSemana = await db
        .select({
          valor: transacoesFinanceiras.valor,
          data: pedidos.data,
        })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            inArray(transacoesFinanceiras.tipo, ["receita", "taxa_entrega"]),
            gte(pedidos.data, dataInicio),
            lte(pedidos.data, dataFim)
          )
        );

      // Agrupar por semana
      const semanas: { semana: number; receitas: number; despesas: number }[] = [
        { semana: 1, receitas: 0, despesas: 0 },
        { semana: 2, receitas: 0, despesas: 0 },
        { semana: 3, receitas: 0, despesas: 0 },
        { semana: 4, receitas: 0, despesas: 0 },
        { semana: 5, receitas: 0, despesas: 0 },
      ];

      for (const t of receitasSemana) {
        const dia = new Date(t.data).getDate();
        const semanaIdx = Math.min(Math.ceil(dia / 7), 5) - 1;
        semanas[semanaIdx].receitas += t.valor;
      }
      for (const t of despesasSemana) {
        const dia = new Date(t.data).getDate();
        const semanaIdx = Math.min(Math.ceil(dia / 7), 5) - 1;
        semanas[semanaIdx].despesas += t.valor;
      }

      return semanas;
    }),

  getResumoPeriodo: protectedProcedure
    .input(
      z.object({
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        faturamento: 0,
        despesasNormais: 0,
        comissoes: 0,
        comissoesEstimadas: 0,
        taxasEntrega: 0,
        saldo: 0,
        totalPedidos: 0,
        pedidosConcluidos: 0,
        pedidosPendentes: 0,
      };

      // Faturamento (receita) no período baseado na data do aluguel
      const [receitaRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        );
      const faturamento = Number(receitaRow?.total ?? 0);

      // Taxas de entrega no período
      const [taxasRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "taxa_entrega"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        );
      const taxasEntrega = Number(taxasRow?.total ?? 0);

      // Despesas normais (manuais, sem pedidoId) no período
      const [despesasNormaisRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            sql`NOT (${transacoesFinanceiras.descricao} LIKE 'Comissão%')`,
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, input.dataFim)
          )
        );
      const despesasNormais = Number(despesasNormaisRow?.total ?? 0);

      // Comissões realizadas (pedidos concluídos) no período
      const [comissoesRow] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .innerJoin(pedidos, eq(transacoesFinanceiras.pedidoId, pedidos.id))
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "despesa"),
            like(transacoesFinanceiras.descricao, "Comissão%"),
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        );
      const comissoes = Number(comissoesRow?.total ?? 0);

      // Comissões estimadas/futuras: pedidos NÃO concluídos no período
      // Calcular: valorTotal * percentualComissao / 100
      const pedidosPendentesPeriodo = await db
        .select({
          valorTotal: pedidos.valorTotal,
          percentual: colaboradores.percentualComissao,
          status: pedidos.status,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim),
            sql`${pedidos.status} != 'Concluido'`
          )
        );

      const comissoesEstimadas = pedidosPendentesPeriodo.reduce(
        (acc, p) => acc + Math.round(Number(p.valorTotal) * Number(p.percentual) / 100),
        0
      );

      // Contagem de pedidos
      const totalPedidosRow = await db
        .select({
          status: pedidos.status,
          count: count(),
        })
        .from(pedidos)
        .where(
          and(
            gte(pedidos.data, input.dataInicio),
            lte(pedidos.data, input.dataFim)
          )
        )
        .groupBy(pedidos.status);

      const totalPedidos = totalPedidosRow.reduce((acc, p) => acc + Number(p.count), 0);
      const pedidosConcluidos = Number(totalPedidosRow.find((p) => p.status === "Concluido")?.count ?? 0);
      const pedidosPendentes = totalPedidos - pedidosConcluidos;

      const saldo = faturamento + taxasEntrega - despesasNormais - comissoes;

      return {
        faturamento,
        despesasNormais,
        comissoes,
        comissoesEstimadas,
        taxasEntrega,
        saldo,
        totalPedidos,
        pedidosConcluidos,
        pedidosPendentes,
      };
    }),

  getRankingColaboradores: protectedProcedure
    .input(z.object({ dataInicio: z.coerce.date(), dataFim: z.coerce.date() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const vendas = await db
        .select({
          colaboradorId: pedidos.colaboradorId,
          nome: colaboradores.nome,
          totalVendas: sum(pedidos.valorTotal),
          totalPedidos: count(),
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(and(gte(pedidos.createdAt, input.dataInicio), lte(pedidos.createdAt, input.dataFim)))
        .groupBy(pedidos.colaboradorId, colaboradores.nome);

      const comissoesPorColab = await db
        .select({
          colaboradorId: comissoes.colaboradorId,
          totalComissao: sum(comissoes.valor),
        })
        .from(comissoes)
        .innerJoin(pedidos, eq(comissoes.pedidoId, pedidos.id))
        .where(and(gte(pedidos.createdAt, input.dataInicio), lte(pedidos.createdAt, input.dataFim)))
        .groupBy(comissoes.colaboradorId);

      const comissaoMap = new Map(comissoesPorColab.map((c) => [c.colaboradorId, Number(c.totalComissao ?? 0)]));

      return vendas
        .map((v) => ({
          colaboradorId: v.colaboradorId,
          nome: v.nome,
          totalVendas: Number(v.totalVendas ?? 0),
          totalPedidos: Number(v.totalPedidos),
          totalComissao: comissaoMap.get(v.colaboradorId) ?? 0,
        }))
        .sort((a, b) => b.totalVendas - a.totalVendas)
        .slice(0, 5);
    }),
});
