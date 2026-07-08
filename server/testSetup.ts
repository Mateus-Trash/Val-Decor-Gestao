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
import { sql } from "drizzle-orm";

/**
 * Vitest globalSetup: runs once before all test files.
 * Snapshots the current max IDs from all business tables.
 * The returned teardown function deletes only rows with id > snapshot,
 * preserving all data the user created manually.
 */
export async function setup() {
  const db = await getDb();
  if (!db) {
    console.log("[testSetup] Database not available, skipping cleanup setup");
    return () => {};
  }

  // Snapshot current max IDs (or 0 if table is empty)
  const snapshot: Record<string, number> = {};

  async function snapshotMaxId(table: any, label: string) {
    const rows = await db!.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(table);
    snapshot[label] = rows[0]?.maxId ?? 0;
  }

  await snapshotMaxId(users, "users");
  await snapshotMaxId(colaboradores, "colaboradores");
  await snapshotMaxId(itens, "itens");
  await snapshotMaxId(kits, "kits");
  await snapshotMaxId(kitItens, "kitItens");
  await snapshotMaxId(pedidos, "pedidos");
  await snapshotMaxId(itensPedido, "itensPedido");
  await snapshotMaxId(kitsPedido, "kitsPedido");
  await snapshotMaxId(transacoesFinanceiras, "transacoesFinanceiras");
  await snapshotMaxId(comissoes, "comissoes");
  await snapshotMaxId(entregasColetas, "entregasColetas");

  console.log(`[testSetup] Snapshot max IDs: ${JSON.stringify(snapshot)}`);

  // Return teardown function that only deletes test-created rows
  return async function teardown() {
    const db = await getDb();
    if (!db) {
      console.log("[testCleanup] Database not available, skipping cleanup");
      return;
    }

    console.log("[testCleanup] Removing only test-created data (preserving user data)...");

    // Delete in dependency order (children first), only rows with id > snapshot
    await db.delete(entregasColetas).where(sql`id > ${snapshot.entregasColetas}`);
    await db.delete(comissoes).where(sql`id > ${snapshot.comissoes}`);
    await db.delete(transacoesFinanceiras).where(sql`id > ${snapshot.transacoesFinanceiras}`);
    await db.delete(kitsPedido).where(sql`id > ${snapshot.kitsPedido}`);
    await db.delete(itensPedido).where(sql`id > ${snapshot.itensPedido}`);
    await db.delete(pedidos).where(sql`id > ${snapshot.pedidos}`);
    await db.delete(kitItens).where(sql`id > ${snapshot.kitItens}`);
    await db.delete(kits).where(sql`id > ${snapshot.kits}`);
    await db.delete(itens).where(sql`id > ${snapshot.itens}`);
    await db.delete(colaboradores).where(sql`id > ${snapshot.colaboradores}`);
    await db.delete(users).where(sql`id > ${snapshot.users}`);

    console.log("[testCleanup] Test data removed. User data preserved.");
  };
}
