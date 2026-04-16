import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * API Khusus untuk menormalkan data rtvCn yang salah tipe (Number vs String) di database.
 * Panggil URL ini sekali: /api/debug/retur/normalize
 */
export async function GET() {
  try {
    // 1. Ambil semua data retur
    const allRetur = await prisma.dataRetur.findMany({
      select: { id: true, rtvCn: true }
    });

    let fixedCount = 0;

    // 2. Iterasi dan paksa conversion ke string
    for (const item of allRetur) {
      if (item.rtvCn !== null && typeof item.rtvCn !== "string") {
        await prisma.dataRetur.update({
          where: { id: item.id },
          data: {
            rtvCn: String(item.rtvCn).trim()
          }
        });
        fixedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Normalisasi data retur selesai",
      totalChecked: allRetur.length,
      totalFixed: fixedCount
    });
  } catch (error: any) {
    console.error("Normalization Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
