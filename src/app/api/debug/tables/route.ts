import { NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * GET /api/debug/tables
 * Menampilkan daftar tabel di schema public.
 * Panggil sekali untuk cek nama tabel yang ada, lalu sesuaikan @@map di schema Prisma.
 * Hapus atau nonaktifkan route ini di production.
 */
export async function GET() {
  try {
    const result = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    return NextResponse.json({
      tables: result.map((r: { table_name: string }) => r.table_name),
    });
  } catch (error) {
    console.error("GET /api/debug/tables error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
