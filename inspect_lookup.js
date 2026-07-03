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
  const ritelId = '8eeac062-04e8-417e-b069-c72c7ffd46da'; // Ramayana
  const availableInvoices = await prisma.purchaseOrder.findMany({
    where: { 
       ritelId,
       AND: [
         { noInvoice: { not: null } },
         { noInvoice: { not: "" } },
       ]
    },
    select: { noInvoice: true, noPo: true },
    distinct: ['noInvoice'],
  });
  console.log(`Found ${availableInvoices.length} total invoices for Ramayana`);
  
  const targetInvoice = availableInvoices.find(i => i.noPo === '2603003772478' || i.noInvoice === 'INV/1741/04/2026/27100');
  console.log('Target invoice in availableInvoices:', targetInvoice);

  const existingRekons = await prisma.reconcile.findMany({
    select: { invoices: true },
  });
  const usedInvoiceSet = new Set();
  for (const rekon of existingRekons) {
    for (const inv of (rekon.invoices || [])) {
      usedInvoiceSet.add(inv);
    }
  }

  const filteredInvoices = availableInvoices
    .map(i => ({ noInvoice: i.noInvoice, noPo: i.noPo }))
    .filter(i => i.noInvoice && !usedInvoiceSet.has(i.noInvoice));

  console.log(`Found ${filteredInvoices.length} filtered invoices`);
  const targetFiltered = filteredInvoices.find(i => i.noPo === '2603003772478' || i.noInvoice === 'INV/1741/04/2026/27100');
  console.log('Target invoice in filteredInvoices:', targetFiltered);
}

main().catch(console.error).finally(() => prisma.$disconnect());
