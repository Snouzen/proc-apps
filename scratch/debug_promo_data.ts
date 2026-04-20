import { PrismaClient } from "../server/generated/prisma";
import dns from "node:dns";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Ensure IPv4
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const allPromos = await prisma.promo.count();
  const nullRitels = await prisma.promo.count({
    where: { ritelId: null }
  });
  
  const promos = await prisma.promo.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nomor: true,
      ritelId: true,
      RitelModern: {
        select: { namaPt: true }
      }
    }
  });

  console.log("Total Promos:", allPromos);
  console.log("Promos with ritelId NULL:", nullRitels);
  console.log("Latest 20 Promos Sample:", JSON.stringify(promos, null, 2));
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
