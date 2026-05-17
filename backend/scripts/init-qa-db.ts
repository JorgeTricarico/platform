/**
 * Inicializa la DB QA aplicando todas las migraciones del repo contra
 * el proyecto Supabase `platform-qa`.
 *
 * Uso:
 *   DATABASE_URL_QA="<session-mode-url-puerto-5432>" npx tsx backend/scripts/init-qa-db.ts
 *
 * La URL debe ser la del pooler en session mode (puerto 5432), no 6543.
 * Idempotente: corre `prisma migrate deploy` que solo aplica las pendientes.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_QA;

if (!url) {
  console.error("Falta env var DATABASE_URL_QA (pooler session mode, puerto 5432).");
  process.exit(1);
}

if (!url.includes(":5432")) {
  console.error("DATABASE_URL_QA debe usar puerto 5432 (session mode). Migraciones no funcionan con 6543.");
  process.exit(1);
}

console.log("Aplicando migraciones contra DB QA...");
execSync("npx prisma migrate deploy", {
  cwd: `${__dirname}/..`,
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
});

console.log("\nVerificando estado final...");
execSync("npx prisma migrate status", {
  cwd: `${__dirname}/..`,
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
});

console.log("\nDB QA lista. Próximo paso: crear servicios Render apuntando a rama develop.");
