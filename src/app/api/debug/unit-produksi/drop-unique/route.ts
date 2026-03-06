import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production" },
        { status: 403 },
      );
    }

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT indexname, indexdef, tablename
       FROM pg_indexes
       WHERE schemaname='public'
         AND tablename IN ('UnitProduksi','unitproduksi','unit_produksi')
         AND indexdef ILIKE '%UNIQUE%'
         AND (indexdef ILIKE '%("namaRegional")%' OR indexdef ILIKE '%(namaregional)%')`,
    )) as Array<{ indexname: string; indexdef: string; tablename: string }>;

    const dropped: string[] = [];
    for (const r of rows) {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${r.indexname}"`);
      dropped.push(r.indexname);
    }

    return NextResponse.json({ dropped });
  } catch (error) {
    console.error("drop-unique error:", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production" },
        { status: 403 },
      );
    }

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT indexname, indexdef, tablename
       FROM pg_indexes
       WHERE schemaname='public'
         AND tablename IN ('UnitProduksi','unitproduksi','unit_produksi')
         AND indexdef ILIKE '%UNIQUE%'
         AND (indexdef ILIKE '%("namaRegional")%' OR indexdef ILIKE '%(namaregional)%')`,
    )) as Array<{ indexname: string; indexdef: string; tablename: string }>;

    const dropped: string[] = [];
    for (const r of rows) {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${r.indexname}"`);
      dropped.push(r.indexname);
    }

    return NextResponse.json({ dropped });
  } catch (error) {
    console.error("drop-unique error:", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
