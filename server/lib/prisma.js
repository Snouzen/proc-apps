const path = require("path");
// Load .env dari root project (bukan dari dalam folder server)
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

// Gunakan adapter Postgres resmi Prisma 7
const prisma = global.prisma || new PrismaClient({ adapter });

// Pakai singleton prisma saat development agar koneksi tidak bocor saat hot-reload
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

module.exports = prisma;
