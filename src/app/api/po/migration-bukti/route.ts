import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * MIGRATION API (TEMPORARY)
 * Objective: Initialize buktiTagih and buktiBayar fields for all existing POs.
 * Setting them to null for consistency with the new Prisma schema.
 */

export async function GET() {
  try {
    console.log("🚀 Starting migration for buktiTagih and buktiBayar...");

    const result = await prisma.purchaseOrder.updateMany({
      data: {
        buktiTagih: null,
        buktiBayar: null,
      },
    });

    console.log(`✅ Migration complete. Updated ${result.count} POs.`);

    return NextResponse.json({
      success: true,
      message: `Migration complete. Updated ${result.count} records.`,
      count: result.count
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: msg 
    }, { status: 500 });
  }
}
