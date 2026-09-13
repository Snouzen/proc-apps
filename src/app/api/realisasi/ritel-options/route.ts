import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth || auth.role !== "pusat") {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Role Pusat." },
        { status: 403 }
      );
    }

    const ritels = await prisma.ritelModern.findMany({
      select: {
        id: true,
        namaPt: true,
        provinsi: true,
        inisial: true,
        tujuan: true,
        logoPt: true,
        logoInisial: true,
      },
      orderBy: [{ namaPt: "asc" }, { inisial: "asc" }],
    });

    // Group and deduplicate by (namaPt + inisial) so each retail format only appears once
    const map = new Map<string, {
      id: string;
      namaPt: string;
      inisial: string;
      provinsi: string | null;
      logoUrl: string | null;
      provinces: string[];
    }>();

    for (const r of ritels) {
      const namaPt = r.namaPt.trim();
      const inisial = (r.inisial?.trim() || namaPt);
      const key = `${namaPt.toLowerCase()}___${inisial.toLowerCase()}`;
      const prov = r.provinsi?.trim() || null;
      const logo = r.logoInisial || r.logoPt || null;

      if (!map.has(key)) {
        map.set(key, {
          id: r.id,
          namaPt,
          inisial,
          provinsi: prov,
          logoUrl: logo,
          provinces: prov ? [prov] : [],
        });
      } else {
        const item = map.get(key)!;
        if (!item.logoUrl && logo) item.logoUrl = logo;
        if (prov && !item.provinces.includes(prov)) {
          item.provinces.push(prov);
        }
        if (!item.provinsi && prov) {
          item.provinsi = prov;
        }
      }
    }

    const options = Array.from(map.values()).sort((a, b) =>
      a.inisial.localeCompare(b.inisial)
    );

    return NextResponse.json({ ok: true, data: options });
  } catch (error: any) {
    console.error("[API Realisasi Options] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data ritel: " + error.message },
      { status: 500 }
    );
  }
}
