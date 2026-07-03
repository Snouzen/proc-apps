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
  const ritels = await prisma.ritelModern.findMany({
    where: { namaPt: { contains: 'RAMAYANA', mode: 'insensitive' } },
    select: { id: true, namaPt: true, tujuan: true }
  });
  console.log('Ritels:', ritels);
}

main().catch(console.error).finally(() => prisma.$disconnect());
