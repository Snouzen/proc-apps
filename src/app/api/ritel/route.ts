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
          : Math.max(1, Math.min(500, Number(limitRaw) || 0));
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
    const { namaPt, inisial } = body as { namaPt?: string; inisial?: string };
    if (!namaPt) {
      return NextResponse.json(
        { error: "namaPt wajib diisi" },
        { status: 400 },
      );
    }
    await prisma.ritelModern.updateMany({
      where: { namaPt: { equals: namaPt, mode: "insensitive" } },
      data: { inisial: inisial ?? null, updatedAt: new Date() },
    });
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
export async function DELETE(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json().catch(() => ({}));
    const { namaPt, id } = body as { namaPt?: string; id?: string };
    if (!namaPt && !id) {
      return NextResponse.json(
        { error: "namaPt atau id wajib diisi" },
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
