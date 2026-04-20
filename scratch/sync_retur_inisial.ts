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

async function syncInisial() {
  console.log("🔄 Starting Inisial Synchronization...");
  
  // Ambil semua retur yang inisialnya masih kosong/null
  const retursToUpdate = await prisma.dataRetur.findMany({
    where: {
      OR: [
        { inisial: null },
        { inisial: "" }
      ],
      ritelId: { not: null }
    },
    include: {
      RitelModern: true
    }
  });

  console.log(`🔎 Found ${retursToUpdate.length} records to update.`);

  let updatedCount = 0;
  for (const item of retursToUpdate) {
    if (item.RitelModern?.inisial) {
      await prisma.dataRetur.update({
        where: { id: item.id },
        data: { inisial: item.RitelModern.inisial }
      });
      updatedCount++;
      if (updatedCount % 50 === 0) console.log(`✅ Processed ${updatedCount} records...`);
    }
  }

  console.log(`\n✨ Successfully updated ${updatedCount} records with missing inisial.`);
}

syncInisial()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
