import "dotenv/config";
import { defineConfig } from "prisma/config";

function sanitizeDatabaseUrl(url: string | undefined, isDirect: boolean) {
  if (!url) return undefined;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  if (!u.searchParams.get("connect_timeout")) {
    u.searchParams.set("connect_timeout", "30");
  }

  const host = u.hostname.toLowerCase();
  const isSupabase =
    host.endsWith(".supabase.co") || host.includes(".supabase.com");

  if (!u.searchParams.get("sslmode") && isSupabase) {
    u.searchParams.set("sslmode", "no-verify");
  }

  if (!isDirect && (u.port === "6543" || host.includes("pooler"))) {
    u.searchParams.set("pgbouncer", "true");
  } else if (isDirect && u.searchParams.has("pgbouncer")) {
    u.searchParams.delete("pgbouncer");
  }

  return u.toString();
}

const runtime = process.env.DATABASE_URL || process.env.database_url;
const direct = process.env.DIRECT_URL || process.env.DIRECT_DATABASE_URL;

// 🔥 Trik Deteksi CLI: Mengecek apakah command di terminal mengandung kata "migrate" atau "db"
const isMigrating =
  process.argv.join(" ").includes("migrate") ||
  process.argv.join(" ").includes("db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Hanya gunakan satu "url", tapi isinya otomatis berubah tergantung perintah di terminal
    url: sanitizeDatabaseUrl(isMigrating ? direct : runtime, isMigrating),
  },
});
