import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { itens, itensPedido } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const itensRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(itens).orderBy(asc(itens.nome));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        valorAluguel: z.number().int().positive("Valor de aluguel deve ser positivo"),
        custoAquisicao: z.number().int().optional(),
        quantidadeTotal: z.number().int().positive("Quantidade total deve ser positiva"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.insert(itens).values({
        nome: input.nome,
        descricao: input.descricao,
        valorAluguel: input.valorAluguel,
        custoAquisicao: input.custoAquisicao,
        quantidadeTotal: input.quantidadeTotal,
        quantidadeDisponivel: input.quantidadeTotal,
      });
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
        quantidadeDisponivel: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      return db.update(itens).set(updates).where(eq(itens.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se o item tem registros em itensPedido
      const registros = await db
        .select({ count: sql<number>`COUNT(*)`.as("count") })
        .from(itensPedido)
        .where(eq(itensPedido.itemId, input.id));

      const count = Number(registros[0]?.count) || 0;
      if (count > 0) {
        throw new Error("Item possui pedidos vinculados e não pode ser excluído");
      }

      return db.delete(itens).where(eq(itens.id, input.id));
    }),

  ajustarEstoque: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        quantidade: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar item atual
      const item = await db.select().from(itens).where(eq(itens.id, input.id)).limit(1);
      if (item.length === 0) {
        throw new Error("Item não encontrado");
      }

      const novaQuantidade = item[0].quantidadeDisponivel + input.quantidade;
      if (novaQuantidade < 0) {
        throw new Error("Estoque insuficiente");
      }

      return db
        .update(itens)
        .set({ quantidadeDisponivel: novaQuantidade })
        .where(eq(itens.id, input.id));
    }),
});
