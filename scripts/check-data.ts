import { PrismaClient } from "../server/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const rawUrl = process.env.DATABASE_URL;

function normalizeConnectionUrl(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  if (!url.includes("connect_timeout=")) {
    const params = new URLSearchParams();
    params.set("connect_timeout", "15");
    return `${url}${sep}${params.toString()}`;
  }
  return url;
}

function createPrisma(): PrismaClient {
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not set.");
  }
  const connectionString = normalizeConnectionUrl(rawUrl);
  const poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
  const adapter = new PrismaPg(poolConfig);
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

async function main() {
  const pos = await prisma.purchaseOrder.findMany({
    take: 5,
    select: {
      noPo: true,
      regional: true,
      tujuanDetail: true
    }
  });
  console.log("Sample POs:", JSON.stringify(pos, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
