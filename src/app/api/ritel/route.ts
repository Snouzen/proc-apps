import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return "Gagal mengambil data ritel";
}

export async function GET() {
  try {
    const { default: prisma } = await import("@/lib/db");
    const data = await prisma.ritelModern.findMany({
      orderBy: { createdAt: "desc" },
    });
    const norm = (s: unknown) =>
      String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const inisialUsed = new Set(
      data
        .map((r: any) => ({ namaPt: r?.namaPt, inisial: r?.inisial }))
        .filter((r: any) => r?.inisial && norm(r.inisial) !== norm(r.namaPt))
        .map((r: any) => norm(r.inisial)),
    );
    const cleaned = data.filter((r: any) => {
      const nama = norm(r?.namaPt);
      if (!nama) return false;
      return !inisialUsed.has(nama);
    });
    return NextResponse.json(cleaned);
  } catch (error) {
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
      return NextResponse.json({ ok: true });
    }
    await prisma.ritelModern.deleteMany({
      where: { namaPt: { equals: namaPt!, mode: "insensitive" } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
