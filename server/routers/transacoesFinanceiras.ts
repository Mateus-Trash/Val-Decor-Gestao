import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { transacoesFinanceiras, pedidos } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const tipoEnum = z.enum(["receita", "despesa", "taxa_entrega"]);

export const transacoesFinanceirasRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(transacoesFinanceiras).orderBy(desc(transacoesFinanceiras.data));
  }),

  create: protectedProcedure
    .input(
      z.object({
        pedidoId: z.number().int().positive().optional(),
        tipo: tipoEnum,
        descricao: z.string().optional(),
        valor: z.number().int().positive("Valor deve ser positivo"),
        data: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar se pedido existe (se fornecido)
      if (input.pedidoId) {
        const pedido = await db
          .select()
          .from(pedidos)
          .where(eq(pedidos.id, input.pedidoId))
          .limit(1);
        if (pedido.length === 0) {
          throw new Error("Pedido não encontrado");
        }
      }

      const result = await db.insert(transacoesFinanceiras).values({
        ...input,
        data: input.data ?? new Date(),
      });
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(transacoesFinanceiras)
        .where(eq(transacoesFinanceiras.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  listByPedido: protectedProcedure
    .input(z.object({ pedidoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(transacoesFinanceiras)
        .where(eq(transacoesFinanceiras.pedidoId, input.pedidoId))
        .orderBy(desc(transacoesFinanceiras.data));
    }),

  listByTipo: protectedProcedure
    .input(z.object({ tipo: tipoEnum }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(transacoesFinanceiras)
        .where(eq(transacoesFinanceiras.tipo, input.tipo))
        .orderBy(desc(transacoesFinanceiras.data));
    }),
});
