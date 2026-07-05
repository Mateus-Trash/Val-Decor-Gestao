import { and, count, desc, eq, gte, isNotNull, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { pedidos, colaboradores, transacoesFinanceiras, itensPedido, itens } from "../../drizzle/schema";
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
          dataEvento: pedidos.dataEvento,
          nomeCliente: pedidos.nomeCliente,
          nomeColaborador: colaboradores.nome,
          valorTotal: pedidos.valorTotal,
        })
        .from(pedidos)
        .innerJoin(colaboradores, eq(pedidos.colaboradorId, colaboradores.id))
        .where(
          and(
            gte(pedidos.dataEvento, dataInicio),
            lte(pedidos.dataEvento, dataFim),
            isNotNull(pedidos.dataEvento)
          )
        );

      return result;
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
        taxasEntrega: 0,
        totalDespesas: 0,
        saldo: 0,
        pedidosPorStatus: [] as { status: string; count: number }[],
        top5Itens: [] as { nome: string; totalQuantidade: number }[],
      };

      // Faturamento, taxas e despesas no período
      const financeiro = await db
        .select({
          tipo: transacoesFinanceiras.tipo,
          total: sum(transacoesFinanceiras.valor),
        })
        .from(transacoesFinanceiras)
        .where(
          and(
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, input.dataFim)
          )
        )
        .groupBy(transacoesFinanceiras.tipo);

      const faturamentoTotal = Number(financeiro.find(f => f.tipo === "receita")?.total ?? 0);
      const taxasEntrega = Number(financeiro.find(f => f.tipo === "taxa_entrega")?.total ?? 0);
      const totalDespesas = Number(financeiro.find(f => f.tipo === "despesa")?.total ?? 0);
      const saldo = faturamentoTotal + taxasEntrega - totalDespesas;

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

      // Top 5 itens mais alugados
      const top5 = await db
        .select({
          nome: itens.nome,
          totalQuantidade: sum(itensPedido.quantidade),
        })
        .from(itensPedido)
        .innerJoin(itens, eq(itensPedido.itemId, itens.id))
        .innerJoin(pedidos, eq(itensPedido.pedidoId, pedidos.id))
        .where(
          and(
            gte(pedidos.createdAt, input.dataInicio),
            lte(pedidos.createdAt, input.dataFim)
          )
        )
        .groupBy(itens.id, itens.nome)
        .orderBy(desc(sum(itensPedido.quantidade)))
        .limit(5);

      return {
        faturamentoTotal,
        taxasEntrega,
        totalDespesas,
        saldo,
        pedidosPorStatus: pedidosStatus.map(p => ({ status: p.status, count: Number(p.count) })),
        top5Itens: top5.map(t => ({ nome: t.nome, totalQuantidade: Number(t.totalQuantidade ?? 0) })),
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
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(transacoesFinanceiras.data, inicioAtual),
            lte(transacoesFinanceiras.data, fimAtual)
          )
        );

      const [receitaAnterior] = await db
        .select({ total: sum(transacoesFinanceiras.valor) })
        .from(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.tipo, "receita"),
            gte(transacoesFinanceiras.data, inicioAnterior),
            lte(transacoesFinanceiras.data, fimAnterior)
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

      // Buscar transações do mês
      const transacoes = await db
        .select({
          tipo: transacoesFinanceiras.tipo,
          valor: transacoesFinanceiras.valor,
          data: transacoesFinanceiras.data,
        })
        .from(transacoesFinanceiras)
        .where(
          and(
            gte(transacoesFinanceiras.data, dataInicio),
            lte(transacoesFinanceiras.data, dataFim)
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

      for (const t of transacoes) {
        const dia = new Date(t.data).getDate();
        const semanaIdx = Math.min(Math.ceil(dia / 7), 5) - 1;
        if (t.tipo === "receita" || t.tipo === "taxa_entrega") {
          semanas[semanaIdx].receitas += t.valor;
        } else if (t.tipo === "despesa") {
          semanas[semanaIdx].despesas += t.valor;
        }
      }

      return semanas;
    }),
});
