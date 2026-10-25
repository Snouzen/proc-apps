import prisma from "@/lib/prisma";

export function buildReturFilter(searchParams: URLSearchParams) {
  const inisial = searchParams.get("inisial");
  const toko = searchParams.get("toko");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status");
  const lokasiParam = searchParams.get("lokasi");
  const q = searchParams.get("q") || "";

  const drFilter: any[] = [];
  
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

  return drFilter;
}

export async function fetchReturGrouped(drFilter: any[]) {
  const allRitelsWithReturs = await prisma.ritelModern.findMany({
    take: 5000,
    where: {
      DataRetur: { some: (drFilter.length > 0 ? { AND: drFilter } : {}) as any }
    },
    include: {
      _count: {
        select: {
          DataRetur: { where: (drFilter.length > 0 ? { AND: drFilter } : {}) as any }
        }
      }
    },
    orderBy: { namaPt: "asc" }
  });

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

  return {
    isGrouped: true,
    data: Array.from(aggregatedMap.values())
  };
}

export async function fetchReturDetail(
  retailerId: string, 
  drFilter: any[], 
  page: number, 
  limit: number, 
  offset: number
) {
  const selectedRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
  
  const filtersB: any[] = selectedRitel 
    ? [{ RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } }]
    : [{ ritelId: retailerId }];

  if (drFilter.length > 0) {
    filtersB.push(...drFilter);
  }

  const where: any = {
    AND: filtersB
  };

  const availableLocs = await prisma.dataRetur.findMany({
    where: {
      AND: [
        selectedRitel ? { RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } } : { ritelId: retailerId },
        ...drFilter.filter(f => !('LokasiBarang' in f || 'OR' in f && JSON.stringify(f).includes('lokasiBarangId'))) 
      ]
    } as any,
    select: { LokasiBarang: { select: { siteArea: true } } },
    distinct: ['lokasiBarangId']
  });
  const locationsList = Array.from(new Set(availableLocs.map(l => l.LokasiBarang?.siteArea).filter(Boolean)));

  const [data, total, summary] = await Promise.all([
    prisma.dataRetur.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
        { id: "asc" }
      ],
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

  // Backfill sync from Reconcile if needed
  await runReturBackfills(data);

  return {
    isGrouped: false,
    data,
    total,
    totalQty: summary._sum.qtyReturn || 0,
    totalNominal: Number(summary._sum.nominal || 0),
    availableLocations: locationsList,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function runReturBackfills(data: any[]) {
  const retursNeedingFill = data.filter((d: any) => 
    !d.pembebananReturnId || !d.referensiPembayaran || d.referensiPembayaran === "" || d.referensiPembayaran === "-"
  );

  if (retursNeedingFill.length === 0) return;

  try {
    const rtvCns = retursNeedingFill.map((d: any) => d.rtvCn).filter(Boolean);
    
    const rekonsContaining = await prisma.reconcile.findMany({
      where: {
        status: "final",
        rtvs: { hasSome: rtvCns },
      },
      select: { noRekonsiliasi: true, rtvs: true, rtvDetails: true, invoices: true }
    });

    if (rekonsContaining.length === 0) return;

    const rtvRekonMap = new Map<string, { noRekon: string, refInvoice: string }>();
    for (const rekon of rekonsContaining) {
      const details: Array<{id?: string, noRtv: string, refInvoice?: string}> = 
        Array.isArray(rekon.rtvDetails) ? rekon.rtvDetails as any : [];
      
      if (details.length > 0) {
        for (const d of details) {
          if (d.noRtv && d.refInvoice) {
            rtvRekonMap.set(d.noRtv, { noRekon: rekon.noRekonsiliasi, refInvoice: d.refInvoice });
          }
        }
      } else {
        for (const rtvNo of (rekon.rtvs || [])) {
          if (!rtvRekonMap.has(rtvNo)) {
            rtvRekonMap.set(rtvNo, { noRekon: rekon.noRekonsiliasi, refInvoice: "" });
          }
        }
      }
    }

    const allRefInvoiceNos = [...new Set([...rtvRekonMap.values()].map(v => v.refInvoice).filter(Boolean))];
    const invoiceUnitMap = new Map<string, string>();
    if (allRefInvoiceNos.length > 0) {
      const invPOs = await prisma.purchaseOrder.findMany({
        where: { noInvoice: { in: allRefInvoiceNos } },
        include: { UnitProduksi: true }
      });
      invPOs.forEach((po: any) => {
        if (po.noInvoice && po.UnitProduksi?.idRegional) {
          invoiceUnitMap.set(po.noInvoice, po.UnitProduksi.idRegional);
        }
      });
    }

    const updateOps = retursNeedingFill.map((retur: any) => {
      const mapping = rtvRekonMap.get(retur.rtvCn);
      if (!mapping) return null;

      const updateData: any = {};

      if (!retur.referensiPembayaran || retur.referensiPembayaran === "" || retur.referensiPembayaran === "-") {
        updateData.referensiPembayaran = mapping.noRekon;
      }

      if (!retur.pembebananReturnId && mapping.refInvoice) {
        const unitId = invoiceUnitMap.get(mapping.refInvoice);
        if (unitId) {
          updateData.pembebananReturnId = unitId;
        }
      }

      if (Object.keys(updateData).length === 0) return null;
      return prisma.dataRetur.update({ where: { id: retur.id }, data: updateData });
    }).filter(Boolean);

    if (updateOps.length > 0) {
      await prisma.$transaction(updateOps as any);
      
      const updatedIds = retursNeedingFill.map((r: any) => r.id);
      const updatedRecords = await prisma.dataRetur.findMany({
        where: { id: { in: updatedIds } },
        include: { RitelModern: true, LokasiBarang: true, PembebananReturn: true, Product: true }
      });
      const updatedMap = new Map(updatedRecords.map((r: any) => [r.id, r]));
      for (let i = 0; i < data.length; i++) {
        const updated = updatedMap.get(data[i].id);
        if (updated) {
          (data as any)[i] = updated;
        }
      }
    }
  } catch (backfillErr) {
    console.error("Retur backfill error:", backfillErr);
  }
}
