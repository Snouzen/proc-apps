import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import { canonicalProductName, dedupeKey } from "@/lib/text";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return "Gagal memproses data produk";
}

export async function GET(request: Request) {
  try {
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
      ? { name: { contains: q, mode: "insensitive" as const } }
      : undefined;

    if (!paged) {
      const data = await prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          satuanKg: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(data || []);
    }

    const take = limit ?? 50;
    const skip = offset ?? 0;
    const [total, data] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          satuanKg: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
    ]);
    return NextResponse.json({ total, data, limit: take, offset: skip });
  } catch (error) {
    console.error("GET /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nameRaw: string | undefined = body?.name;
    const satuanKgRaw = body?.satuanKg;
    const satuanKg =
      satuanKgRaw === undefined || satuanKgRaw === null
        ? undefined
        : Number(satuanKgRaw);
    const name = canonicalProductName(nameRaw);
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama produk wajib diisi" },
        { status: 400 },
      );
    }
    const key = dedupeKey(name);
    const token = name.split(/\s+/).filter(Boolean)[0] || name;
    const candidates = await prisma.product.findMany({
      where: { name: { contains: token, mode: "insensitive" } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const firstDup =
      candidates.find((p) => dedupeKey(canonicalProductName(p.name)) === key) ||
      null;
    if (firstDup && String(firstDup.name) !== name) {
      return NextResponse.json(
        { error: `Produk sudah ada: ${String(firstDup.name)}` },
        { status: 409 },
      );
    }
    const result = await prisma.product.upsert({
      where: { name },
      update: {
        name,
        ...(Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        name,
        ...(Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id: string | undefined = body?.id;
    const nameRaw: string | undefined = body?.name;
    const satuanKgRaw = body?.satuanKg;
    const satuanKg =
      satuanKgRaw === undefined || satuanKgRaw === null
        ? undefined
        : Number(satuanKgRaw);
    const name =
      nameRaw === undefined ? undefined : canonicalProductName(nameRaw);
    if (!id && !name) {
      return NextResponse.json(
        { error: "Wajib menyertakan id atau name" },
        { status: 400 },
      );
    }
    if (name && name.trim()) {
      const key = dedupeKey(name);
      const token = name.split(/\s+/).filter(Boolean)[0] || name;
      const candidates = await prisma.product.findMany({
        where: { name: { contains: token, mode: "insensitive" } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      const firstDup =
        candidates.find(
          (p) => dedupeKey(canonicalProductName(p.name)) === key,
        ) || null;
      if (firstDup && String(firstDup.id) !== String(id || "")) {
        return NextResponse.json(
          { error: `Produk sudah ada: ${String(firstDup.name)}` },
          { status: 409 },
        );
      }
    }
    const where: any = id ? { id } : { name: name as string };
    const updated = await prisma.product.update({
      where,
      data: {
        ...(name ? { name } : {}),
        ...(Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id: string | undefined = body?.id;
    if (!id) {
      return NextResponse.json(
        { error: "ID produk wajib diisi" },
        { status: 400 },
      );
    }
    const used = await prisma.purchaseOrderItem.count({
      where: { productId: id },
    });
    if (used > 0) {
      return NextResponse.json(
        { error: `Produk dipakai di ${used} item PO` },
        { status: 400 },
      );
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
