
import { PrismaClient } from '../server/generated/prisma';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
  console.log('Mulai migrasi data retur...');
  
  const allData = await prisma.dataRetur.findMany({
    where: {
      OR: [
        { referensiPembayaran: { not: null } },
        { invoiceRekon: 'false' },
        { invoiceRekon: 'true' }
      ]
    }
  });

  console.log(`Ditemukan ${allData.length} data yang perlu diperbaiki.`);

  for (const item of allData) {
    let newInvoiceRekon = item.invoiceRekon;
    let newRefPembayaran = item.referensiPembayaran;

    if (item.referensiPembayaran && item.referensiPembayaran !== '-') {
      newInvoiceRekon = item.referensiPembayaran;
      newRefPembayaran = null;
      console.log(`- Memindahkan ${item.referensiPembayaran} dari Ref ke InvoiceRekon`);
    }

    if (newInvoiceRekon === 'false' || newInvoiceRekon === 'true') {
      if (!item.referensiPembayaran) {
        newInvoiceRekon = null;
      }
    }

    await prisma.dataRetur.update({
      where: { id: item.id },
      data: {
        invoiceRekon: newInvoiceRekon,
        referensiPembayaran: newRefPembayaran
      }
    });
  }

  console.log('Migrasi selesai!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migrasi Gagal:', err);
  process.exit(1);
});
