import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper for ultra short unique ID (6 chars)
function generateShortId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  try {
    const promos = await prisma.promo.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: promos });
  } catch (error: any) {
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
        linkDocs,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp: Number(dpp),
        ppn: Number(ppn),
        total: calculatedTotal,
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
        linkDocs,
        kegiatan,
        periode,
        tanggal: new Date(tanggal),
        dpp: Number(dpp),
        ppn: Number(ppn),
        total: calculatedTotal,
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

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.promo.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Promo deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete promo" }, { status: 500 });
  }
}
