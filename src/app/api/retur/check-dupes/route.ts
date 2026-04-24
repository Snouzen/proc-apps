import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { rtvCnList } = await request.json();

    if (!Array.isArray(rtvCnList) || rtvCnList.length === 0) {
      return NextResponse.json({ exists: [] });
    }

    // [RBAC] Verify Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const user = verifySession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cari rtvCn yang sudah ada di database
    // Kita ambil uniknya saja
    const normalizedList = rtvCnList.map(n => String(n).trim()).filter(n => !!n);
    
    const existingRecords = await prisma.dataRetur.findMany({
      where: {
        rtvCn: { in: normalizedList }
      },
      select: { rtvCn: true }
    });

    // Kembalikan daftar rtvCn yang ditemukan
    const exists = Array.from(new Set(existingRecords.map(r => r.rtvCn).filter(Boolean)));

    return NextResponse.json({ exists });

  } catch (error: any) {
    console.error("POST /api/retur/check-dupes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
