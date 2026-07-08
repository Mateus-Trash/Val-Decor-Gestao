import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../../drizzle/schema";
import { hashPassword } from "../_core/authUtils";

async function main() {
  const [email, senha, nome, role] = process.argv.slice(2);

  if (!email || !senha || !nome) {
    console.error("Uso: tsx server/scripts/createUser.ts <email> <senha> <nome> [role]");
    console.error("  role: admin | user (default: admin)");
    process.exit(1);
  }

  const userRole = (role === "user" ? "user" : "admin") as "user" | "admin";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definida");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const passwordHash = await hashPassword(senha);

  await db.insert(users).values({
    email,
    passwordHash,
    name: nome,
    role: userRole,
  });

  console.log(`✓ Usuário criado: ${email} (${userRole})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
