import { NextResponse } from "next/server"; // Re-sync build
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { PromoCreateSchema, PromoUpdateSchema, PromoBatchSchema } from "@/lib/schemas/master-data";

import crypto from "crypto";

// Cryptographically secure unique ID
function generateShortId() {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
}

/** 
 * Standardize currency decimal precision to 2 decimal places using exact decimal half-up rounding.
 * Uses Prisma.Decimal with explicit ROUND_HALF_UP mode to eliminate floating-point representation bugs
 * (e.g. 10.075 -> 10.08, 1.005 -> 1.01, -1.005 -> -1.01, 0.0000001 -> 0).
 */
function roundCurrency(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  try {
    const str = typeof val === "number" ? val.toString() : String(val).trim();
    if (str === "") return 0;
    const d = new Prisma.Decimal(str);
    if (!d.isFinite()) return 0;
    if (d.abs().lt(0.005)) return 0;
    return parseFloat(d.toFixed(2, Prisma.Decimal.ROUND_HALF_UP));
  } catch {
    return 0;
  }
}

/**
 * Exact decimal addition with half-up rounding to 2 decimal places.
 */
function sumCurrency(a: number | string | null | undefined, b: number | string | null | undefined): number {
  try {
    const strA = typeof a === "number" ? a.toString() : String(a || 0).trim();
    const strB = typeof b === "number" ? b.toString() : String(b || 0).trim();
    const decA = new Prisma.Decimal(strA || 0);
    const decB = new Prisma.Decimal(strB || 0);
    const sum = decA.plus(decB);
    if (!sum.isFinite() || sum.abs().lt(0.005)) return 0;
    return parseFloat(sum.toFixed(2, Prisma.Decimal.ROUND_HALF_UP));
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canView = await hasPermission(safeRole, "m_promo_view");
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat data promo (m_promo_view)." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ritelId = searchParams.get("ritelId");
    const mode = searchParams.get("mode"); // 'list' or 'grouped'

    // Building the where condition based on ritelId (supporting name-based aggregation)
    const ritel = ritelId ? await prisma.ritelModern.findUnique({ where: { id: ritelId } }) : null;
    let whereCondition: any = {};
    if (ritelId) {
      if (ritelId === "uncategorized") {
        whereCondition = { ritelId: null };
      } else if (ritel) {
        whereCondition = { RitelModern: { namaPt: { equals: ritel.namaPt, mode: 'insensitive' as any } } };
      } else {
        whereCondition = { ritelId };
      }
    }

    // Flat list mode: Return promos for search (respects filtering)
    if (mode === "list") {
      const promos = await prisma.promo.findMany({
        take: 5000,
        where: whereCondition,
        include: { RitelModern: true },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json({ isGrouped: false, data: promos });
    }
    
    // Grouped Mode: Return retailers that have promos, deduplicated by name
    if (!ritelId) {
      const allPromos = await prisma.promo.findMany({
        take: 5000,
        include: { RitelModern: true }
      });

      const aggregatedMap = new Map<string, any>();
      let uncategorizedCount = 0;

      for (const p of allPromos) {
        if (!p.ritelId) {
          uncategorizedCount++;
          continue;
        }

        const name = p.RitelModern?.namaPt?.trim().toUpperCase() || "UNKNOWN";
        if (aggregatedMap.has(name)) {
          aggregatedMap.get(name)._count.Promos++;
        } else {
          aggregatedMap.set(name, {
            ...p.RitelModern,
            _count: { Promos: 1 }
          });
        }
      }

      const result = Array.from(aggregatedMap.values());
      if (uncategorizedCount > 0) {
        result.push({
          id: "uncategorized",
          namaPt: "Tidak Terkategori",
          inisial: "???",
          tujuan: "Multiple",
          _count: { Promos: uncategorizedCount }
        });
      }

      return NextResponse.json({ isGrouped: true, data: result });
    }

    // Detail Mode: Fetch promos using the pre-built whereCondition
    const promos = await prisma.promo.findMany({
      where: whereCondition,
      include: { RitelModern: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ isGrouped: false, data: promos });
  } catch (error: any) {
    console.error("GET /api/promo error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch promos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canCreate = await hasPermission(safeRole, "m_promo_add");
    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menambah promo (m_promo_add)." },
        { status: 403 }
      );
    }
    const body = await request.json();

    // Support Batch Upload
    if (Array.isArray(body)) {
      const parsed = PromoBatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues.map((i) => i.message).join(", ") },
          { status: 400 },
        );
      }
      const records = parsed.data.map((item) => {
        const dpp = roundCurrency(item.dpp);
        const ppn = roundCurrency(item.ppn);
        const pph = roundCurrency(item.pph);
        const total = sumCurrency(dpp, ppn);

        return {
          id: generateShortId(),
          nomor: String(item.nomor || ""),
          linkDocs: item.linkDocs || null,
          kegiatan: item.kegiatan || "Lain-Lain",
          periode: item.periode || "Januari",
          tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
          dpp,
          ppn,
          pph,
          total,
          linkFP: item.linkFP || null,
          remarks: item.remarks || null,
          ritelId: item.ritelId || null,
        };
      });

      const count = await prisma.promo.createMany({
        data: records,
        skipDuplicates: true,
      });

      return NextResponse.json({ success: true, count: count.count });
    }

    const parsed = PromoCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { nomor, linkDocs, kegiatan, periode, tanggal } = parsed.data;

    const dpp = roundCurrency(parsed.data.dpp);
    const ppn = roundCurrency(parsed.data.ppn);
    const pph = roundCurrency(parsed.data.pph);
    const calculatedTotal = sumCurrency(dpp, ppn);

    const promo = await prisma.promo.create({
      data: {
        id: generateShortId(), 
        nomor,
        linkDocs: linkDocs || null,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp,
        ppn,
        pph,
        total: calculatedTotal,
        linkFP: parsed.data.linkFP || null,
        remarks: parsed.data.remarks || null,
        ritelId: body.ritelId || null,
      },
    });

    return NextResponse.json({ data: promo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create promo" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canEdit = await hasPermission(safeRole, "m_promo_edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengubah promo (m_promo_edit)." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = PromoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { id, nomor, linkDocs, kegiatan, periode, tanggal } = parsed.data;

    const dpp = roundCurrency(parsed.data.dpp);
    const ppn = roundCurrency(parsed.data.ppn);
    const pph = roundCurrency(parsed.data.pph);
    const calculatedTotal = sumCurrency(dpp, ppn);

    const promo = await prisma.promo.update({
      where: { id },
      data: {
        nomor,
        linkDocs: linkDocs || null,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp,
        ppn,
        pph,
        total: calculatedTotal,
        linkFP: parsed.data.linkFP || null,
        ritelId: body.ritelId || null,
      },
    });

    return NextResponse.json({ data: promo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update promo" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const deletionAuth = await getSessionWithRole(request);
    if (!deletionAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((deletionAuth.safeRole || deletionAuth.role) !== "pusat") return NextResponse.json({ error: "Hanya Pusat yang boleh menghapus data" }, { status: 403 });

    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canDelete = await hasPermission(safeRole, "m_promo_delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menghapus promo (m_promo_delete)." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ritelId = searchParams.get("ritelId");

    if (!id && !ritelId) {
      return NextResponse.json({ error: "ID or ritelId is required" }, { status: 400 });
    }

    if (ritelId) {
      if (ritelId === "uncategorized") {
        await prisma.promo.deleteMany({
          where: { ritelId: null }
        });
        return NextResponse.json({ success: true, message: "Uncategorized promos deleted" });
      }

      const ritel = await prisma.ritelModern.findUnique({ where: { id: ritelId } });
      
      const ritelsWithSameName = await prisma.ritelModern.findMany({
        where: { namaPt: { equals: ritel?.namaPt || "", mode: 'insensitive' as any } },
        select: { id: true }
      });
      const ritelIds = ritelsWithSameName.map(r => r.id);

      await prisma.promo.deleteMany({
        where: { ritelId: { in: ritelIds } }
      });
      return NextResponse.json({ success: true, message: "Promos grouped by ritel deleted" });
    }

    await prisma.promo.delete({
      where: { id: id as string },
    });

    return NextResponse.json({ message: "Promo deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete promo" }, { status: 500 });
  }
}
