import db from "@/lib/prisma"; // gunakan prisma singleton
import { NextResponse } from "next/server";
import {
  cacheClearPrefix,
  cacheGet,
  cacheSet,
  singleFlight,
} from "@/lib/ttl-cache";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const cacheKey = "unit_produksi:list";
  const cached = cacheGet<any>(cacheKey);
  try {
    const data = await singleFlight(cacheKey, () =>
      db.unitProduksi.findMany({
        // [PERF] Only select fields needed by the client
        select: { idRegional: true, namaRegional: true, siteArea: true, createdAt: true, updatedAt: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    );
    cacheSet(cacheKey, data, 15000);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/unit-produksi error:", error);
    if (cached) return NextResponse.json(cached);
    // Jangan pecahkan UI di sisi client: kembalikan array kosong
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Destructuring sesuai apa yang dikirim frontend (page.tsx)
    let { regional, siteArea } = body;
    if (!regional || siteArea === undefined || siteArea === null) {
      return NextResponse.json(
        { error: "regional wajib diisi. siteArea boleh kosong." },
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

    // --- AUTO-PROVISIONING PIC ACCOUNT ---
    try {
      const rawSiteArea = siteArea || "";
      const formattedAlias = rawSiteArea.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (formattedAlias) {
        const email = `${formattedAlias}@bulog.co.id`;
        const password = process.env.DEFAULT_PIC_PASSWORD || "password";

        // 1. Check/Create in Supabase Auth via Admin client
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { role: "pic_site", regional: regional, siteArea: siteArea }
        });

        // Error code 'email_exists' is fine, we just want to ensure it's there
        if (authError && (authError as any).code !== "email_exists") {
          console.error("Supabase Auth provisioning failed:", authError.message);
        }

        // 2. Sync to local Prisma User table (Upsert)
        await db.user.upsert({
          where: { email: email },
          update: {
            role: "pic_site",
            regional: regional,
            siteArea: siteArea,
            updatedAt: new Date()
          },
          create: {
            email: email,
            role: "pic_site",
            regional: regional,
            siteArea: siteArea
          }
        });
      }
    } catch (provisionErr) {
      // Don't break the main transaction if provisioning fails, but log it
      console.error("PIC Account provisioning error (non-fatal):", provisionErr);
    }
    // -------------------------------------

    cacheClearPrefix("unit_produksi:");
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

// [REST] DELETE reads identifiers from URL searchParams, not request body
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const namaRegional = searchParams.get("namaRegional") || undefined;
    const siteArea = searchParams.get("siteArea") || undefined;
    if (!namaRegional && !siteArea) {
      return NextResponse.json(
        { error: "Minimal sertakan namaRegional atau siteArea sebagai query param" },
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
      cacheClearPrefix("unit_produksi:");
      return NextResponse.json({ ok: true });
    }
    // Jika hanya namaRegional: hapus semua site di regional tsb
    try {
      await db.unitProduksi.deleteMany({
        where: { namaRegional: namaRegional! },
      });
      cacheClearPrefix("unit_produksi:");
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
    cacheClearPrefix("unit_produksi:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/unit-produksi error:", error);
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
