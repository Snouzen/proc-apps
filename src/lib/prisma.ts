import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg"; // Pastikan package 'pg' terinstal
import dns from "node:dns";

declare global {
  var prisma: PrismaClient | undefined;
}

// 1. Prioritaskan IPv4 untuk menghindari hang pada koneksi Supabase
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const isProd = process.env.NODE_ENV === "production";

// Use a singleton pattern to prevent multiple instances of PrismaClient and pg.Pool in development
const getPrisma = () => {
  if (global.prisma) return global.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({
    connectionString: connectionString,
    max: isProd ? 10 : 3,
    idleTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: isProd ? ["error"] : ["query", "error", "warn"],
  });

  if (!isProd) global.prisma = client;
  return client;
};

const prisma = getPrisma();

export default prisma;

