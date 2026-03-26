import "dotenv/config";
import { defineConfig } from "prisma/config";

function sanitizeDatabaseUrl(url: string) {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (!u.searchParams.get("connect_timeout"))
    u.searchParams.set("connect_timeout", "30");
  const host = u.hostname.toLowerCase();
  const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
  const isSupabase =
    host.endsWith(".supabase.co") || host.includes(".supabase.com");
  if (!sslmode && isSupabase) u.searchParams.set("sslmode", "no-verify");
  if (u.port === "6543" || u.hostname.toLowerCase().includes("pooler")) {
    u.searchParams.set("pgbouncer", "true");
  }
  return u.toString();
}

const migrateRaw =
  process.env.MIGRATE_DATABASE_URL || process.env.migrate_database_url;
const migrate =
  migrateRaw && /USER:PASSWORD@HOST/i.test(migrateRaw) ? undefined : migrateRaw;
const runtime = process.env.DATABASE_URL || process.env.database_url;
const direct =
  process.env.DIRECT_DATABASE_URL ||
  process.env.direct_database_url ||
  process.env.DIRECT_URL;
const selected = migrate || runtime || direct;
if (!selected) {
  throw new Error(
    "Set DATABASE_URL (or MIGRATE_DATABASE_URL / DIRECT_DATABASE_URL)",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: sanitizeDatabaseUrl(selected),
  },
});
