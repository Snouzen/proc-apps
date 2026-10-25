require('dotenv').config({ quiet: true });
const { PrismaClient } = require('../server/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL?.replace(/([?&])sslmode=require&?/, '$1'), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 }) });
(async () => {
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const rekons = await tx.reconcile.findMany({ where: { OR: [{ noRekonsiliasi: 'R-018/06/2026' }, { noRekonsiliasi: 'R-015/06/2026' }] }, select: { id: true, noRekonsiliasi: true, ritelId: true, invoices: true, rtvs: true, rtvDetails: true, totalInvoices: true, totalRtvs: true } });
      const invoices = [...new Set(rekons.flatMap(r => r.invoices))];
      const pos = await tx.purchaseOrder.findMany({ where: { noInvoice: { in: invoices } }, select: { id: true, noInvoice: true, ritelId: true, Items: { select: { rpTagih: true, hargaPcs: true, pcsKirim: true } } } });
      const returs = await tx.dataRetur.findMany({ where: { OR: [{ rtvCn: { in: ['20420', '24112'] } }, { id: { in: rekons.flatMap(r => Array.isArray(r.rtvDetails) ? r.rtvDetails.map(d => d.id).filter(Boolean) : []) } }] }, select: { id: true, rtvCn: true, ritelId: true, nominal: true, qtyReturn: true, namaCompany: true, inisial: true, lokasiBarangId: true, pembebananReturnId: true, productId: true, LokasiBarang: { select: { siteArea: true } } } });
      const ritels = await tx.ritelModern.findMany({ where: { id: { in: [...new Set([...rekons, ...pos, ...returs].map(r => r.ritelId).filter(Boolean))] } }, select: { id: true, namaPt: true, inisial: true } });
      console.log(JSON.stringify({ rekons, pos, returs, ritels }, null, 2));
    }, { timeout: 30000 });
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await prisma.$disconnect(); }
})();
