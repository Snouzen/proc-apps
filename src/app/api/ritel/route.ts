import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  cacheClearPrefix,
  cacheGet,
  cacheSet,
  singleFlight,
} from "@/lib/ttl-cache";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return "Gagal mengambil data ritel";
}

export async function GET(request: Request) {
  const cacheKey = `ritel:${request.url}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const payload = await singleFlight(cacheKey, async () => {
      const { default: prisma } = await import("@/lib/db");
      const { searchParams } = new URL(request.url);
      const limitRaw = searchParams.get("limit");
      const offsetRaw = searchParams.get("offset");
      const limit =
        limitRaw == null
          ? null
          : Math.max(1, Math.min(5000, Number(limitRaw) || 0));
      const offset =
        offsetRaw == null ? null : Math.max(0, Number(offsetRaw) || 0);
      const paged = limit != null || offset != null;
      const q = (searchParams.get("q") || "").trim();
      const where = q
        ? {
            OR: [
              { namaPt: { contains: q, mode: "insensitive" as const } },
              { inisial: { contains: q, mode: "insensitive" as const } },
              { tujuan: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined;

      const [total, data] = paged
        ? await prisma.$transaction([
            prisma.ritelModern.count({ where }),
            prisma.ritelModern.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: limit ?? 50,
              skip: offset ?? 0,
            }),
          ])
        : [
            null,
            await prisma.ritelModern.findMany({
              where,
              orderBy: { createdAt: "desc" },
            }),
          ];

      const out = paged
        ? {
            total: total ?? (Array.isArray(data) ? data.length : 0),
            data,
            limit: limit ?? 50,
            offset: offset ?? 0,
          }
        : data;
      cacheSet(cacheKey, out, 15000);
      return out;
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    console.error("GET /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const { namaPt, inisial, tujuan } = body;
    if (!namaPt) {
      return NextResponse.json(
        { error: "namaPt wajib diisi" },
        { status: 400 },
      );
    }
    const result = await prisma.ritelModern.create({
      data: {
        id: randomUUID(),
        namaPt,
        inisial: inisial ?? null,
        tujuan: tujuan ?? null,
        updatedAt: new Date(),
      },
    });
    cacheClearPrefix("ritel:");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const { id, namaPt, inisial, newInisial, logoPt, logoInisial } = body as { 
      id?: string; 
      namaPt?: string; 
      inisial?: string; 
      newInisial?: string;
      logoPt?: string;
      logoInisial?: string;
    };

    if (!namaPt) {
      return NextResponse.json({ error: "namaPt wajib diisi" }, { status: 400 });
    }

    // 1. Update logoPt untuk SEMUA baris dengan namaPt yang sama
    if (logoPt !== undefined) {
      await prisma.ritelModern.updateMany({
        where: { namaPt: { equals: namaPt, mode: "insensitive" } },
        data: { logoPt: logoPt || null, updatedAt: new Date() },
      });
    }

    // 2. Update inisial & logoInisial untuk baris yang spesifik
    const targetInisial = newInisial !== undefined ? newInisial : (inisial !== undefined ? inisial : undefined);
    
    if (targetInisial !== undefined || logoInisial !== undefined) {
      const whereClause: any = { namaPt: { equals: namaPt, mode: "insensitive" } };
      
      // Jika kita mengupdate inisial, kita harus tau inisial MANA yang mau diubah
      if (inisial !== undefined) {
        if (inisial === null) {
          whereClause.inisial = null;
        } else {
          whereClause.inisial = { equals: inisial, mode: "insensitive" };
        }
      }

      const updateData: any = { updatedAt: new Date() };
      if (targetInisial !== undefined) updateData.inisial = targetInisial || null;
      if (logoInisial !== undefined) updateData.logoInisial = logoInisial || null;

      const result = await prisma.ritelModern.updateMany({
        where: whereClause,
        data: updateData,
      });
      console.log(`PATCH Ritel: Updated ${result.count} rows for inisial ${inisial}`);
    }

    cacheClearPrefix("ritel:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const { id, tujuan } = body as { id?: string; tujuan?: string };
    if (!id || !tujuan) {
      return NextResponse.json(
        { error: "id dan tujuan wajib diisi" },
        { status: 400 },
      );
    }
    await prisma.ritelModern.update({
      where: { id },
      data: { tujuan: String(tujuan).trim(), updatedAt: new Date() },
    });
    cacheClearPrefix("ritel:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// [REST] DELETE extracts identifiers from URL searchParams, not request body
export async function DELETE(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const namaPt = searchParams.get("namaPt") || undefined;
    const id = searchParams.get("id") || undefined;
    if (!namaPt && !id) {
      return NextResponse.json(
        { error: "namaPt atau id wajib disertakan sebagai query param" },
        { status: 400 },
      );
    }
    if (id) {
      await prisma.ritelModern.delete({ where: { id } });
      cacheClearPrefix("ritel:");
      return NextResponse.json({ ok: true });
    }
    await prisma.ritelModern.deleteMany({
      where: { namaPt: { equals: namaPt!, mode: "insensitive" } },
    });
    cacheClearPrefix("ritel:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
