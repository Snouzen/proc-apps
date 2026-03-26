import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dns from "node:dns";

declare global {
  var prisma: PrismaClient | undefined;
}

const isProd = process.env.NODE_ENV === "production";
const envDatabaseUrl = process.env.DATABASE_URL || process.env.database_url;
const envDirectUrl = process.env.DIRECT_URL || process.env.direct_url;
const envDirectDatabaseUrl =
  process.env.DIRECT_DATABASE_URL || process.env.direct_database_url;

function looksLikePooler(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const port = u.port;
    return host.includes("pooler") || port === "6543";
  } catch {
    return false;
  }
}

function looksMisconfiguredPooler(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const port = u.port;
    const pgb =
      (u.searchParams.get("pgbouncer") || "").toLowerCase() === "true";
    return pgb && host.startsWith("db.") && port === "5432";
  } catch {
    return false;
  }
}

const rawDbUrl =
  (envDatabaseUrl && looksLikePooler(envDatabaseUrl)
    ? envDatabaseUrl
    : undefined) ||
  (envDirectUrl && looksLikePooler(envDirectUrl) ? envDirectUrl : undefined) ||
  (envDatabaseUrl && !looksMisconfiguredPooler(envDatabaseUrl)
    ? envDatabaseUrl
    : undefined) ||
  envDirectDatabaseUrl ||
  envDatabaseUrl ||
  envDirectUrl;
if (!rawDbUrl) {
  throw new Error("DATABASE_URL is not set");
}

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

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const parsed = new URL(sanitizeDatabaseUrl(rawDbUrl));
const adapter = new PrismaPg({
  host: parsed.hostname,
  port: parsed.port ? Number(parsed.port) : 5432,
  user: decodeURIComponent(parsed.username || ""),
  password: decodeURIComponent(parsed.password || ""),
  database: parsed.pathname ? parsed.pathname.replace(/^\//, "") : "postgres",
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 5000,
});

const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (!isProd) {
  global.prisma = prisma;
  (prisma as any).$on?.("query", (e: any) => {
    if (typeof e?.duration === "number" && e.duration >= 1200) {
      console.warn(`[prisma] slow query ${e.duration}ms`);
    }
  });
  (prisma as any).$on?.("error", (e: any) => {
    const code = (e?.code || "").toString();
    if (code) {
      console.error(`[prisma] error code=${code}`);
    } else {
      console.error(`[prisma] error`);
    }
  });
}

export default prisma;
