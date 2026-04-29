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

    // Construct dynamic where filter
    const drFilter: Prisma.DataReturWhereInput[] = [];
    // Access is now global for RM and Site Area as per user request
    
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

    const lokasiParam = searchParams.get("lokasi");
    if (lokasiParam) {
      if (lokasiParam.toUpperCase() === "BELUM ADA LOKASI") {
        drFilter.push({
          OR: [
            { lokasiBarangId: null },
            { LokasiBarang: { is: null } }
          ]
        });
      } else {
        drFilter.push({ LokasiBarang: { siteArea: { equals: lokasiParam, mode: 'insensitive' } } });
      }
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
              DataRetur: { where: {} }
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
    const selectedRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
    
    const filtersB: Prisma.DataReturWhereInput[] = selectedRitel 
      ? [{ RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } }]
      : [{ ritelId: retailerId }];

    if (drFilter.length > 0) {
      filtersB.push(...drFilter);
    }

    const where: Prisma.DataReturWhereInput = {
      AND: filtersB
    };

    // [OPTIMASI] Ambil daftar lokasi unik yang tersedia untuk filter ini
    const availableLocs = await prisma.dataRetur.findMany({
      where: {
        AND: [
          selectedRitel ? { RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } } : { ritelId: retailerId },
          // Kita tidak menyertakan drFilter lokasi agar dropdown tidak menciut saat salah satu dipilih
          ...drFilter.filter(f => !('LokasiBarang' in f || 'OR' in f && JSON.stringify(f).includes('lokasiBarangId'))) 
        ]
      },
      select: { LokasiBarang: { select: { siteArea: true } } },
      distinct: ['lokasiBarangId']
    });
    const locationsList = Array.from(new Set(availableLocs.map(l => l.LokasiBarang?.siteArea).filter(Boolean)));

    const [data, total, summary] = await Promise.all([
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
      prisma.dataRetur.aggregate({
        where,
        _sum: {
          qtyReturn: true,
          nominal: true
        }
      })
    ]);

    return NextResponse.json({
      isGrouped: false,
      data,
      total,
      totalQty: summary._sum.qtyReturn || 0,
      totalNominal: Number(summary._sum.nominal || 0),
      availableLocations: locationsList,
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
    const bodyRaw = await request.json();
    const isArray = Array.isArray(bodyRaw);
    const body = isArray ? bodyRaw : (bodyRaw.data || bodyRaw);
    const replaceDuplicates = bodyRaw.replaceDuplicates === true;

    if (Array.isArray(body)) {
      // BULK INSERT
      
      // [OPTIMASI 1] Tarik kamus data Unit Produksi
      const masterUnits = await prisma.unitProduksi.findMany({
        select: { idRegional: true, siteArea: true }
      });

      const findUnitId = (nameVal: any) => {
        if (!nameVal) return null;
        const searchStr = String(nameVal).trim();
        const lowerSearch = searchStr.toLowerCase();
        const match = masterUnits.find(u => u.siteArea.trim().toLowerCase() === lowerSearch || u.idRegional === searchStr);
        return match ? match.idRegional : (searchStr.length > 15 && searchStr.includes("-") ? searchStr : null);
      };

      const getFuzzyValue = (obj: any, keywords: string[]) => {
        const keys = Object.keys(obj);
        for (const key of keys) {
          if (keywords.some(kw => key.toLowerCase().includes(kw))) return obj[key];
        }
        return null;
      };

      // [RULE BARU] Validasi Unik (RTV + Produk)
      // 1. Bersihkan dan Filter data batch
      const processedBatch = body.map((item: any) => {
        const rtv = (item.rtvCn !== null && item.rtvCn !== undefined) ? String(item.rtvCn).trim() : null;
        const prod = item.produk ? String(item.produk).trim() : null;
        return { ...item, rtv, prod };
      }).filter(item => item.prod); // Harus ada produk

      // 2. Jika REPLACE aktif, hapus data lama yang rtvCn DAN produk-nya bentrok
      if (replaceDuplicates) {
        // Karena Prisma deleteMany tidak support filter multiple (A AND B) OR (C AND D) secara elegan untuk batch besar,
        // Kita gunakan loop atau filter IN jika memungkinkan. Untuk keamanan & presisi:
        for (const item of processedBatch) {
          if (item.rtv) {
            await prisma.dataRetur.deleteMany({
              where: {
                rtvCn: item.rtv,
                produk: item.prod
              }
            });
          }
        }
      }

      // 3. Jika SKIP aktif (replaceDuplicates: false), filter out yang sudah ada di DB
      let finalDataToCreate = processedBatch;
      if (!replaceDuplicates) {
        const existingRecords = await prisma.dataRetur.findMany({
          where: {
            OR: processedBatch.map(item => ({
              rtvCn: item.rtv,
              produk: item.prod
            }))
          },
          select: { rtvCn: true, produk: true }
        });

        const existingKeys = new Set(existingRecords.map(r => `${r.rtvCn}|${r.produk}`));
        finalDataToCreate = processedBatch.filter(item => !existingKeys.has(`${item.rtv}|${item.prod}`));
      }

      if (finalDataToCreate.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "Semua data sudah ada (skipped)" });
      }

      // 4. Mapping data final untuk createMany
      const dataToCreate = finalDataToCreate.map((item: any) => {
        const stringLokasi = item.lokasiBarangId || getFuzzyValue(item, ['lokasi', 'lokasi barang', 'dc']);
        const stringPembebanan = item.pembebananReturnId || getFuzzyValue(item, ['pembebanan', 'beban', 'pembebanan retur']);

        return {
          rtvCn: item.rtv,
          tanggalRtv: item.tanggalRtv ? new Date(item.tanggalRtv) : null,
          maxPickup: item.maxPickup ? new Date(item.maxPickup) : null,
          kodeToko: item.kodeToko ? Number(item.kodeToko) : null,
          namaCompany: item.namaCompany || null,
          inisial: item.inisial || null,
          ritelId: item.ritelId || null,
          link: item.link || null,
          produk: item.prod,
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
        skipDuplicates: true, // Safety net level DB
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    // --- SINGLE MANUAL INSERT ---
    if (!body.produk && (!body.qtyReturn && body.qtyReturn !== 0)) {
      return NextResponse.json({ error: "Data produk dan QTY tidak valid" }, { status: 400 });
    }

    const rtv = body.rtvCn ? String(body.rtvCn).trim() : null;
    const prod = body.produk ? String(body.produk).trim() : null;

    // Cek Duplikat Eksisting
    const existing = await prisma.dataRetur.findFirst({
      where: {
        rtvCn: rtv,
        produk: prod
      }
    });

    if (existing) {
      return NextResponse.json({ 
        error: `Produk "${prod}" sudah ada di Nomor RTV "${rtv || '-'}"` 
      }, { status: 409 });
    }

    const newData = await prisma.dataRetur.create({
      data: {
        rtvCn: rtv || undefined,
        tanggalRtv: body.tanggalRtv ? new Date(body.tanggalRtv) : null,
        maxPickup: body.maxPickup ? new Date(body.maxPickup) : null,
        namaCompany: body.namaCompany || null,
        inisial: body.inisial || null,
        ritelId: body.ritelId || null,
        kodeToko: body.kodeToko ? Number(body.kodeToko) : null,
        produk: prod,
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
