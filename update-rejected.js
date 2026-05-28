const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.purchaseOrder.updateMany({
    where: { noPo: { in: ['Testing credit limit', 'tesssst'] } },
    data: { statusCreditLimit: 'REJECTED' }
  });
  console.log(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
