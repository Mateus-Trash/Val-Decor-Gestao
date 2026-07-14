import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { colaboradores, comissoes, pedidos } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function fetchComissoes(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, colaboradorId?: number) {
  const rows = await db
    .select({
      id: comissoes.id,
      colaboradorId: comissoes.colaboradorId,
      colaboradorNome: colaboradores.nome,
      pedidoId: comissoes.pedidoId,
      pedidoCliente: pedidos.nomeCliente,
      pedidoData: pedidos.data,
      valor: comissoes.valor,
      dataCalculo: comissoes.dataCalculo,
      pago: comissoes.pago,
      dataPagamento: comissoes.dataPagamento,
    })
    .from(comissoes)
    .innerJoin(colaboradores, eq(comissoes.colaboradorId, colaboradores.id))
    .innerJoin(pedidos, eq(comissoes.pedidoId, pedidos.id))
    .where(colaboradorId !== undefined ? eq(comissoes.colaboradorId, colaboradorId) : undefined)
    .orderBy(desc(comissoes.dataCalculo));
  return rows;
}

export const comissoesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return fetchComissoes(db);
  }),

  listByColaborador: protectedProcedure
    .input(z.object({ colaboradorId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return fetchComissoes(db, input.colaboradorId);
    }),

  marcarComoPaga: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(comissoes)
        .set({ pago: true, dataPagamento: new Date() })
        .where(inArray(comissoes.id, input.ids));
      return { updated: input.ids.length };
    }),

  marcarComoPendente: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(comissoes)
        .set({ pago: false, dataPagamento: null })
        .where(inArray(comissoes.id, input.ids));
      return { updated: input.ids.length };
    }),
});
