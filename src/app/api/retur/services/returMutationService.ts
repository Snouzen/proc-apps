import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getProfileName } from "@/lib/auth";
import { auditActivity } from "@/lib/audit";
import { checkReturOwnership } from "@/lib/utils/regional";

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseSafeInt(val: any, fallback: number | null = null): number | null {
  if (val === null || val === undefined || String(val).trim() === "") return fallback;
  const cleaned = String(val).replace(/[^0-9-]/g, "");
  if (!cleaned || cleaned === "-") return fallback;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n > 2147483647 || n < -2147483648) return fallback;
  return Math.round(n);
}

function parseSafeDecimal(val: any, fallback: Prisma.Decimal | null = null): Prisma.Decimal | null {
  if (val === null || val === undefined || String(val).trim() === "") return fallback;
  try {
    return new Prisma.Decimal(val);
  } catch {
    return fallback;
  }
}

export async function bulkInsertRetur(
  body: any[], 
  replaceDuplicates: boolean, 
  auth: { session: any; role?: any; safeRole?: any; dbUser: any }
) {
  const { session, dbUser } = auth;
  const safeRole = auth.safeRole || auth.role;

  // Validasi: seluruh item dalam batch wajib memiliki ritelId yang valid
  const missingRitel = body.some((item: any) => !item.ritelId || String(item.ritelId).trim() === "");
  if (missingRitel) {
    return { error: "Semua data retur dalam batch wajib memiliki ritelId yang valid", status: 400 };
  }

  // Pre-validasi: seluruh ritelId wajib terdaftar di master tabel RitelModern
  const uniqueRitelIds = [...new Set(body.map((item: any) => String(item.ritelId || "").trim()).filter(Boolean))];
  const existingRitels = await prisma.ritelModern.findMany({
    where: { id: { in: uniqueRitelIds } },
    select: { id: true }
  });
  const existingRitelSet = new Set(existingRitels.map(r => r.id));
  const invalidRitelIds = uniqueRitelIds.filter(id => !existingRitelSet.has(id));
  if (invalidRitelIds.length > 0) {
    return { 
      error: `Ditemukan ritelId yang tidak terdaftar di database: ${invalidRitelIds.slice(0, 3).join(", ")}${invalidRitelIds.length > 3 ? " dan lainnya" : ""}`, 
      status: 400 
    };
  }

  // Tarik kamus data Unit Produksi dengan informasi regional lengkap
  const masterUnits = await prisma.unitProduksi.findMany({
    select: { idRegional: true, siteArea: true, namaRegional: true, kodeRegional: true }
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

  // Validasi: Setiap baris dalam batch wajib memiliki nama produk yang valid (tidak disaring diam-diam)
  const missingProdIndex = body.findIndex((item: any) => !item.produk || String(item.produk).trim() === "");
  if (missingProdIndex !== -1) {
    return { 
      error: `Baris ${missingProdIndex + 1}: Data retur wajib memiliki nama produk yang valid`, 
      status: 400 
    };
  }

  // Pemetaan Data Unik (RTV + Produk)
  const processedBatch = body.map((item: any) => {
    const rtv = (item.rtvCn !== null && item.rtvCn !== undefined) ? String(item.rtvCn).trim() : null;
    const prod = String(item.produk).trim();
    const ritelId = String(item.ritelId).trim();
    return { ...item, rtv, prod, ritelId };
  });

  // Transaksi Atomik: deleteMany berdasarkan ID terverifikasi jika replaceDuplicates, createMany, dan auditActivity
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (replaceDuplicates) {
        const validItems = processedBatch.filter((item: any) => item.rtv);
        if (validItems.length > 0) {
          // 1. Cari kandidat record existing yang akan ditimpa
          const candidateRecords = await tx.dataRetur.findMany({
            where: {
              OR: validItems.map((item: any) => ({
                rtvCn: item.rtv,
                produk: item.prod,
                ritelId: item.ritelId,
              }))
            },
            select: { id: true }
          });

          if (candidateRecords.length > 0) {
            const candidateIds = candidateRecords.map(r => r.id);
            // Kunci baris dengan FOR UPDATE agar transaksi paralel tidak dapat mengubah record selama transaksi ini berlangsung
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM "data_retur" WHERE "id" IN (${Prisma.join(candidateIds)}) FOR UPDATE`
            );

            // Hapus ID-ID spesifik yang telah terkunci
            const chunkSize = 500;
            for (let i = 0; i < candidateIds.length; i += chunkSize) {
              const chunk = candidateIds.slice(i, i + chunkSize);
              await tx.dataRetur.deleteMany({
                where: {
                  id: { in: chunk }
                }
              });
            }
          }
        }
      }

    // Jika SKIP aktif, filter out yang sudah ada di DB
    let finalDataToCreate = processedBatch;
    if (!replaceDuplicates) {
      const itemsWithRtv = processedBatch.filter((item: any) => item.rtv);
      const itemsWithoutRtv = processedBatch.filter((item: any) => !item.rtv);

      if (itemsWithRtv.length > 0) {
        const existingRecords = await tx.dataRetur.findMany({
          where: {
            OR: itemsWithRtv.map(item => ({
              rtvCn: item.rtv,
              produk: item.prod,
              ritelId: item.ritelId,
            }))
          },
          select: { rtvCn: true, produk: true, ritelId: true }
        });

        const existingKeys = new Set(existingRecords.map(r => `${r.rtvCn}|${r.produk}|${r.ritelId}`));
        const filteredWithRtv = itemsWithRtv.filter(item => !existingKeys.has(`${item.rtv}|${item.prod}|${item.ritelId}`));
        finalDataToCreate = [...filteredWithRtv, ...itemsWithoutRtv];
      }
    }

    if (finalDataToCreate.length === 0) {
      return { count: 0, skipped: true };
    }

    // Mapping data final untuk createMany
    const dataToCreate = finalDataToCreate.map((item: any) => {
      const stringLokasi = item.lokasiBarangId || getFuzzyValue(item, ['lokasi', 'lokasi barang', 'dc']);
      const stringPembebanan = item.pembebananReturnId || getFuzzyValue(item, ['pembebanan', 'beban', 'pembebanan retur']);

      return {
        rtvCn: item.rtv,
        tanggalRtv: parseSafeDate(item.tanggalRtv),
        maxPickup: parseSafeDate(item.maxPickup),
        kodeToko: parseSafeInt(item.kodeToko, null),
        namaCompany: item.namaCompany || null,
        inisial: item.inisial || null,
        ritelId: item.ritelId || null,
        link: item.link || null,
        produk: item.prod,
        productId: item.productId || null,
        qtyReturn: parseSafeInt(item.qtyReturn, null),
        nominal: parseSafeDecimal(item.nominal, null),
        rpKg: parseSafeDecimal(item.rpKg, null),
        statusBarang: item.statusBarang || "Belum Diambil",
        refKetStatus: item.refKetStatus || null,
        lokasiBarangId: findUnitId(stringLokasi),
        pembebananReturnId: findUnitId(stringPembebanan),
        invoiceRekon: item.invoiceRekon ? String(item.invoiceRekon) : null,
        referensiPembayaran: item.referensiPembayaran || null,
        tanggalPembayaran: parseSafeDate(item.tanggalPembayaran),
        remarks: item.remarks || null,
        sdiReturn: item.sdiReturn || null,
      };
    });

    const created = await tx.dataRetur.createMany({
      data: dataToCreate,
      skipDuplicates: true,
    });

    if (created.count > 0) {
      await auditActivity(tx as any, `batch-${Date.now()}`, "DataRetur", "CREATE", 
        { id: dbUser?.id || (session as any)?.user?.id || "unknown", name: getProfileName(session, dbUser), role: safeRole }, 
        { count: created.count, isBatch: true, ritelIds: uniqueRitelIds }
      );
    }

    return { count: created.count, skipped: false };
  }, {
    timeout: 30000
  });

  return result;
} catch (err: any) {
  if (err?.statusCode === 403 || err?.message?.startsWith("Forbidden")) {
    return { error: err.message, status: 403 };
  }
  throw err;
}
}

export async function singleInsertRetur(
  body: any, 
  auth: { session: any; role?: any; safeRole?: any; dbUser: any }
) {
  const { session, dbUser } = auth;
  const safeRole = auth.safeRole || auth.role;

  if (!body.produk && (!body.qtyReturn && body.qtyReturn !== 0)) {
    return { error: "Data produk dan QTY tidak valid", status: 400 };
  }

  const rtv = body.rtvCn ? String(body.rtvCn).trim() : null;
  const prod = body.produk ? String(body.produk).trim() : null;

  if (rtv) {
    const existing = await prisma.dataRetur.findFirst({
      where: {
        rtvCn: rtv,
        produk: prod,
        ritelId: body.ritelId ? String(body.ritelId).trim() : null,
      }
    });

    if (existing) {
      return { 
        error: `Produk "${prod}" sudah ada di Nomor RTV "${rtv}" untuk ritel ini`, 
        status: 409 
      };
    }
  }

  const newData = await prisma.dataRetur.create({
    data: {
      rtvCn: rtv || undefined,
      tanggalRtv: parseSafeDate(body.tanggalRtv),
      maxPickup: parseSafeDate(body.maxPickup),
      namaCompany: body.namaCompany || null,
      inisial: body.inisial || null,
      ritelId: body.ritelId || null,
      kodeToko: parseSafeInt(body.kodeToko, null),
      produk: prod,
      productId: body.productId || null,
      qtyReturn: parseSafeInt(body.qtyReturn, 0) ?? 0,
      nominal: parseSafeDecimal(body.nominal, new Prisma.Decimal(0)) ?? 0,
      rpKg: parseSafeDecimal(body.rpKg, new Prisma.Decimal(0)) ?? 0,
      statusBarang: body.statusBarang || "Belum Diambil",
      lokasiBarangId: body.lokasiBarangId || null,
      pembebananReturnId: body.pembebananReturnId || null,
      remarks: body.remarks || null,
      link: body.link || null,
      refKetStatus: body.refKetStatus || null,
      invoiceRekon: body.invoiceRekon || null,
      referensiPembayaran: body.referensiPembayaran || null,
      tanggalPembayaran: parseSafeDate(body.tanggalPembayaran),
      sdiReturn: body.sdiReturn || null,
    },
  });

  await auditActivity(prisma as any, newData.id, "DataRetur", "CREATE", { 
    id: dbUser?.id || (session as any)?.user?.id || "unknown", 
    name: getProfileName(session, dbUser), 
    role: safeRole 
  });

  return { data: newData };
}

export async function updateRetur(body: any, auth?: any) {
  const { id, ...updateData } = body;

  if (!id) {
    return { error: "ID data retur wajib disertakan", status: 400 };
  }

  const safeRole = auth?.safeRole || auth?.role;
  const session = auth?.session;
  const dbUser = auth?.dbUser;

  // Whitelist eksplisit seluruh field skalar yang diizinkan untuk update demi keamanan
  const sanitizedData: any = {};
  if (updateData.rtvCn !== undefined) sanitizedData.rtvCn = updateData.rtvCn ? String(updateData.rtvCn).trim() : null;
  if (updateData.tanggalRtv !== undefined) sanitizedData.tanggalRtv = parseSafeDate(updateData.tanggalRtv);
  if (updateData.maxPickup !== undefined) sanitizedData.maxPickup = parseSafeDate(updateData.maxPickup);
  if (updateData.kodeToko !== undefined) sanitizedData.kodeToko = parseSafeInt(updateData.kodeToko, null);
  if (updateData.namaCompany !== undefined) sanitizedData.namaCompany = updateData.namaCompany || null;
  if (updateData.inisial !== undefined) sanitizedData.inisial = updateData.inisial || null;
  if (updateData.ritelId !== undefined) sanitizedData.ritelId = updateData.ritelId || null;
  if (updateData.link !== undefined) sanitizedData.link = updateData.link || null;
  if (updateData.produk !== undefined) sanitizedData.produk = updateData.produk ? String(updateData.produk).trim() : null;
  if (updateData.productId !== undefined) sanitizedData.productId = updateData.productId || null;
  if (updateData.qtyReturn !== undefined) sanitizedData.qtyReturn = parseSafeInt(updateData.qtyReturn, 0) ?? 0;
  if (updateData.nominal !== undefined) sanitizedData.nominal = parseSafeDecimal(updateData.nominal, new Prisma.Decimal(0));
  if (updateData.rpKg !== undefined) sanitizedData.rpKg = parseSafeDecimal(updateData.rpKg, new Prisma.Decimal(0));
  if (updateData.statusBarang !== undefined) sanitizedData.statusBarang = updateData.statusBarang || "Belum Diambil";
  if (updateData.refKetStatus !== undefined) sanitizedData.refKetStatus = updateData.refKetStatus || null;
  if (updateData.lokasiBarangId !== undefined) sanitizedData.lokasiBarangId = updateData.lokasiBarangId || null;
  if (updateData.pembebananReturnId !== undefined) sanitizedData.pembebananReturnId = updateData.pembebananReturnId || null;
  if (updateData.invoiceRekon !== undefined) sanitizedData.invoiceRekon = updateData.invoiceRekon ? String(updateData.invoiceRekon) : null;
  if (updateData.referensiPembayaran !== undefined) sanitizedData.referensiPembayaran = updateData.referensiPembayaran || null;
  if (updateData.tanggalPembayaran !== undefined) sanitizedData.tanggalPembayaran = parseSafeDate(updateData.tanggalPembayaran);
  if (updateData.remarks !== undefined) sanitizedData.remarks = updateData.remarks || null;
  if (updateData.sdiReturn !== undefined) sanitizedData.sdiReturn = updateData.sdiReturn || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kunci baris dengan FOR UPDATE di dalam transaksi
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "data_retur" WHERE "id" = ${id} FOR UPDATE`
      );

      const existing = await tx.dataRetur.findUnique({
        where: { id },
        include: { LokasiBarang: true, PembebananReturn: true },
      });
      if (!existing) {
        const err: any = new Error("Data retur tidak ditemukan");
        err.statusCode = 404;
        throw err;
      }

      const updated = await tx.dataRetur.update({
        where: { id },
        data: sanitizedData,
      });

      if (auth) {
        await auditActivity(tx as any, id, "DataRetur", "UPDATE", {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole,
        }, {
          oldData: {
            rtvCn: existing.rtvCn,
            qtyReturn: existing.qtyReturn,
            nominal: existing.nominal !== null && existing.nominal !== undefined ? Number(existing.nominal) : null,
          },
          newData: {
            rtvCn: updated.rtvCn,
            qtyReturn: updated.qtyReturn,
            nominal: updated.nominal !== null && updated.nominal !== undefined ? Number(updated.nominal) : null,
          },
        });
      }

      return updated;
    });

    return { data: result };
  } catch (err: any) {
    if (err.statusCode) {
      return { error: err.message, status: err.statusCode };
    }
    return { error: err.message || "Gagal memperbarui data retur", status: 500 };
  }
}

export async function deleteRetur(id: string | null, ritelId: string | null, auth?: any) {
  if (!id && !ritelId) {
    return { error: "ID Data Retur atau Ritel ID wajib disertakan!", status: 400 };
  }

  const safeRole = auth?.safeRole || auth?.role;
  const session = auth?.session;
  const dbUser = auth?.dbUser;

  if (ritelId) {
    if (safeRole !== "pusat") {
      return { error: "Hanya akun Pusat yang berwenang menghapus seluruh data retur ritel.", status: 403 };
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.dataRetur.deleteMany({
        where: { ritelId: ritelId }
      });
      if (auth && deleted.count > 0) {
        await auditActivity(tx as any, `retur-ritel-${ritelId}`, "DataRetur", "DELETE", {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole,
        }, { count: deleted.count, ritelId });
      }
      return deleted;
    });

    return { 
      success: true, 
      message: `${result.count} data retur ritel berhasil dihapus` 
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Kunci baris dengan FOR UPDATE di dalam transaksi sebelum membaca ownership
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "data_retur" WHERE "id" = ${id} FOR UPDATE`
      );

      const existing = await tx.dataRetur.findUnique({
        where: { id: id as string },
        include: { LokasiBarang: true, PembebananReturn: true },
      });
      if (!existing) {
        const err: any = new Error("Data retur tidak ditemukan");
        err.statusCode = 404;
        throw err;
      }

      const userRegional = dbUser?.regional || session?.regional || null;
      const userSiteArea = dbUser?.siteArea || session?.siteArea || null;
      const ownershipCheck = checkReturOwnership(existing, safeRole, userRegional, userSiteArea);
      if (!ownershipCheck.allowed) {
        const err: any = new Error(ownershipCheck.reason || "Forbidden: Anda tidak berwenang menghapus data retur ini.");
        err.statusCode = 403;
        throw err;
      }

      await tx.dataRetur.delete({
        where: { id: id as string },
      });

      if (auth) {
        await auditActivity(tx as any, id as string, "DataRetur", "DELETE", {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole,
        }, { rtvCn: existing.rtvCn, nominal: existing.nominal, ritelId: existing.ritelId });
      }
    });

    return { 
      success: true, 
      message: "Data retur berhasil dihapus" 
    };
  } catch (err: any) {
    if (err.statusCode) {
      return { error: err.message, status: err.statusCode };
    }
    return { error: err.message || "Gagal menghapus data retur", status: 500 };
  }
}
