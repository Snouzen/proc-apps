import { NextResponse } from "next/server";

/**
 * GET /api/debug/db
 * Cek koneksi ke database. Buka di browser untuk lihat error persis.
 * Hapus atau nonaktifkan di production.
 */
export async function GET() {
  try {
    const { default: prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, message: "Database terkoneksi." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/debug/db error:", error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
