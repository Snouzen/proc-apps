
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const reconciles = await prisma.reconcile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('Reconciles count:', reconciles.length);
    if(reconciles.length > 0) {
      console.log('invoices type:', typeof reconciles[0].invoices, Array.isArray(reconciles[0].invoices));
      const allInvNos = [...new Set(reconciles.flatMap(r => r.invoices || []))];
      console.log('InvNos length:', allInvNos.length);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();

