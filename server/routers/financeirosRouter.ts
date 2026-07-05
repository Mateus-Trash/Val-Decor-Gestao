import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { transacoesFinanceiras } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const financeirosRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(transacoesFinanceiras)
      .orderBy(desc(transacoesFinanceiras.data));
  }),

  listByPeriodo: protectedProcedure
    .input(
      z.object({
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { transacoes: [], totalReceitas: 0, totalDespesas: 0, totalTaxas: 0, saldo: 0 };

      // Buscar transações no período
      const transacoes = await db
        .select()
        .from(transacoesFinanceiras)
        .where(
          and(
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, input.dataFim)
          )
        )
        .orderBy(desc(transacoesFinanceiras.data));

      // Calcular totais por tipo no banco com SUM agrupado
      const totais = await db
        .select({
          tipo: transacoesFinanceiras.tipo,
          total: sql<number>`COALESCE(SUM(${transacoesFinanceiras.valor}), 0)`,
        })
        .from(transacoesFinanceiras)
        .where(
          and(
            gte(transacoesFinanceiras.data, input.dataInicio),
            lte(transacoesFinanceiras.data, input.dataFim)
          )
        )
        .groupBy(transacoesFinanceiras.tipo);

      let totalReceitas = 0;
      let totalDespesas = 0;
      let totalTaxas = 0;

      for (const row of totais) {
        const val = Number(row.total);
        if (row.tipo === "receita") totalReceitas = val;
        else if (row.tipo === "despesa") totalDespesas = val;
        else if (row.tipo === "taxa_entrega") totalTaxas = val;
      }

      const saldo = totalReceitas + totalTaxas - totalDespesas;

      return { transacoes, totalReceitas, totalDespesas, totalTaxas, saldo };
    }),

  create: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["receita", "despesa", "taxa_entrega"]),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        valor: z.number().int().positive("Valor deve ser positivo"),
        pedidoId: z.number().int().positive().optional(),
        data: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.insert(transacoesFinanceiras).values({
        tipo: input.tipo,
        descricao: input.descricao,
        valor: input.valor,
        pedidoId: input.pedidoId,
        data: input.data ?? new Date(),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        descricao: z.string().min(1).optional(),
        valor: z.number().int().positive().optional(),
        data: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...campos } = input;
      return db
        .update(transacoesFinanceiras)
        .set(campos)
        .where(eq(transacoesFinanceiras.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se a transação tem pedidoId (vinculada a pedido)
      const transacao = await db
        .select({ id: transacoesFinanceiras.id, pedidoId: transacoesFinanceiras.pedidoId })
        .from(transacoesFinanceiras)
        .where(eq(transacoesFinanceiras.id, input.id))
        .limit(1);

      if (transacao.length === 0) throw new Error("Transação não encontrada");

      if (transacao[0].pedidoId !== null) {
        throw new Error(
          "Esta transação é vinculada a um pedido e não pode ser excluída manualmente"
        );
      }

      return db
        .delete(transacoesFinanceiras)
        .where(
          and(
            eq(transacoesFinanceiras.id, input.id),
            isNull(transacoesFinanceiras.pedidoId)
          )
        );
    }),
});
