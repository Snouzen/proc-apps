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
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const topUnitsMtd = await prisma.purchaseOrder.groupBy({
    by: ['unitProduksiId'],
    _count: true,
    where: {
      tglPo: { gte: startOfMonth }
    },
    orderBy: { _count: { unitProduksiId: 'desc' } },
    take: 6
  });
  console.log("topUnitsMtd:", topUnitsMtd);

  const unitIds = [...new Set([...topUnitsMtd.map(u => u.unitProduksiId)])].filter(Boolean);
  const units = await prisma.unitProduksi.findMany({
    where: { idRegional: { in: unitIds } },
    select: { idRegional: true, siteArea: true }
  });

  const topSiteAreasMtd = topUnitsMtd
    .filter(u => u.unitProduksiId && u.unitProduksiId !== "UNKNOWN")
    .map(u => ({
      name: units.find(unit => unit.idRegional === u.unitProduksiId)?.siteArea || "UNKNOWN",
      po: u._count
    }))
    .filter(u => u.name !== "UNKNOWN")
    .slice(0, 5);

  console.log("topSiteAreasMtd:", topSiteAreasMtd);
}

main().catch(console.error).finally(() => prisma.$disconnect());
