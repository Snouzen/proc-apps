require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dns = require('node:dns');

dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString: connectionString.replace('&sslmode=require', '').replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const startOfMonth = new Date(Date.UTC(2026, 6, 1)); // 2026-07-01
  console.log('Start of month:', startOfMonth);

  const poList = await prisma.purchaseOrder.findMany({
    where: {
      tglPo: { gte: startOfMonth }
    },
    select: {
      noPo: true,
      tglPo: true,
      unitProduksiId: true,
      UnitProduksi: {
        select: {
          siteArea: true
        }
      }
    }
  });
  console.log('POs in July 2026:', poList.length);
  console.log(poList.slice(0, 10)); // Show top 10
}

main().catch(console.error).finally(() => prisma.$disconnect());
