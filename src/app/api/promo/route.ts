import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { namaPromo, nominal } = body;

    if (!namaPromo || nominal === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const promo = await prisma.promo.create({
      data: {
        namaPromo,
        nominal: Number(nominal),
      },
    });

    return NextResponse.json({ data: promo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create promo" }, { status: 500 });
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
