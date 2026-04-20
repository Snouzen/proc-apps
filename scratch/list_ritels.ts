import { PrismaClient } from "../server/generated/prisma";
import dns from "node:dns";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const ritels = await prisma.ritelModern.findMany({
    select: { namaPt: true, id: true }
  });
  console.log("Retailers in DB:", JSON.stringify(ritels, null, 2));
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
