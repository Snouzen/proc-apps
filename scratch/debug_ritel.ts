import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.ritelModern.count();
  console.log("Total RitelModern count:", count);
  const grandLucky = await prisma.ritelModern.findMany({
    where: { namaPt: { contains: "GRAND LUCKY", mode: "insensitive" } }
  });
  console.log("GRAND LUCKY entries found:", grandLucky.length);
  grandLucky.forEach(r => {
    console.log(`- NamaPT: ${r.namaPt}, Inisial: ${r.inisial}, Tujuan: ${r.tujuan}`);
  });
}

main().finally(() => prisma.$disconnect());
