import { PrismaClient } from "../server/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const p = await prisma.purchaseOrder.findUnique({ where: { noPo: "testingasda" } });
    console.log(p);
}

main().catch(console.error).finally(() => prisma.$disconnect());
