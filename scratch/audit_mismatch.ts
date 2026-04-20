import { PrismaClient } from "../server/generated/prisma/index.js";
import dns from "node:dns";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function auditMismatch() {
  console.log("🔍 Investigating Data Mismatch...");
  
  const mismatches = await prisma.dataRetur.findMany({
    where: {
      ritelId: { not: null }
    },
    include: {
      RitelModern: true
    },
    take: 100 // Cek 100 sampel pertama
  });

  console.log("--- Sample Audit (Retur vs Master) ---");
  mismatches.forEach(m => {
    const returName = m.namaCompany || "EMPTY";
    const masterName = m.RitelModern?.namaPt || "NOT FOUND";
    const status = returName.toLowerCase().includes(masterName.toLowerCase()) || 
                   masterName.toLowerCase().includes(returName.toLowerCase()) ? "✅ MATCH" : "❌ MISMATCH";
    
    if (status === "❌ MISMATCH") {
      console.log(`ID: ${m.id}`);
      console.log(`   Retur NamaCompany: ${returName}`);
      console.log(`   Master NamaPt:    ${masterName}`);
      console.log(`   Inisial Linked:   ${m.inisial}`);
      console.log(`   Status:           ${status}`);
      console.log("-------------------");
    }
  });
}

auditMismatch()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
