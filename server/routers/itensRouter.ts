import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { itens, itensPedido, pedidos } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getReservadoPorItemNaData, getAlertasColetaAtrasada } from "../estoqueUtils";

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
        quantidadeDisponivel: z.number().int().min(0).optional(),
      }).refine(
        (data) => data.quantidadeDisponivel === undefined || data.quantidadeDisponivel <= data.quantidadeTotal,
        { message: "Quantidade disponível não pode ser maior que quantidade total", path: ["quantidadeDisponivel"] }
      )
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
        quantidadeDisponivel: input.quantidadeDisponivel ?? input.quantidadeTotal,
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

      // Verificar se o item está em pedidos ativos (status diferente de Concluido)
      const registros = await db
        .select({ count: sql`COUNT(*)` })
        .from(itensPedido)
        .innerJoin(pedidos, eq(itensPedido.pedidoId, pedidos.id))
        .where(
          and(
            eq(itensPedido.itemId, input.id),
            notInArray(pedidos.status, ["Concluido"])
          )
        );

      const count = Number(registros[0]?.count) || 0;
      if (count > 0) {
        throw new Error("Item está em uso em pedidos ativos");
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

  getDisponibilidadePorData: protectedProcedure
    .input(z.object({ data: z.coerce.date() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const todosItens = await db.select().from(itens);
      const reservado = await getReservadoPorItemNaData(db, input.data);
      return todosItens.map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidadeTotal: item.quantidadeTotal,
        disponivel: item.quantidadeTotal - (reservado.get(item.id) || 0),
      }));
    }),
  getAlertasColeta: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return getAlertasColetaAtrasada(db);
  }),
});
