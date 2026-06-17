import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const data = await prisma.unitProduksi.findMany({
      select: { idRegional: true, namaRegional: true, siteArea: true, alamat: true, managerOperasional: true, createdAt: true, updatedAt: true },
      take: 2
    });
    console.log("SUCCESS:", data);
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
