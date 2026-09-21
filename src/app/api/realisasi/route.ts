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

    // 2. Single Record by Tanggal (checks single date or within multi-date rapel)
    if (tanggal) {
      const cleanDateStr = tanggal.split("T")[0];
      const startOfDay = new Date(tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(tanggal);
      endOfDay.setHours(23, 59, 59, 999);

      const record = await prisma.realisasiPemenuhan.findFirst({
        where: {
          OR: [
            {
              tanggal: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            {
              daftarTanggal: {
                has: cleanDateStr,
              },
            },
          ],
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
    const {
      id,
      tanggal,
      tanggalAkhir,
      daftarTanggal,
      judul,
      subjudul,
      sumberCatatan,
      daftarRegional,
      items,
    } = body;

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

    // Compute normalized dates array
    let computedDaftarTanggal: string[] = [];
    if (Array.isArray(daftarTanggal) && daftarTanggal.length > 0) {
      computedDaftarTanggal = Array.from(
        new Set(
          daftarTanggal
            .map((d: any) => (typeof d === "string" ? d.split("T")[0] : ""))
            .filter(Boolean)
        )
      ).sort();
    } else if (tanggalAkhir && tanggalAkhir !== tanggal) {
      const cur = new Date(tanggal.split("T")[0]);
      const end = new Date(tanggalAkhir.split("T")[0]);
      const list: string[] = [];
      while (cur <= end) {
        list.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
      }
      computedDaftarTanggal = list;
    } else {
      computedDaftarTanggal = [tanggal.split("T")[0]];
    }

    if (computedDaftarTanggal.length === 0) {
      computedDaftarTanggal = [tanggal.split("T")[0]];
    }

    const tglDate = new Date(computedDaftarTanggal[0]);
    const tglAkhirDate =
      computedDaftarTanggal.length > 1
        ? new Date(computedDaftarTanggal[computedDaftarTanggal.length - 1])
        : null;

    // Business Rule: Tanggal yang sudah masuk laporan (baik single maupun rapel) tidak boleh dipakai lagi
    const conflicting = await prisma.realisasiPemenuhan.findFirst({
      where: {
        ...(id ? { NOT: { id } } : {}),
        OR: [
          {
            daftarTanggal: {
              hasSome: computedDaftarTanggal,
            },
          },
          // Backward compatibility check for records with empty daftarTanggal
          ...computedDaftarTanggal.map((dStr) => {
            const d = new Date(dStr);
            const s = new Date(d);
            s.setHours(0, 0, 0, 0);
            const e = new Date(d);
            e.setHours(23, 59, 59, 999);
            return {
              tanggal: {
                gte: new Date(s.getTime() - 4 * 3600 * 1000),
                lte: new Date(e.getTime() + 4 * 3600 * 1000),
              },
            };
          }),
        ],
      },
      select: { id: true, tanggal: true, tanggalAkhir: true, daftarTanggal: true },
    });

    if (conflicting) {
      return NextResponse.json(
        {
          error:
            "Salah satu tanggal yang dipilih sudah terdaftar dalam laporan lain. Setiap tanggal hanya boleh dimasukkan ke dalam 1 laporan (baik harian maupun rapel).",
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
            tanggalAkhir: tglAkhirDate,
            daftarTanggal: computedDaftarTanggal,
            judul: judul || "PROGRES PEMENUHAN RITEL MODERN",
            subjudul: subjudul || null,
            sumberCatatan: sumberCatatan || null,
            daftarRegional: daftarRegional ? daftarRegional.trim() : null,
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
          tanggalAkhir: tglAkhirDate,
          daftarTanggal: computedDaftarTanggal,
          judul: judul || "PROGRES PEMENUHAN RITEL MODERN",
          subjudul: subjudul || null,
          sumberCatatan: sumberCatatan || null,
          daftarRegional: daftarRegional ? daftarRegional.trim() : null,
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
