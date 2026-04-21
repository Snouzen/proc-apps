import { PrismaClient } from "../server/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const regions = [
    { name: "Bandung", kode: "27100" },
    { name: "Surabaya", kode: "27200" },
    { name: "Makassar", kode: "27300" }
  ];

  for (const { name, kode } of regions) {
    const res = await prisma.unitProduksi.updateMany({
      where: {
        namaRegional: { contains: name, mode: "insensitive" }
      },
      data: { kodeRegional: kode }
    });
    console.log(`Updated ${res.count} records for ${name} to ${kode}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
