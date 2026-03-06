import db from "@/lib/db"; // Sesuaikan dengan path prisma lu
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await db.unitProduksi.findMany({
      orderBy: { namaRegional: "asc" },
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/unit-produksi error:", error);
    // Jangan pecahkan UI di sisi client: kembalikan array kosong
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Destructuring sesuai apa yang dikirim frontend (page.tsx)
    let { regional, siteArea } = body;
    if (!regional || !siteArea) {
      return NextResponse.json(
        { error: "regional dan siteArea wajib diisi" },
        { status: 400 },
      );
    }
    // Normalisasi ringan di sisi server untuk robustness
    const v = String(regional).trim().toLowerCase();
    if (v.includes("bandung") || v.includes("reg 1") || /\b1\b/.test(v)) {
      regional = "REG 1 BANDUNG";
    } else if (
      v.includes("surabaya") ||
      v.includes("reg 2") ||
      /\b2\b/.test(v)
    ) {
      regional = "REG 2 SURABAYA";
    } else if (
      v.includes("makassar") ||
      v.includes("reg 3") ||
      /\b3\b/.test(v)
    ) {
      regional = "REG 3 MAKASSAR";
    } else {
      regional = String(regional).trim();
    }
    siteArea = String(siteArea).trim();

    const newUnit = await db.unitProduksi.create({
      data: {
        namaRegional: regional, // Petakan ke nama kolom prisma lu
        siteArea: siteArea,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newUnit);
  } catch (error) {
    // Tangani duplicate unique constraint (jika ada index unik di DB)
    const code = (error as any)?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { status: "duplicate_ignored" },
        { status: 201 },
      );
    }
    console.error("POST /api/unit-produksi error:", error);
    let msg = "Gagal simpan data";
    if ((error as any)?.message) msg = String((error as any).message);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { namaRegional, siteArea } = body as {
      namaRegional?: string;
      siteArea?: string;
    };
    if (!namaRegional && !siteArea) {
      return NextResponse.json(
        { error: "Minimal sertakan namaRegional atau siteArea" },
        { status: 400 },
      );
    }
    // Jika siteArea diberikan, hapus spesifik site pada regional (jika diisi)
    if (siteArea) {
      await db.unitProduksi.deleteMany({
        where: {
          AND: [namaRegional ? { namaRegional } : {}, { siteArea }] as any,
        },
      });
      return NextResponse.json({ ok: true });
    }
    // Jika hanya namaRegional: hapus semua site di regional tsb
    try {
      await db.unitProduksi.deleteMany({
        where: { namaRegional: namaRegional! },
      });
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      // Foreign key constraint (terpakai di PO)
      if (e?.code === "P2003") {
        return NextResponse.json(
          { error: "Tidak bisa hapus: regional ini terpakai pada PO" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("DELETE /api/unit-produksi error:", error);
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { namaRegional, siteArea, newSiteArea } = body as {
      namaRegional?: string;
      siteArea?: string;
      newSiteArea?: string;
    };
    if (!namaRegional || !siteArea || !newSiteArea) {
      return NextResponse.json(
        { error: "namaRegional, siteArea, dan newSiteArea wajib diisi" },
        { status: 400 },
      );
    }
    await db.unitProduksi.updateMany({
      where: { namaRegional, siteArea },
      data: { siteArea: String(newSiteArea).trim(), updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/unit-produksi error:", error);
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
