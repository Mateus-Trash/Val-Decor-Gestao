import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { comissoes, colaboradores, pedidos } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const comissoesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(comissoes).orderBy(desc(comissoes.dataCalculo));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(comissoes)
        .where(eq(comissoes.id, input.id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  listByColaborador: protectedProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(comissoes)
        .where(eq(comissoes.colaboradorId, input.colaboradorId))
        .orderBy(desc(comissoes.dataCalculo));
    }),

  listByPedido: protectedProcedure
    .input(z.object({ pedidoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(comissoes)
        .where(eq(comissoes.pedidoId, input.pedidoId))
        .orderBy(desc(comissoes.dataCalculo));
    }),

  calculate: protectedProcedure
    .input(
      z.object({
        colaboradorId: z.number().int().positive(),
        pedidoId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validar se colaborador existe
      const colab = await db
        .select()
        .from(colaboradores)
        .where(eq(colaboradores.id, input.colaboradorId))
        .limit(1);
      if (colab.length === 0) {
        throw new Error("Colaborador não encontrado");
      }

      // Validar se pedido existe
      const pedido = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, input.pedidoId))
        .limit(1);
      if (pedido.length === 0) {
        throw new Error("Pedido não encontrado");
      }

      // Verificar se comissão já existe para este pedido e colaborador
      const existente = await db
        .select()
        .from(comissoes)
        .where(
          and(
            eq(comissoes.pedidoId, input.pedidoId),
            eq(comissoes.colaboradorId, input.colaboradorId)
          )
        )
        .limit(1);

      if (existente.length > 0) {
        throw new Error("Comissão já foi calculada para este pedido");
      }

      // Calcular comissão: valorTotal * percentualComissao / 100
      const valorComissao = Math.floor(
        (pedido[0].valorTotal * colab[0].percentualComissao) / 100
      );

      const result = await db.insert(comissoes).values({
        colaboradorId: input.colaboradorId,
        pedidoId: input.pedidoId,
        valor: valorComissao,
      });

      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.delete(comissoes).where(eq(comissoes.id, input.id));
      return result;
    }),
});
