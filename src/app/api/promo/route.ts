import { NextResponse } from "next/server"; // Re-sync build
import prisma from "@/lib/prisma";
import { PromoCreateSchema, PromoUpdateSchema, PromoBatchSchema } from "@/lib/schemas/master-data";

// Helper for ultra short unique ID (6 chars)
function generateShortId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(request: Request) {
  try {
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
        where: whereCondition,
        include: { RitelModern: true },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json({ isGrouped: false, data: promos });
    }
    
    // Grouped Mode: Return retailers that have promos, deduplicated by name
    if (!ritelId) {
      const allPromos = await prisma.promo.findMany({
        include: { RitelModern: true }
      });

      const aggregatedMap = new Map<string, any>();
      let uncategorizedCount = 0;

      for (const p of allPromos) {
        if (!p.ritelId) {
          uncategorizedCount++;
          continue;
        }

        const name = p.RitelModern?.namaPt.trim().toUpperCase() || "UNKNOWN";
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
      const records = body.map((item: any) => {
        const dpp = Number(item.dpp || 0);
        const ppn = Number(item.ppn || 0);
        const pph = Number(item.pph || 0);
        const total = dpp + ppn;

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
    const { nomor, linkDocs, kegiatan, periode, tanggal, dpp, ppn, pph, linkFP, remarks } = parsed.data;

    const calculatedTotal = Number(dpp) + Number(ppn || 0);

    const promo = await prisma.promo.create({
      data: {
        id: generateShortId(), 
        nomor,
        linkDocs: linkDocs || null,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp: Number(dpp),
        ppn: Number(ppn),
        pph: Number(pph || 0),
        total: calculatedTotal,
        linkFP: linkFP || null,
        remarks: remarks || null,
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
    const body = await request.json();
    const parsed = PromoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { id, nomor, linkDocs, kegiatan, periode, tanggal, dpp, ppn, pph, linkFP, remarks } = parsed.data;

    const calculatedTotal = Number(dpp) + Number(ppn || 0);

    const promo = await prisma.promo.update({
      where: { id },
      data: {
        nomor,
        linkDocs: linkDocs || null,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp: Number(dpp),
        ppn: Number(ppn),
        pph: Number(pph || 0),
        total: calculatedTotal,
        linkFP: linkFP || null,
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
