import { eq, ne } from "drizzle-orm";
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

/**
 * Global teardown: runs once after ALL test files complete.
 * Cleans all business data created by tests, keeping only:
 * - Admin users (role = 'admin') created via createUser script
 */
export async function teardown() {
  const db = await getDb();
  if (!db) {
    console.log("[testCleanup] Database not available, skipping cleanup");
    return;
  }

  console.log("[testCleanup] Cleaning test data from database...");

  // Delete in dependency order (children first)
  await db.delete(entregasColetas);
  await db.delete(comissoes);
  await db.delete(transacoesFinanceiras);
  await db.delete(kitsPedido);
  await db.delete(itensPedido);
  await db.delete(pedidos);
  await db.delete(kitItens);
  await db.delete(kits);
  await db.delete(itens);

  // Delete all colaboradores (test data)
  await db.delete(colaboradores);

  // Delete all non-admin users (preserves admin created via createUser script)
  await db.delete(users).where(ne(users.role, "admin"));

  console.log("[testCleanup] Database cleaned. Admin user(s) preserved.");
}
