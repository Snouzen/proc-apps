import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL;

function sanitizeDatabaseUrl(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  u.searchParams.set("connect_timeout", "20");
  if (u.port === "6543") {
    u.searchParams.set("pgbouncer", "true");
  }
  return u.toString();
}

function createPool(connectionString: string) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 50,
    idleTimeoutMillis: 5000,
  });
}

function createPrisma(pool: Pool): PrismaClient {
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL is not set. Tambahkan DATABASE_URL di file .env",
    );
  }
  const adapter = new PrismaPg(pool);
  const isProd = process.env.NODE_ENV === "production";
  const prisma = new PrismaClient({
    adapter,
    log: isProd
      ? ["error"]
      : [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
        ],
  });
  return prisma;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null;
  pool: Pool | null;
  prismaListenersAttached?: boolean;
};

if (!rawUrl) {
  throw new Error(
    "DATABASE_URL is not set. Tambahkan DATABASE_URL di file .env",
  );
}

const connectionString = sanitizeDatabaseUrl(rawUrl);
const pool = globalForPrisma.pool ?? createPool(connectionString);
globalForPrisma.pool = pool;

const prisma = globalForPrisma.prisma ?? createPrisma(pool);
globalForPrisma.prisma = prisma;

if (
  process.env.NODE_ENV !== "production" &&
  !globalForPrisma.prismaListenersAttached
) {
  globalForPrisma.prismaListenersAttached = true;
  (prisma as any).$on?.("query", (e: any) => {
    if (e.duration >= 1000) {
      console.warn(`[prisma] slow query ${e.duration}ms`);
    }
  });
}

export default prisma;
