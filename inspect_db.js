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
  const po = await prisma.purchaseOrder.findFirst({
    where: { noPo: '2603003772478' }
  });
  console.log('PO:', po);
  
  if (po && po.noInvoice) {
    const rekons = await prisma.reconcile.findMany({
      where: {
        invoices: {
          has: po.noInvoice
        }
      },
      select: { noRekonsiliasi: true, status: true, ritelId: true, id: true }
    });
    console.log('Rekons using this invoice:', rekons);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
