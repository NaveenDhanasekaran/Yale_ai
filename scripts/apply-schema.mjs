// Applies supabase/schema.sql to the database in DATABASE_URL.
// Usage (PowerShell):  $env:DATABASE_URL="postgresql://..."; npm run db:push
// Usage (bash):        DATABASE_URL="postgresql://..." npm run db:push
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (the Supabase session/direct connection string).");
  process.exit(1);
}

const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  const t = await client.query("select count(*)::int as n from technicians");
  const z = await client.query("select count(*)::int as n from zones");
  console.log(`Schema applied. technicians=${t.rows[0].n}, zones=${z.rows[0].n}`);
} catch (err) {
  console.error("FAILED:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
