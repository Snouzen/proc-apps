import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";

// ── GET: Fetch Realisasi Records ──────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth || auth.role !== "pusat") {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Role Pusat." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const tanggal = searchParams.get("tanggal");

    // 1. Single Record by ID
    if (id) {
      const record = await prisma.realisasiPemenuhan.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { urutan: "asc" },
          },
        },
      });
      if (!record) {
        return NextResponse.json(
          { error: "Data realisasi tidak ditemukan" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, data: record });
    }

    // 2. Single Record by Tanggal
    if (tanggal) {
      const startOfDay = new Date(tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(tanggal);
      endOfDay.setHours(23, 59, 59, 999);

      const record = await prisma.realisasiPemenuhan.findFirst({
        where: {
          tanggal: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          items: {
            orderBy: { urutan: "asc" },
          },
        },
      });
      return NextResponse.json({ ok: true, data: record });
    }

    // 3. List All Records (Sorted newest first)
    const records = await prisma.realisasiPemenuhan.findMany({
      orderBy: { tanggal: "desc" },
      include: {
        items: {
          orderBy: { urutan: "asc" },
        },
      },
    });

    return NextResponse.json({ ok: true, data: records });
  } catch (error: any) {
    console.error("[API Realisasi GET] Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data realisasi: " + error.message },
      { status: 500 }
    );
  }
}

// ── POST: Create or Update Realisasi Record ──────────────────────────────────
export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth || auth.role !== "pusat") {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Role Pusat." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { id, tanggal, judul, subjudul, sumberCatatan, items } = body;

    if (!tanggal) {
      return NextResponse.json(
        { error: "Tanggal realisasi wajib diisi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 data ritel wajib diisi." },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return NextResponse.json(
        { error: "Maksimal 100 mitra ritel yang dapat diinput." },
        { status: 400 }
      );
    }

    const tglDate = new Date(tanggal);

    // Business Rule: Dalam 1 hari hanya diperbolehkan 1 laporan
    const startOfDay = new Date(tglDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tglDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSameDay = await prisma.realisasiPemenuhan.findFirst({
      where: {
        tanggal: {
          gte: new Date(startOfDay.getTime() - 4 * 3600 * 1000),
          lte: new Date(endOfDay.getTime() + 4 * 3600 * 1000),
        },
        ...(id ? { NOT: { id } } : {}),
      },
      select: { id: true, tanggal: true },
    });

    if (existingSameDay) {
      return NextResponse.json(
        {
          error:
            "Laporan untuk tanggal ini sudah ada. Dalam 1 hari hanya boleh ada 1 laporan. Silakan gunakan fitur Edit Data jika ingin mengubah rekapan.",
        },
        { status: 400 }
      );
    }

    const totalRealisasiKg = items.reduce(
      (sum: number, it: any) => sum + Number(it.volumeKg || 0),
      0
    );

    // Format clean items payload
    const formattedItems = items.map((it: any, index: number) => ({
      ritelId: it.ritelId || null,
      companyName: it.companyName?.trim() || null,
      provinsi: it.provinsi?.trim() || null,
      namaRitel: it.namaRitel?.trim() || "RITEL",
      logoUrl: it.logoUrl || null,
      volumeKg: Number(it.volumeKg || 0),
      urutan: typeof it.urutan === "number" ? it.urutan : index,
    }));

    let result;

    if (id) {
      // Update existing record
      result = await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.realisasiPemenuhanItem.deleteMany({
          where: { realisasiId: id },
        });

        // Update header and insert new items
        return await tx.realisasiPemenuhan.update({
          where: { id },
          data: {
            tanggal: tglDate,
            judul: judul || "PROGRES PEMENUHAN RITEL MODERN",
            subjudul: subjudul || null,
            sumberCatatan: sumberCatatan || null,
            totalRealisasiKg,
            createdBy: auth.email || "pusat",
            items: {
              create: formattedItems,
            },
          },
          include: {
            items: {
              orderBy: { urutan: "asc" },
            },
          },
        });
      });
    } else {
      // Create new record
      result = await prisma.realisasiPemenuhan.create({
        data: {
          tanggal: tglDate,
          judul: judul || "PROGRES PEMENUHAN RITEL MODERN",
          subjudul: subjudul || null,
          sumberCatatan: sumberCatatan || null,
          totalRealisasiKg,
          createdBy: auth.email || "pusat",
          items: {
            create: formattedItems,
          },
        },
        include: {
          items: {
            orderBy: { urutan: "asc" },
          },
        },
      });
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[API Realisasi POST] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data realisasi: " + error.message },
      { status: 500 }
    );
  }
}

// ── DELETE: Remove Realisasi Record ──────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth || auth.role !== "pusat") {
      return NextResponse.json(
        { error: "Akses ditolak. Khusus Role Pusat." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID realisasi wajib diisi." },
        { status: 400 }
      );
    }

    await prisma.realisasiPemenuhan.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Rekapan berhasil dihapus." });
  } catch (error: any) {
    console.error("[API Realisasi DELETE] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data realisasi: " + error.message },
      { status: 500 }
    );
  }
}
