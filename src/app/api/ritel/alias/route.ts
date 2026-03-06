import { NextResponse } from "next/server";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return "Gagal memproses alias ritel";
}

export async function PATCH(request: Request) {
  try {
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const { namaPt, inisial, newInisial } = body as {
      namaPt?: string;
      inisial?: string;
      newInisial?: string;
    };
    if (!namaPt || inisial == null || !newInisial) {
      return NextResponse.json(
        { error: "namaPt, inisial, dan newInisial wajib diisi" },
        { status: 400 },
      );
    }
    await prisma.ritelModern.updateMany({
      where: {
        namaPt: { equals: namaPt, mode: "insensitive" },
        inisial,
      },
      data: {
        inisial: newInisial,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/ritel/alias error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
