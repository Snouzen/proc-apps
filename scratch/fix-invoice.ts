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
    console.log("Migrating generated invoices to faktur...");
    const pois = await prisma.purchaseOrder.findMany({
        where: {
            noInvoice: { contains: "/202" } // Looks for `/2024`, `/2025`, `001/05/2026/27100` etc... wait!
        }
    });

    let count = 0;
    for (const po of pois) {
        if (po.noInvoice && po.noInvoice.match(/^\d{3}\/\d{2}\/20\d{2}\/\d{5}$/)) {
            await prisma.purchaseOrder.update({
                where: { id: po.id },
                data: {
                    noFaktur: po.noInvoice,
                    noInvoice: null // Revert to null so it stays Active
                }
            });
            count++;
        }
    }
    console.log(`Migrated ${count} POs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
