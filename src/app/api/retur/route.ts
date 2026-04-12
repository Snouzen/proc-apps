import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId"); // ID untuk Mode Detail
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;
    const q = searchParams.get("q") || "";

    // SCENARIO A: Grouped Mode (Accordion) - Berikan daftar peritel yang punya retur
    if (!retailerId) {
      const groupedData = await prisma.ritelModern.findMany({
        where: {
          DataRetur: {
            some: q ? {
              OR: [
                { rtvCn: isNaN(Number(q)) ? undefined : Number(q) },
                { namaCompany: { contains: q, mode: "insensitive" } },
                { produk: { contains: q, mode: "insensitive" } },
              ].filter(Boolean) as Prisma.DataReturWhereInput[]
            } : {}
          }
        },
        include: {
          _count: {
            select: { DataRetur: true }
          }
        },
        orderBy: { namaPt: "asc" }
      });

      return NextResponse.json({
        isGrouped: true,
        data: groupedData
      });
    }

    // SCENARIO B: Detail Mode - Kembalikan data retur spesifik untuk ritel tsb
    const where: Prisma.DataReturWhereInput = {
      ritelId: retailerId
    };

    if (q) {
      where.OR = [
        { rtvCn: isNaN(Number(q)) ? undefined : Number(q) },
        { namaCompany: { contains: q, mode: "insensitive" } },
        { produk: { contains: q, mode: "insensitive" } },
        { LokasiBarang: { siteArea: { contains: q, mode: "insensitive" } } },
        { LokasiBarang: { namaRegional: { contains: q, mode: "insensitive" } } },
      ].filter(Boolean) as Prisma.DataReturWhereInput[];
    }

    const [data, total] = await Promise.all([
      prisma.dataRetur.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          RitelModern: true,
          LokasiBarang: true,
          PembebananReturn: true,
          Product: true,
        },
      }),
      prisma.dataRetur.count({ where }),
    ]);

    return NextResponse.json({
      isGrouped: false,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("GET Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Validasi baru (lebih longgar, karena rtvCn dan namaCompany bisa null)
    if (!body.produk && (!body.qtyReturn && body.qtyReturn !== 0)) {
      return NextResponse.json({ error: "Data produk dan QTY tidak valid" }, { status: 400 });
    }

    const newData = await prisma.dataRetur.create({
      data: {
        rtvCn: body.rtvCn ? Number(body.rtvCn) : undefined,
        tanggalRtv: body.tanggalRtv ? new Date(body.tanggalRtv) : null,
        maxPickup: body.maxPickup ? new Date(body.maxPickup) : null,
        namaCompany: body.namaCompany || null,
        ritelId: body.ritelId || null,
        kodeToko: body.kodeToko ? Number(body.kodeToko) : null,
        produk: body.produk || null,
        productId: body.productId || null,
        qtyReturn: body.qtyReturn ? Number(body.qtyReturn) : 0,
        nominal: body.nominal ? new Prisma.Decimal(body.nominal) : 0,
        rpKg: body.rpKg ? new Prisma.Decimal(body.rpKg) : 0,
        statusBarang: body.statusBarang || "Sudah Diambil",
        lokasiBarangId: body.lokasiBarangId || null,
        pembebananReturnId: body.pembebananReturnId || null,
        remarks: body.remarks || null,
        link: body.link || null,
        refKetStatus: body.refKetStatus || null,
        invoiceRekon: body.invoiceRekon || false,
        referensiPembayaran: body.referensiPembayaran || null,
        tanggalPembayaran: body.tanggalPembayaran ? new Date(body.tanggalPembayaran) : null,
        sdiReturn: body.sdiReturn || null,
      },
    });

    return NextResponse.json({ success: true, data: newData }, { status: 201 });
  } catch (error: any) {
    console.error("POST Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID data retur wajib disertakan" }, { status: 400 });
    }

    // --- SECONDARY SERVER-SIDE SANITIZATION (DOUBLE SECURITY) ---
    // Strict casting to Nullable Integers for Prisma compliance
    const sanitizedData = {
      ...updateData,
      rtvCn: updateData.rtvCn !== undefined ? (updateData.rtvCn ? Number(updateData.rtvCn) : null) : undefined,
      kodeToko: updateData.kodeToko !== undefined ? (updateData.kodeToko ? Number(updateData.kodeToko) : null) : undefined,
      qtyReturn: updateData.qtyReturn !== undefined ? (Number(updateData.qtyReturn) || 0) : undefined,
      nominal: updateData.nominal !== undefined ? new Prisma.Decimal(updateData.nominal) : undefined,
      rpKg: updateData.rpKg !== undefined ? new Prisma.Decimal(updateData.rpKg) : undefined,
      tanggalRtv: updateData.tanggalRtv ? new Date(updateData.tanggalRtv) : null,
      maxPickup: updateData.maxPickup ? new Date(updateData.maxPickup) : null,
      tanggalPembayaran: updateData.tanggalPembayaran ? new Date(updateData.tanggalPembayaran) : null,
      invoiceRekon: updateData.invoiceRekon === true,
    };

    const updated = await prisma.dataRetur.update({
      where: { id },
      data: sanitizedData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PUT Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    // 1. Tangkap ID dari URL searchParams (Next.js App Router Standard)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // 2. Validasi Keberadaan ID
    if (!id) {
      return NextResponse.json({ error: "ID Data Retur wajib disertakan!" }, { status: 400 });
    }

    // 3. Eksekusi Hapus di Database
    await prisma.dataRetur.delete({
      where: { id: id },
    });

    // 4. Return sukses dengan JSON yang valid
    return NextResponse.json({ 
      success: true,
      message: "Data retur berhasil dihapus" 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    
    // Jika error karena ID tidak ditemukan (RecordNotFound)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: "Data retur tidak ditemukan di database" }, { status: 404 });
      }
    }
    
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
