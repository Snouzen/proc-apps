import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cacheClearPrefix } from "@/lib/ttl-cache";

import { getErrorMessage } from "@/lib/utils/error";

export async function PATCH(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    cacheClearPrefix("ritel:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/ritel/alias error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
