const { PrismaClient } = require("../server/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const regions = [
    { name: "Bandung", kode: "27100" },
    { name: "Surabaya", kode: "27200" },
    { name: "Makassar", kode: "27300" }
  ];

  for (const { name, kode } of regions) {
    const res = await prisma.unitProduksi.updateMany({
      where: {
        namaRegional: { contains: name, mode: "insensitive" }
      },
      data: {
        kodeRegional: kode
      }
    });
    console.log(`Updated ${res.count} records for ${name} to ${kode}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
