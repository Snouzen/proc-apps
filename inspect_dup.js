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
  const pos = await prisma.purchaseOrder.findMany({
    where: { noInvoice: 'INV/1741/04/2026/27100' },
    select: { id: true, noPo: true, noInvoice: true, ritelId: true }
  });
  console.log('POs with this invoice:', pos);
}

main().catch(console.error).finally(() => prisma.$disconnect());
