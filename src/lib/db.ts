import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const rawUrl = process.env.DATABASE_URL;

/** Tambah timeout di URL. SSL di-set via pool config (rejectUnauthorized: false untuk self-signed cert Supabase). */
function normalizeConnectionUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  if (!url.includes("connect_timeout=")) {
    const params = new URLSearchParams();
    params.set("connect_timeout", "15");
    return `${url}${sep}${params.toString()}`;
  }
  return url;
}

function createPrisma(): PrismaClient {
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL is not set. Tambahkan DATABASE_URL di file .env",
    );
  }
  const connectionString = normalizeConnectionUrl(rawUrl);
  // Supabase pooler kadang pakai cert chain yang Node anggap self-signed; terima agar koneksi jalan
  const poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 1_000,
  };
  const adapter = new PrismaPg(poolConfig);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null;
};
// Note: If you add columns to schema, you might need to restart dev server or rename this key temporarily
const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;

export default prisma;
