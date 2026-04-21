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
    const p = await prisma.purchaseOrder.count({ 
        where: { 
            unitProduksiId: "cmm35f3ty0009vsuv36evse43", // Regional 2 test
            tglkirim: {
                gte: new Date("2026-04-01T00:00:00Z"),
                lt: new Date("2026-05-01T00:00:00Z")
            }
        } 
    });
    console.log("Count:", p);

    // Let's reset testingasda so he can test again from UI
    await prisma.purchaseOrder.update({
        where: { noPo: "testingasda" },
        data: { noFaktur: null }
    });
    console.log("Reset testingasda!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
