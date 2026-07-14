import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { entregasColetas, pedidos, colaboradores } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const entregasRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: entregasColetas.id,
        pedidoId: entregasColetas.pedidoId,
        colaboradorId: entregasColetas.colaboradorId,
        tipo: entregasColetas.tipo,
        dataAgendada: entregasColetas.dataAgendada,
        dataRealizada: entregasColetas.dataRealizada,
        status: entregasColetas.status,
        observacoes: entregasColetas.observacoes,
        createdAt: entregasColetas.createdAt,
        updatedAt: entregasColetas.updatedAt,
        nomeColaborador: colaboradores.nome,
        nomeCliente: pedidos.nomeCliente,
      })
      .from(entregasColetas)
      .leftJoin(colaboradores, eq(entregasColetas.colaboradorId, colaboradores.id))
      .leftJoin(pedidos, eq(entregasColetas.pedidoId, pedidos.id))
      .orderBy(asc(entregasColetas.dataAgendada));
  }),

  listByPedido: protectedProcedure
    .input(z.object({ pedidoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: entregasColetas.id,
          pedidoId: entregasColetas.pedidoId,
          colaboradorId: entregasColetas.colaboradorId,
          tipo: entregasColetas.tipo,
          dataAgendada: entregasColetas.dataAgendada,
          dataRealizada: entregasColetas.dataRealizada,
          status: entregasColetas.status,
          observacoes: entregasColetas.observacoes,
          createdAt: entregasColetas.createdAt,
          updatedAt: entregasColetas.updatedAt,
          nomeColaborador: colaboradores.nome,
        })
        .from(entregasColetas)
        .leftJoin(colaboradores, eq(entregasColetas.colaboradorId, colaboradores.id))
        .where(eq(entregasColetas.pedidoId, input.pedidoId))
        .orderBy(asc(entregasColetas.dataAgendada));
    }),

  create: protectedProcedure
    .input(
      z.object({
        pedidoId: z.number().int().positive(),
        colaboradorId: z.number().int().positive().optional(),
        tipo: z.enum(["entrega", "coleta"]),
        dataAgendada: z.coerce.date(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return db.insert(entregasColetas).values({
        pedidoId: input.pedidoId,
        colaboradorId: input.colaboradorId,
        tipo: input.tipo,
        dataAgendada: input.dataAgendada,
        status: "agendado",
        observacoes: input.observacoes,
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["agendado", "em_rota", "concluido", "cancelado"]),
        dataRealizada: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dataRealizada =
        input.status === "concluido"
          ? (input.dataRealizada ?? new Date())
          : input.dataRealizada;

      return db
        .update(entregasColetas)
        .set({
          status: input.status,
          ...(dataRealizada !== undefined ? { dataRealizada } : {}),
        })
        .where(eq(entregasColetas.id, input.id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return db
        .delete(entregasColetas)
        .where(eq(entregasColetas.id, input.id));
    }),
});
