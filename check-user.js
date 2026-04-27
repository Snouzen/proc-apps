const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: { email: { contains: 'sukoharjo' } },
    select: { email: true, role: true, regional: true, siteArea: true }
  });
  console.log("=== Users matching 'sukoharjo' ===");
  console.log(JSON.stringify(users, null, 2));

  const units = await p.unitProduksi.findMany({
    where: { siteArea: { contains: 'SUKOHARJO', mode: 'insensitive' } },
    select: { idRegional: true, namaRegional: true, siteArea: true }
  });
  console.log("\n=== UnitProduksi matching 'SUKOHARJO' ===");
  console.log(JSON.stringify(units, null, 2));

  await p.$disconnect();
}
main();
