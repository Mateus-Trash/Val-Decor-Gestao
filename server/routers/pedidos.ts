import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { pedidos, clientes, colaboradores } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const statusEnum = z.enum(["Pendente", "Confirmado", "Em Preparacao", "Entregue", "Concluido"]);

export const pedidosRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(pedidos).orderBy(desc(pedidos.createdAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        clienteId: z.number().int().positive().optional(),
        colaboradorId: z.number().int().positive(),
        dataEvento: z.date(),
        dataEntrega: z.date(),
        dataColeta: z.date(),
        enderecoEntrega: z.string().optional(),
        valorTotal: z.number().int().nonnegative(),
        valorTaxaEntrega: z.number().optional(),
        status: statusEnum.optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se colaborador existe
      const colab = await db
        .select()
        .from(colaboradores)
        .where(eq(colaboradores.id, input.colaboradorId))
        .limit(1);
      if (colab.length === 0) {
        throw new Error("Colaborador não encontrado");
      }

      // Verificar se cliente existe (se fornecido)
      if (input.clienteId) {
        const cli = await db
          .select()
          .from(clientes)
          .where(eq(clientes.id, input.clienteId))
          .limit(1);
        if (cli.length === 0) {
          throw new Error("Cliente não encontrado");
        }
      }

      const result = await db.insert(pedidos).values({
        ...input,
        status: input.status ?? "Pendente",
        valorTaxaEntrega: input.valorTaxaEntrega ?? 0,
      });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        clienteId: z.number().int().positive().optional(),
        colaboradorId: z.number().int().positive().optional(),
        dataEvento: z.date().optional(),
        dataEntrega: z.date().optional(),
        dataColeta: z.date().optional(),
        enderecoEntrega: z.string().optional(),
        valorTotal: z.number().int().nonnegative().optional(),
        valorTaxaEntrega: z.number().optional(),
        status: statusEnum.optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;

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

      // Validar cliente se fornecido
      if (updates.clienteId) {
        const cli = await db
          .select()
          .from(clientes)
          .where(eq(clientes.id, updates.clienteId))
          .limit(1);
        if (cli.length === 0) {
          throw new Error("Cliente não encontrado");
        }
      }

      const result = await db
        .update(pedidos)
        .set(updates)
        .where(eq(pedidos.id, id));
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.delete(pedidos).where(eq(pedidos.id, input.id));
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, input.id))
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
        .update(pedidos)
        .set({ status: input.status })
        .where(eq(pedidos.id, input.id));
      return result;
    }),

  listByCliente: protectedProcedure
    .input(z.object({ clienteId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(pedidos)
        .where(eq(pedidos.clienteId, input.clienteId))
        .orderBy(desc(pedidos.createdAt));
    }),

  listByColaborador: protectedProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(pedidos)
        .where(eq(pedidos.colaboradorId, input.colaboradorId))
        .orderBy(desc(pedidos.createdAt));
    }),
});
