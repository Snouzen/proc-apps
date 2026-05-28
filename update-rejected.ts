import prisma from './src/lib/prisma';

async function main() {
  const result = await prisma.purchaseOrder.updateMany({
    where: { noPo: { in: ['Testing credit limit', 'tesssst'] } },
    data: { statusCreditLimit: 'REJECTED' }
  });
  console.log('Updated:', result);
}

main().catch(console.error).finally(() => process.exit(0));
