const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.purchaseOrder.updateMany({
    where: {
      statusBayar: false,
      buktiBayar: {
        not: null,
        not: '',
        not: '-'
      }
    },
    data: {
      statusBayar: true
    }
  });
  console.log('Updated ' + result.count + ' records.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
