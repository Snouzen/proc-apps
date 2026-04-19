
const { PrismaClient } = require("../server/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const allRitels = await prisma.ritelModern.findMany({
    orderBy: { namaPt: 'asc' }
  });
  
  const groups = {};
  allRitels.forEach(r => {
    if (!groups[r.namaPt]) groups[r.namaPt] = [];
    groups[r.namaPt].push(r);
  });
  
  console.log("=== Duplicate Report ===");
  for (const name in groups) {
    if (groups[name].length > 1) {
      console.log(`${name}: ${groups[name].length} entries`);
      groups[name].forEach(r => console.log(`  - ID: ${r.id}, Inisial: ${r.inisial}, Tujuan: ${r.tujuan}`));
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
