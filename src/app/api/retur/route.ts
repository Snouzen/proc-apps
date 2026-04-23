import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId"); // ID untuk Mode Detail
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;
    const q = searchParams.get("q") || "";
    const inisial = searchParams.get("inisial");
    const toko = searchParams.get("toko");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");

    // [RBAC] Ambil Session & Role
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const user = verifySession(sessionToken);

    let siteScopeId: string | null = null;
    let rmInisial: string | null = null;

    const safeRole = String(user?.role || "").toLowerCase().trim();

    // Jika Role adalah SiteArea, batasi hanya untuk region mereka
    if (safeRole === "sitearea" && user?.siteArea) {
      const unit = await prisma.unitProduksi.findFirst({
        where: { siteArea: { contains: user.siteArea, mode: "insensitive" } },
      });
      if (unit) siteScopeId = unit.idRegional;
    } else if (safeRole === "rm" && user?.regional) {
      rmInisial = user.regional;
    }

    // Construct dynamic where filter
    const drFilter: Prisma.DataReturWhereInput[] = [];
    if (siteScopeId) drFilter.push({ lokasiBarangId: siteScopeId });
    if (rmInisial) drFilter.push({ inisial: { equals: rmInisial, mode: 'insensitive' } });
    
    if (inisial) drFilter.push({ inisial: inisial });
    if (toko) drFilter.push({ namaCompany: toko });
    
    if (status) {
      if (status.toUpperCase() === "BELUM DIAMBIL") {
        drFilter.push({
          OR: [
            { statusBarang: { equals: "BELUM DIAMBIL", mode: "insensitive" } },
            { statusBarang: null },
            { statusBarang: { equals: "" } }
          ]
        });
      } else {
        drFilter.push({ statusBarang: { equals: status, mode: "insensitive" } });
      }
    }

    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        dateRange.lte = d;
      }
      drFilter.push({ tanggalRtv: dateRange });
    }

    if (q) {
      drFilter.push({
        OR: [
          { rtvCn: { contains: q, mode: "insensitive" } },
          { namaCompany: { contains: q, mode: "insensitive" } },
          { produk: { contains: q, mode: "insensitive" } },
        ]
      });
    }

    // SCENARIO A: Grouped Mode (Accordion) - Berikan daftar peritel yang punya retur
    if (!retailerId) {
      const allRitelsWithReturs = await prisma.ritelModern.findMany({
        where: {
          DataRetur: { some: drFilter.length > 0 ? { AND: drFilter } : {} }
        },
        include: {
          _count: {
            select: {
              DataRetur: { where: siteScopeId ? { lokasiBarangId: siteScopeId } : {} }
            }
          }
        },
        orderBy: { namaPt: "asc" }
      });

      // Manual aggregation by name
      const aggregatedMap = new Map<string, any>();
      for (const ritel of allRitelsWithReturs) {
        const name = ritel.namaPt.trim().toUpperCase();
        if (aggregatedMap.has(name)) {
          aggregatedMap.get(name)._count.DataRetur += ritel._count.DataRetur;
        } else {
          aggregatedMap.set(name, {
            ...ritel,
            _count: { DataRetur: ritel._count.DataRetur }
          });
        }
      }

      return NextResponse.json({
        isGrouped: true,
        data: Array.from(aggregatedMap.values())
      });
    }

    // SCENARIO B: Detail Mode - Kembalikan data retur spesifik untuk ritel tsb
    // Menggunakan Nama PT agar semua cabang/ID yang namanya sama ikut terbawa
    const selectedRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
    
    const filtersB: Prisma.DataReturWhereInput[] = selectedRitel 
      ? [{ RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } }]
      : [{ ritelId: retailerId }];

    // Gabungkan dengan filter tambahan (inisial, toko, tanggal, q) yang didefinisikan di atas
    if (drFilter.length > 0) {
      filtersB.push(...drFilter);
    }

    const where: Prisma.DataReturWhereInput = {
      AND: filtersB
    };

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

    if (Array.isArray(body)) {
      // BULK INSERT

      // [OPTIMASI 1] Tarik kamus data Unit Produksi untuk menerjemahkan nama ke ID
      const masterUnits = await prisma.unitProduksi.findMany({
        select: { idRegional: true, siteArea: true }
      });

      // [OPTIMASI 2] Helper untuk mencocokkan string dari Excel ke idRegional
      const findUnitId = (nameVal: any) => {
        if (!nameVal) return null;
        const searchStr = String(nameVal).trim();
        const lowerSearch = searchStr.toLowerCase();

        // 1. Cek dulu apakah ini SUDAH berupa ID yang valid (idRegional)
        const isAlreadyId = masterUnits.some((u) => u.idRegional === searchStr);
        if (isAlreadyId) return searchStr;

        // 2. Cari berdasarkan kecocokan nama (siteArea)
        const match = masterUnits.find(
          (u) => u.siteArea.trim().toLowerCase() === lowerSearch,
        );
        if (match) return match.idRegional;

        // 3. Fallback: Jika ID mengandung dash (legacy UUID style) tapi tdk ada di master
        if (searchStr.length > 15 && searchStr.includes("-")) return searchStr;

        return null;
      };

      // [RADAR CERDAS] Mencari value di dalam object meskipun nama key-nya agak berbeda/typo
      const getFuzzyValue = (obj: any, keywords: string[]) => {
        const keys = Object.keys(obj);
        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          if (keywords.some(kw => lowerKey.includes(kw))) {
            return obj[key];
          }
        }
        return null;
      };

      // [OPTIMASI 4] Gunakan createMany untuk kecepatan maksimal (anti-timeout)
      const dataToCreate = body.map((item: any) => {
        const stringLokasi = item.lokasiBarangId || getFuzzyValue(item, ['lokasi', 'lokasi barang', 'dc']);
        const stringPembebanan = item.pembebananReturnId || getFuzzyValue(item, ['pembebanan', 'beban', 'pembebanan retur']);

        return {
          rtvCn: (item.rtvCn !== null && item.rtvCn !== undefined) ? String(item.rtvCn).trim() : null,
          tanggalRtv: item.tanggalRtv ? new Date(item.tanggalRtv) : null,
          maxPickup: item.maxPickup ? new Date(item.maxPickup) : null,
          kodeToko: item.kodeToko ? Number(item.kodeToko) : null,
          namaCompany: item.namaCompany || null,
          inisial: item.inisial || null,
          ritelId: item.ritelId || null,
          link: item.link || null,
          produk: item.produk || null,
          productId: item.productId || null,
          qtyReturn: item.qtyReturn ? Number(item.qtyReturn) : null,
          nominal: item.nominal ? new Prisma.Decimal(item.nominal) : null,
          rpKg: item.rpKg ? new Prisma.Decimal(item.rpKg) : null,
          statusBarang: item.statusBarang || "Belum Diambil",
          refKetStatus: item.refKetStatus || null,
          lokasiBarangId: findUnitId(stringLokasi),
          pembebananReturnId: findUnitId(stringPembebanan),
          invoiceRekon: item.invoiceRekon ? String(item.invoiceRekon) : null,
          referensiPembayaran: item.referensiPembayaran || null,
          tanggalPembayaran: item.tanggalPembayaran ? new Date(item.tanggalPembayaran) : null,
          remarks: item.remarks || null,
          sdiReturn: item.sdiReturn || null,
        };
      });

      const result = await prisma.dataRetur.createMany({
        data: dataToCreate,
        skipDuplicates: false,
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    // Validasi baru (lebih longgar, karena rtvCn dan namaCompany bisa null)
    if (!body.produk && (!body.qtyReturn && body.qtyReturn !== 0)) {
      return NextResponse.json({ error: "Data produk dan QTY tidak valid" }, { status: 400 });
    }

    const newData = await prisma.dataRetur.create({
      data: {
        rtvCn: body.rtvCn ? String(body.rtvCn).trim() : undefined,
        tanggalRtv: body.tanggalRtv ? new Date(body.tanggalRtv) : null,
        maxPickup: body.maxPickup ? new Date(body.maxPickup) : null,
        namaCompany: body.namaCompany || null,
        inisial: body.inisial || null,
        ritelId: body.ritelId || null,
        kodeToko: body.kodeToko ? Number(body.kodeToko) : null,
        produk: body.produk || null,
        productId: body.productId || null,
        qtyReturn: body.qtyReturn ? Number(body.qtyReturn) : 0,
        nominal: body.nominal ? new Prisma.Decimal(body.nominal) : 0,
        rpKg: body.rpKg ? new Prisma.Decimal(body.rpKg) : 0,
        statusBarang: body.statusBarang || "Belum Diambil",
        lokasiBarangId: body.lokasiBarangId || null,
        pembebananReturnId: body.pembebananReturnId || null,
        remarks: body.remarks || null,
        link: body.link || null,
        refKetStatus: body.refKetStatus || null,
        invoiceRekon: body.invoiceRekon || null,
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
      rtvCn: updateData.rtvCn !== undefined ? (updateData.rtvCn ? String(updateData.rtvCn).trim() : null) : undefined,
      kodeToko: updateData.kodeToko !== undefined ? (updateData.kodeToko ? Number(updateData.kodeToko) : null) : undefined,
      qtyReturn: updateData.qtyReturn !== undefined ? (Number(updateData.qtyReturn) || 0) : undefined,
      nominal: updateData.nominal !== undefined ? new Prisma.Decimal(updateData.nominal) : undefined,
      rpKg: updateData.rpKg !== undefined ? new Prisma.Decimal(updateData.rpKg) : undefined,
      tanggalRtv: updateData.tanggalRtv ? new Date(updateData.tanggalRtv) : null,
      maxPickup: updateData.maxPickup ? new Date(updateData.maxPickup) : null,
      tanggalPembayaran: updateData.tanggalPembayaran ? new Date(updateData.tanggalPembayaran) : null,
      invoiceRekon: updateData.invoiceRekon !== undefined ? updateData.invoiceRekon : undefined,
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
    const ritelId = searchParams.get("ritelId");

    // 2. Validasi Keberadaan ID
    if (!id && !ritelId) {
      return NextResponse.json({ error: "ID Data Retur atau Ritel ID wajib disertakan!" }, { status: 400 });
    }

    if (ritelId) {
      const deleted = await prisma.dataRetur.deleteMany({
        where: { ritelId: ritelId }
      });
      return NextResponse.json({ 
        success: true, 
        message: `${deleted.count} data retur ritel berhasil dihapus` 
      });
    }

    // 3. Eksekusi Hapus di Database
    await prisma.dataRetur.delete({
      where: { id: id as string },
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
