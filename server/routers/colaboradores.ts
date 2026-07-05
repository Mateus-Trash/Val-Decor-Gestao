import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { colaboradores } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const colaboradoresRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(colaboradores).orderBy(desc(colaboradores.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        telefone: z.string().optional(),
        funcao: z.string().optional(),
        percentualComissao: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(colaboradores).values({
        ...input,
        percentualComissao: input.percentualComissao ?? 10,
      });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        funcao: z.string().optional(),
        percentualComissao: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      const result = await db
        .update(colaboradores)
        .set(updates)
        .where(eq(colaboradores.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .delete(colaboradores)
        .where(eq(colaboradores.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(colaboradores)
        .where(eq(colaboradores.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),
});
