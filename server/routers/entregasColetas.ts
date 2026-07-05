import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { entregasColetas, pedidos, colaboradores } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const tipoEnum = z.enum(["entrega", "coleta"]);
const statusEnum = z.enum(["agendado", "em_rota", "concluido", "cancelado"]);

export const entregasColetasRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(entregasColetas).orderBy(desc(entregasColetas.dataAgendada));
  }),

  create: protectedProcedure
    .input(
      z.object({
        pedidoId: z.number().int().positive(),
        colaboradorId: z.number().int().positive().optional(),
        tipo: tipoEnum,
        dataAgendada: z.date(),
        dataRealizada: z.date().optional(),
        status: statusEnum.optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar se pedido existe
      const pedido = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, input.pedidoId))
        .limit(1);
      if (pedido.length === 0) {
        throw new Error("Pedido não encontrado");
      }

      // Validar se colaborador existe (se fornecido)
      if (input.colaboradorId) {
        const colab = await db
          .select()
          .from(colaboradores)
          .where(eq(colaboradores.id, input.colaboradorId))
          .limit(1);
        if (colab.length === 0) {
          throw new Error("Colaborador não encontrado");
        }
      }

      const result = await db.insert(entregasColetas).values({
        ...input,
        status: input.status ?? "agendado",
      });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        pedidoId: z.number().int().positive().optional(),
        colaboradorId: z.number().int().positive().optional(),
        tipo: tipoEnum.optional(),
        dataAgendada: z.date().optional(),
        dataRealizada: z.date().optional(),
        status: statusEnum.optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;

      // Validar pedido se fornecido
      if (updates.pedidoId) {
        const pedido = await db
          .select()
          .from(pedidos)
          .where(eq(pedidos.id, updates.pedidoId))
          .limit(1);
        if (pedido.length === 0) {
          throw new Error("Pedido não encontrado");
        }
      }

      // Validar colaborador se fornecido
      if (updates.colaboradorId) {
        const colab = await db
          .select()
          .from(colaboradores)
          .where(eq(colaboradores.id, updates.colaboradorId))
          .limit(1);
        if (colab.length === 0) {
          throw new Error("Colaborador não encontrado");
        }
      }

      const result = await db
        .update(entregasColetas)
        .set(updates)
        .where(eq(entregasColetas.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .delete(entregasColetas)
        .where(eq(entregasColetas.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(entregasColetas)
        .where(eq(entregasColetas.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusEnum,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .update(entregasColetas)
        .set({ status: input.status })
        .where(eq(entregasColetas.id, input.id));
      return result;
    }),

  listByPedido: protectedProcedure
    .input(z.object({ pedidoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(entregasColetas)
        .where(eq(entregasColetas.pedidoId, input.pedidoId))
        .orderBy(desc(entregasColetas.dataAgendada));
    }),

  listByColaborador: protectedProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(entregasColetas)
        .where(eq(entregasColetas.colaboradorId, input.colaboradorId))
        .orderBy(desc(entregasColetas.dataAgendada));
    }),

  listByStatus: protectedProcedure
    .input(z.object({ status: statusEnum }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(entregasColetas)
        .where(eq(entregasColetas.status, input.status))
        .orderBy(desc(entregasColetas.dataAgendada));
    }),
});
