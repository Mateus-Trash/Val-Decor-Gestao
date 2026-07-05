import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { colaboradores, comissoes } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const colaboradoresRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(colaboradores).orderBy(asc(colaboradores.nome));
  }),

  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido").optional(),
        telefone: z.string().optional(),
        funcao: z.string().optional(),
        percentualComissao: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.insert(colaboradores).values({
        nome: input.nome,
        email: input.email ?? "",
        telefone: input.telefone,
        funcao: input.funcao,
        percentualComissao: input.percentualComissao ?? 10,
      });
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
      return db.update(colaboradores).set(updates).where(sql`${colaboradores.id} = ${id}`);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.delete(colaboradores).where(sql`${colaboradores.id} = ${input.id}`);
    }),

  getResumoComissoes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        colaboradorId: comissoes.colaboradorId,
        totalComissao: sql<number>`SUM(${comissoes.valor})`.as("totalComissao"),
        quantidadePedidos: sql<number>`COUNT(${comissoes.pedidoId})`.as("quantidadePedidos"),
      })
      .from(comissoes)
      .groupBy(comissoes.colaboradorId);
    return rows;
  }),
});
