import { PrismaClient } from "../server/generated/prisma";
import dns from "node:dns";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function exportByRitel() {
  console.log("🚀 Starting Export Process...");
  
  const allReturs = await prisma.dataRetur.findMany({
    include: {
      RitelModern: true
    }
  });

  if (!allReturs.length) {
    console.log("❌ No data found to export.");
    return;
  }

  // Create export dir
  const baseDir = path.join(process.cwd(), "exports", "retur");
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  // Grouping
  const groups: Record<string, any[]> = {};
  
  for (const item of allReturs) {
    const key = item.RitelModern?.namaPt || item.namaCompany || "Lain-Lain";
    if (!groups[key]) groups[key] = [];
    
    groups[key].push({
      "No RTV/CN": item.rtvCn || "-",
      "Tanggal RTV": item.tanggalRtv?.toISOString().split('T')[0] || "-",
      "Max Pickup": item.maxPickup?.toISOString().split('T')[0] || "-",
      "Inisial": item.inisial || "-",
      "Kode Toko": item.kodeToko || "-",
      "Produk": item.produk || "-",
      "Qty Retur": item.qtyReturn || 0,
      "Nominal": item.nominal || 0,
      "Harga/Kg": item.rpKg || 0,
      "Status Barang": item.statusBarang || "-",
      "Ket Status": item.refKetStatus || "-",
      "Lokasi": item.lokasiBarangId || "-",
      "Invoice": item.invoiceRekon || "-",
      "Remarks": item.remarks || "-"
    });
  }

  // Generate Files
  for (const [ritelName, rows] of Object.entries(groups)) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Retur Data");
    
    // Clean filename
    const safeName = ritelName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = path.join(baseDir, `Retur_${safeName}.xlsx`);
    
    XLSX.writeFile(wb, filename);
    console.log(`✅ Exported: ${filename} (${rows.length} rows)`);
  }

  console.log("\n✨ All exports completed! Check your 'exports/retur' folder.");
}

exportByRitel()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
