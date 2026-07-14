import { getDb } from "./db";
import {
  colaboradores,
  comissoes,
  entregasColetas,
  itens,
  itensPedido,
  kits,
  kitItens,
  kitsPedido,
  pedidos,
  transacoesFinanceiras,
  users,
} from "../drizzle/schema";
import { sql, eq, like, or } from "drizzle-orm";

/**
 * Vitest globalSetup: runs once before all test files.
 *
 * Cleanup strategy: DELETE by pattern, not by ID.
 * All test data is identified by:
 *   - colaboradores: nome starts with "TEST_" OR email ends with "@example.com"
 *   - itens: nome starts with "TEST_"
 *   - kits: nome starts with "TEST_"
 *   - pedidos: nomeCliente starts with "TEST_" or "Cliente Teste" or "Cliente Atrasado" or "Cliente Dia" or "Cliente Kit"
 *   - users: email ends with "@example.com" (never deletes admin@valdecor.com or real users)
 *   - comissoes/transacoesFinanceiras/entregasColetas/itensPedido/kitsPedido/kitItens:
 *     deleted via cascade from their parent pedidos/itens/kits/colaboradores
 *
 * User data (Cadeira, Mateus, Gabriel, etc.) is NEVER touched.
 */
export async function setup() {
  const db = await getDb();
  if (!db) {
    console.log("[testSetup] Database not available, skipping cleanup setup");
    return () => {};
  }

  console.log("[testSetup] Test data will be identified by TEST_ prefix or @example.com email");

  // Return teardown function that deletes test data by pattern
  return async function teardown() {
    const db = await getDb();
    if (!db) {
      console.log("[testCleanup] Database not available, skipping cleanup");
      return;
    }

    console.log("[testCleanup] Removing test data by pattern (preserving all user data)...");

    // 1. Find test pedidos IDs (nomeCliente starts with test patterns)
    const testPedidos = await db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(
        or(
          like(pedidos.nomeCliente, "TEST_%"),
          like(pedidos.nomeCliente, "Cliente Teste%"),
          like(pedidos.nomeCliente, "Cliente Atrasado%"),
          like(pedidos.nomeCliente, "Cliente Dia%"),
          like(pedidos.nomeCliente, "Cliente Kit%")
        )
      );
    const testPedidoIds = testPedidos.map((p) => p.id);

    // 2. Find test itens IDs (nome starts with TEST_)
    const testItensRows = await db
      .select({ id: itens.id })
      .from(itens)
      .where(like(itens.nome, "TEST_%"));
    const testItemIds = testItensRows.map((i) => i.id);

    // 3. Find test kits IDs (nome starts with TEST_)
    const testKitsRows = await db
      .select({ id: kits.id })
      .from(kits)
      .where(like(kits.nome, "TEST_%"));
    const testKitIds = testKitsRows.map((i) => i.id);

    // 4. Find test colaboradores IDs (nome starts with TEST_ OR email ends with @example.com)
    const testColabs = await db
      .select({ id: colaboradores.id })
      .from(colaboradores)
      .where(
        or(
          like(colaboradores.nome, "TEST_%"),
          like(colaboradores.nome, "Colaborador%"),
          like(colaboradores.email, "%@example.com")
        )
      );
    const testColabIds = testColabs.map((c) => c.id);

    // 5. Delete children first, then parents

    // entregasColetas linked to test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(entregasColetas).where(sql`pedidoId IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // comissoes linked to test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(comissoes).where(sql`pedidoId IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // transacoesFinanceiras linked to test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(transacoesFinanceiras).where(sql`pedidoId IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // kitsPedido linked to test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(kitsPedido).where(sql`pedidoId IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // itensPedido linked to test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(itensPedido).where(sql`pedidoId IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Delete test pedidos
    if (testPedidoIds.length > 0) {
      await db.delete(pedidos).where(sql`id IN (${sql.join(testPedidoIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // kitItens linked to test kits
    if (testKitIds.length > 0) {
      await db.delete(kitItens).where(sql`kitId IN (${sql.join(testKitIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Delete test kits
    if (testKitIds.length > 0) {
      await db.delete(kits).where(sql`id IN (${sql.join(testKitIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Delete test itens
    if (testItemIds.length > 0) {
      await db.delete(itens).where(sql`id IN (${sql.join(testItemIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Delete test colaboradores
    if (testColabIds.length > 0) {
      await db.delete(colaboradores).where(sql`id IN (${sql.join(testColabIds.map(id => sql`${id}`), sql`, `)})`);
    }

    // Delete test users (email ends with @example.com, never admin@valdecor.com)
    await db.delete(users).where(like(users.email, "%@example.com"));

    const counts = {
      pedidos: testPedidoIds.length,
      itens: testItemIds.length,
      kits: testKitIds.length,
      colaboradores: testColabIds.length,
    };
    console.log(`[testCleanup] Removed: ${JSON.stringify(counts)}. User data preserved.`);
  };
}
