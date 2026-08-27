// Verifica la conexion a Supabase (pooler) — sin imprimir la password
import { readFileSync } from "fs";
import pg from "pg";
import dns from "dns/promises";

const env = readFileSync(new URL("../frontend/.env", import.meta.url), "utf8");
const m = env.match(/DATABASE_URL=(.+)/);
if (!m) { console.error("No DATABASE_URL en .env"); process.exit(1); }
const url = m[1].trim();
const u = new URL(url);

console.log("Actual en .env:");
console.log("  host:", u.hostname, "| puerto:", u.port || 5432, "| user:", u.username.split(".")[0]);
console.log("  password presente:", !!u.password);

for (const h of [u.hostname, "aws-0-us-east-1.pooler.supabase.com", "aws-0-us-west-1.pooler.supabase.com"]) {
  try { const a = await dns.lookup(h); console.log("  DNS OK:", h, "->", a.address); }
  catch (e) { console.log("  DNS FAIL:", h, "->", e.code); }
}

if (u.password) {
  for (const host of ["aws-0-us-east-1.pooler.supabase.com", "aws-0-us-west-1.pooler.supabase.com"]) {
    const poolerUrl = `postgresql://${u.username}:${encodeURIComponent(u.password)}@${host}:6543/postgres?sslmode=require`;
    const c = new pg.Client({ connectionString: poolerUrl, connectionTimeoutMillis: 8000 });
    try {
      await c.connect();
      const r = await c.query("SELECT 1 as ok");
      console.log("  CONECTA POOLER:", host, "(query ok:", r.rows[0].ok + ")");
      await c.end();
    } catch (e) {
      console.log("  pooler falla", host, "->", e.message.split("\n")[0]);
    }
  }
}
