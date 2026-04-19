import { NextResponse } from "next/server"; // Re-sync build
import prisma from "@/lib/prisma";

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
      if (ritel) {
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
      const rawGrouped = await prisma.ritelModern.findMany({
        where: {
          Promos: { some: {} }
        },
        include: {
          _count: {
            select: { Promos: true }
          }
        },
        orderBy: { namaPt: "asc" }
      });

      // Aggregating by namaPt to avoid duplicates in the UI cards
      const aggregated: any[] = [];
      const seenNames = new Map();

      for (const item of rawGrouped) {
        const name = item.namaPt.trim().toUpperCase();
        if (seenNames.has(name)) {
          const existing = seenNames.get(name);
          existing._count.Promos += item._count.Promos;
        } else {
          seenNames.set(name, item);
          aggregated.push(item);
        }
      }

      return NextResponse.json({ isGrouped: true, data: aggregated });
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
    const { nomor, linkDocs, kegiatan, periode, tanggal, dpp, ppn } = body;

    if (!nomor || !kegiatan || !periode || !tanggal || dpp === undefined || ppn === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const calculatedTotal = Number(dpp) + Number(ppn);

    // Use our custom short ID
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
        total: calculatedTotal,
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
    const { id, nomor, linkDocs, kegiatan, periode, tanggal, dpp, ppn } = body;

    if (!id || !nomor || !kegiatan || !periode || !tanggal || dpp === undefined || ppn === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const calculatedTotal = Number(dpp) + Number(ppn);

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
        total: calculatedTotal,
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
      const ritel = await prisma.ritelModern.findUnique({ where: { id: ritelId } });
      
      // Prisma deleteMany does NOT support nested relation filters. 
      // We must fetch the IDs of all retailers with the same name first.
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
