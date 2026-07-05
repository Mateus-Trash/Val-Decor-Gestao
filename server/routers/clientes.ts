import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { clientes } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const clientesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(clientes).orderBy(desc(clientes.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        contato: z.string().optional(),
        email: z.string().email().optional(),
        observacoesInternas: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(clientes).values(input);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).optional(),
        contato: z.string().optional(),
        email: z.string().email().optional(),
        observacoesInternas: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      const result = await db
        .update(clientes)
        .set(updates)
        .where(eq(clientes.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.delete(clientes).where(eq(clientes.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(clientes)
        .where(eq(clientes.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),
});
