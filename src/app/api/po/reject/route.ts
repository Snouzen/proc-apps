import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheClearPrefix } from "@/lib/ttl-cache";
import { getSession, getProfileName } from "@/lib/auth";
import { auditUpdatePO } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const remarks: string | undefined = body?.remarks;

    if (!id) {
      return NextResponse.json({ error: "id PO wajib diisi" }, { status: 400 });
    }

    const po = await auditUpdatePO(prisma as any, { id }, {
      statusPo: false,        // Balik ke antrean kebutuhan penetapan unit
      unitProduksiId: "UNKNOWN", // Reset ke unit dummy agar tidak terdeteksi milik site area manapun
      remarks: remarks || null, // Simpan alasan reject
      updatedAt: new Date(),
    }, { id: (session as any)?.user?.id || "unknown", name: getProfileName(session) });

    console.log(`[REJECT PO] Success: ${po.noPo} (ID: ${po.id})`);

    // Invalidation: Clear cache agar stats dan list di dashboard/schedule update
    cacheClearPrefix("po_stats:");
    cacheClearPrefix("po:");

    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    console.error("Reject PO API Error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
