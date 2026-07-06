const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'CREATE',
      entity: { in: ['PurchaseOrder', 'Reconcile', 'DataRetur'] }
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(logs.map(l => ({ entity: l.entity, newData: l.newData })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
