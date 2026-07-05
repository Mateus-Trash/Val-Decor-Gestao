import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { itens } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const itensRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(itens).orderBy(desc(itens.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        valorAluguel: z.number().int().positive("Valor de aluguel deve ser positivo"),
        custoAquisicao: z.number().int().optional(),
        quantidadeTotal: z.number().int().positive("Quantidade total deve ser positiva"),
        quantidadeDisponivel: z.number().int().nonnegative(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.quantidadeDisponivel > input.quantidadeTotal) {
        throw new Error("Quantidade disponível não pode ser maior que quantidade total");
      }
      const result = await db.insert(itens).values(input);
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        valorAluguel: z.number().int().positive().optional(),
        custoAquisicao: z.number().int().optional(),
        quantidadeTotal: z.number().int().positive().optional(),
        quantidadeDisponivel: z.number().int().nonnegative().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;

      // Validar se quantidadeDisponivel não excede quantidadeTotal
      if (updates.quantidadeDisponivel !== undefined || updates.quantidadeTotal !== undefined) {
        const item = await db
          .select()
          .from(itens)
          .where(eq(itens.id, id))
          .limit(1);
        if (item.length > 0) {
          const qtTotal = updates.quantidadeTotal ?? item[0].quantidadeTotal;
          const qtDisp = updates.quantidadeDisponivel ?? item[0].quantidadeDisponivel;
          if (qtDisp > qtTotal) {
            throw new Error("Quantidade disponível não pode ser maior que quantidade total");
          }
        }
      }

      const result = await db
        .update(itens)
        .set(updates)
        .where(eq(itens.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.delete(itens).where(eq(itens.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(itens)
        .where(eq(itens.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),
});
