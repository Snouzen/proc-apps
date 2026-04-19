
const { PrismaClient } = require("../server/generated/prisma");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const allRitels = await prisma.ritelModern.findMany();
  console.log(JSON.stringify(allRitels, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
