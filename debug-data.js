const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'sukoharjo', mode: 'insensitive' } }
    });
    console.log('USERS:', JSON.stringify(users, null, 2));

    const units = await prisma.unitProduksi.findMany({
        where: { OR: [
            { siteArea: { contains: 'sukoharjo', mode: 'insensitive' } },
            { namaRegional: { contains: 'surabaya', mode: 'insensitive' } }
        ]}
    });
    console.log('UNITS:', JSON.stringify(units, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
