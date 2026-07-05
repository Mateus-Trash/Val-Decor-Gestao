import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { kits, kitItens, itens } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const kitsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(kits).orderBy(desc(kits.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        valorAluguel: z.number().int().positive("Valor de aluguel deve ser positivo"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(kits).values(input);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        valorAluguel: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      const result = await db
        .update(kits)
        .set(updates)
        .where(eq(kits.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.delete(kits).where(eq(kits.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(kits)
        .where(eq(kits.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        kitId: z.number().int().positive(),
        itemId: z.number().int().positive(),
        quantidade: z.number().int().positive("Quantidade deve ser positiva"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se o item existe
      const item = await db
        .select()
        .from(itens)
        .where(eq(itens.id, input.itemId))
        .limit(1);
      if (item.length === 0) {
        throw new Error("Item não encontrado");
      }

      const result = await db.insert(kitItens).values(input);
      return result;
    }),

  removeItem: protectedProcedure
    .input(
      z.object({
        kitId: z.number().int().positive(),
        itemId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .delete(kitItens)
        .where(and(eq(kitItens.kitId, input.kitId), eq(kitItens.itemId, input.itemId)));
      return result;
    }),
});
