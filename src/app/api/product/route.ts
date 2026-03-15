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

export async function GET() {
  try {
    const data =
      (await prisma.$queryRawUnsafe(
        `SELECT id, name, "satuanKg", "createdAt", "updatedAt" FROM "Product" ORDER BY "createdAt" DESC`,
      )) || [];
    return NextResponse.json(data);
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
    const dup: Array<{ id: string; name: string }> =
      (await prisma.$queryRawUnsafe(
        `SELECT id, name FROM "Product"
         WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') = $1
         ORDER BY "createdAt" ASC
         LIMIT 1`,
        key,
      )) as any;
    const firstDup = Array.isArray(dup) ? dup[0] : null;
    if (firstDup && String(firstDup.name) !== name) {
      return NextResponse.json(
        { error: `Produk sudah ada: ${String(firstDup.name)}` },
        { status: 409 },
      );
    }
    let result: any = null;
    try {
      result = await prisma.product.upsert({
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
    } catch (e: any) {
      const msg = String(e?.message || "");
      const unknownArg =
        msg.includes("Unknown argument `satuanKg`") ||
        msg.includes("Unknown arg `satuanKg`");
      if (!unknownArg) throw e;
      result = await prisma.product.upsert({
        where: { name },
        update: {
          name,
          updatedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          name,
          updatedAt: new Date(),
        },
      });
      if (Number.isFinite(satuanKg as number)) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Product" SET "satuanKg" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          satuanKg,
          result.id,
        );
      }
    }
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
    const name = nameRaw === undefined ? undefined : canonicalProductName(nameRaw);
    if (!id && !name) {
      return NextResponse.json(
        { error: "Wajib menyertakan id atau name" },
        { status: 400 },
      );
    }
    if (name && name.trim()) {
      const key = dedupeKey(name);
      const dup: Array<{ id: string; name: string }> =
        (await prisma.$queryRawUnsafe(
          `SELECT id, name FROM "Product"
           WHERE regexp_replace(upper(name), '[^A-Z0-9]', '', 'g') = $1
           ORDER BY "createdAt" ASC
           LIMIT 1`,
          key,
        )) as any;
      const firstDup = Array.isArray(dup) ? dup[0] : null;
      if (firstDup && String(firstDup.id) !== String(id || "")) {
        return NextResponse.json(
          { error: `Produk sudah ada: ${String(firstDup.name)}` },
          { status: 409 },
        );
      }
    }
    const where: any = id ? { id } : { name: name as string };
    let updated: any = null;
    try {
      updated = await prisma.product.update({
        where,
        data: {
          ...(name ? { name } : {}),
          ...(Number.isFinite(satuanKg as number)
            ? { satuanKg: satuanKg as number }
            : {}),
          updatedAt: new Date(),
        },
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      const unknownArg =
        msg.includes("Unknown argument `satuanKg`") ||
        msg.includes("Unknown arg `satuanKg`");
      if (!unknownArg) throw e;
      updated = await prisma.product.update({
        where,
        data: {
          ...(name ? { name } : {}),
          updatedAt: new Date(),
        },
      });
      if (Number.isFinite(satuanKg as number)) {
        await prisma.$executeRawUnsafe(
          `UPDATE "Product" SET "satuanKg" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
          satuanKg,
          updated.id,
        );
      }
    }
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
