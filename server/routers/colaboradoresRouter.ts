import { asc, sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { colaboradores, comissoes, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { hashPassword } from "../_core/authUtils";
import { TRPCError } from "@trpc/server";

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
        email: z.string().email("Email inválido"),
        senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        telefone: z.string().optional(),
        funcao: z.string().optional(),
        percentualComissao: z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if email already exists in users
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Email já está em uso" });
      }

      const passwordHash = await hashPassword(input.senha);

      await db.transaction(async (tx) => {
        const userResult = await tx.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.nome,
          role: "user",
        });
        const userId = Number(userResult[0].insertId);

        await tx.insert(colaboradores).values({
          nome: input.nome,
          email: input.email,
          telefone: input.telefone,
          funcao: input.funcao,
          percentualComissao: input.percentualComissao ?? 10,
          userId,
        });
      });

      return { success: true };
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
        novaSenha: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, novaSenha, ...updates } = input;

      // Busca o colaborador ANTES de atualizar, para saber o e-mail antigo e o userId vinculado
      const colBefore = await db.select().from(colaboradores).where(eq(colaboradores.id, id)).limit(1);
      if (colBefore.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }

      // Se o e-mail está mudando, garante que não está em uso por outro usuário
      if (input.email && input.email !== colBefore[0].email) {
        const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existingUser.length > 0 && existingUser[0].id !== colBefore[0].userId) {
          throw new TRPCError({ code: "CONFLICT", message: "Email já está em uso" });
        }
      }

      // Update colaborador fields
      await db.update(colaboradores).set(updates).where(eq(colaboradores.id, id));

      // Sync email and password to the linked user table (used for login)
      if (colBefore[0].userId) {
        const userUpdates: { email?: string; passwordHash?: string } = {};
        if (input.email && input.email !== colBefore[0].email) {
          userUpdates.email = input.email;
        }
        if (novaSenha) {
          userUpdates.passwordHash = await hashPassword(novaSenha);
        }
        if (Object.keys(userUpdates).length > 0) {
          await db.update(users).set(userUpdates).where(eq(users.id, colBefore[0].userId));
        }
      }

      return { success: true };
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
