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

// 2. Ambil DATABASE_URL (Port 6543) untuk runtime aplikasi
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// 3. Setup Pool & Adapter (Tetap menggunakan performa pg adapter)
const pool = new pg.Pool({
  connectionString: connectionString,
  max: isProd ? 10 : 3,
  idleTimeoutMillis: 5000,
  // 🟢 GANTI BAGIAN SSL JADI SEPERTI INI:
  ssl: {
    rejectUnauthorized: false, // Bypass validasi sertifikat
  },
});

const adapter = new PrismaPg(pool);

// 4. Inisialisasi Prisma Client
const prisma =
  global.prisma ??
  new PrismaClient({
    adapter, // Menggunakan adapter yang sudah kita pasang pool dengan SSL
    log: ["error", "warn"],
  });

export default prisma;
