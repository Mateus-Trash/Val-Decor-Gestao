import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, colaboradores } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log("[Database] Connecting with URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  } else if (!_db && !process.env.DATABASE_URL) {
    console.error("[Database] DATABASE_URL is not set!");
  }
  return _db;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error: any) {
    console.error("[Database] getUserByEmail error:", error?.message || error);
    console.error("[Database] Error code:", error?.code || "N/A");
    console.error("[Database] Error errno:", error?.errno || "N/A");
    console.error("[Database] Error sqlMessage:", error?.sqlMessage || "N/A");
    throw error;
  }
}

export async function getColaboradorByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(colaboradores).where(eq(colaboradores.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
