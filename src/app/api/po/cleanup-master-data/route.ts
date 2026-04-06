import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";

/**
 * CLEANUP API (ONE-TIME USE)
 * Tujuan: Menghapus permanen nilai-nilai sampah ('Unknown', string kosong, placeholder)
 * dari database agar tidak muncul sebagai entitas unik di Master Data.
 *
 * CARA PAKAI: Panggil GET /api/po/cleanup-master-data
 * SETELAH SELESAI: Hapus atau non-aktifkan file ini.
 */

// Nilai-nilai sampah yang akan dibersihkan
const JUNK_VALUES_INSENSITIVE = [
  "unknown",
  "site area belum ada unit produksi",
  "belum ada",
  "n/a",
  "none",
  "-",
];

function isJunk(val: string | null | undefined): boolean {
  if (!val) return true; // null, undefined, ""
  const cleaned = val.trim().toLowerCase();
  if (!cleaned) return true;
  return JUNK_VALUES_INSENSITIVE.includes(cleaned);
}

export async function GET() {
  const report: Record<string, any> = {};

  try {
    // ── 1. Bersihkan field `regional` di PurchaseOrder ─────────────────────────
    console.log("🧹 [CLEANUP] Step 1: Cleaning PurchaseOrder.regional...");
    const regionalCleanup = await prisma.purchaseOrder.updateMany({
      where: {
        OR: [
          { regional: null },
          { regional: "" },
          { regional: { equals: "Unknown", mode: "insensitive" } },
          { regional: { equals: "UNKNOWN", mode: "insensitive" } },
          { regional: { equals: "n/a", mode: "insensitive" } },
          { regional: { equals: "-", mode: "insensitive" } },
          { regional: { equals: "belum ada", mode: "insensitive" } },
        ],
      },
      data: {
        regional: null,
      },
    });
    report.step1_poRegionalCleaned = regionalCleanup.count;
    console.log(`   ✅ Updated ${regionalCleanup.count} PO.regional → null`);

    // ── 2. Hapus UnitProduksi dengan idRegional = 'UNKNOWN' (sentinel row) ─────
    console.log("🧹 [CLEANUP] Step 2: Deleting UNKNOWN UnitProduksi sentinel rows...");
    // Hanya bisa hapus jika tidak direferensikan oleh PO aktif.
    // Pertama, pindahkan PO yang masih pakai unitProduksiId 'UNKNOWN'
    // ke null/unknown → cari unit produksi default atau gunakan sentiel lain.
    // Untuk keamanan, kita hanya DETACH terlebih dulu, bukan hard-delete.
    const unknownUnitRows = await prisma.unitProduksi.findMany({
      where: {
        OR: [
          { idRegional: "UNKNOWN" },
          { namaRegional: { equals: "Unknown", mode: "insensitive" } },
          { siteArea: { equals: "UNKNOWN", mode: "insensitive" } },
          { siteArea: { equals: "site area belum ada unit produksi", mode: "insensitive" } },
          { siteArea: { equals: "belum ada", mode: "insensitive" } },
        ],
      },
      select: { idRegional: true, namaRegional: true, siteArea: true },
    });
    report.step2_unknownUnitProduksiFound = unknownUnitRows;

    const unknownIds = unknownUnitRows.map((u) => u.idRegional);
    if (unknownIds.length > 0) {
      // Cek apakah ada PO yang masih memakai unit ini
      const attachedPOs = await prisma.purchaseOrder.count({
        where: { unitProduksiId: { in: unknownIds } },
      });
      report.step2_poStillAttachedToUnknownUnit = attachedPOs;

      if (attachedPOs === 0) {
        // Aman untuk dihapus
        const deleted = await prisma.unitProduksi.deleteMany({
          where: { idRegional: { in: unknownIds } },
        });
        report.step2_unknownUnitProduksiDeleted = deleted.count;
        console.log(`   ✅ Deleted ${deleted.count} junk UnitProduksi rows`);
      } else {
        report.step2_skipReason = `Tidak bisa hapus: masih ada ${attachedPOs} PO yang terhubung. Perlu re-assign dulu.`;
        console.warn(`   ⚠️  Skipped: ${attachedPOs} POs still attached to UNKNOWN units`);
      }
    } else {
      report.step2_unknownUnitProduksiDeleted = 0;
      console.log("   ✅ No junk UnitProduksi rows found.");
    }

    // ── 3. Bersihkan UnitProduksi yang siteArea-nya adalah placeholder ─────────
    console.log("🧹 [CLEANUP] Step 3: Cleaning placeholder siteArea names in UnitProduksi...");
    // Ambil semua unit produksi dan filter secara aplikasi untuk case-insensitive flexibility
    const allUnits = await prisma.unitProduksi.findMany({
      select: { idRegional: true, siteArea: true, namaRegional: true },
    });
    const junkSiteAreaIds = allUnits
      .filter((u) => isJunk(u.siteArea))
      .map((u) => u.idRegional)
      .filter((id) => !unknownIds.includes(id)); // skip yang sudah ditangani di step 2

    if (junkSiteAreaIds.length > 0) {
      const attachedCount = await prisma.purchaseOrder.count({
        where: { unitProduksiId: { in: junkSiteAreaIds } },
      });
      report.step3_junkSiteAreaFound = junkSiteAreaIds.length;
      report.step3_poAttached = attachedCount;

      if (attachedCount === 0) {
        const deleted = await prisma.unitProduksi.deleteMany({
          where: { idRegional: { in: junkSiteAreaIds } },
        });
        report.step3_deleted = deleted.count;
        console.log(`   ✅ Deleted ${deleted.count} UnitProduksi with junk siteArea`);
      } else {
        report.step3_skipReason = `${attachedCount} PO masih attached, tidak bisa hapus.`;
        console.warn(`   ⚠️  Skipped: ${attachedCount} POs attached to junk-siteArea units`);
      }
    } else {
      report.step3_junkSiteAreaFound = 0;
      console.log("   ✅ No junk siteArea in UnitProduksi.");
    }

    // ── 4. Bersihkan cache ──────────────────────────────────────────────────────
    cacheClearPrefix("po:");
    cacheClearPrefix("po_total:");
    cacheClearPrefix("po_stats:");
    cacheClearPrefix("unit_produksi:");
    console.log("   ✅ Caches cleared.");

    report.status = "SUCCESS";
    console.log("✅ [CLEANUP] ALL DONE.", report);

    return NextResponse.json({
      success: true,
      message: "Database cleanup complete. Lihat 'report' untuk detail.",
      report,
    });
  } catch (error) {
    console.error("❌ [CLEANUP] FAILED:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg, report }, { status: 500 });
  }
}
