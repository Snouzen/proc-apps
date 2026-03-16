import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";
import {
  cacheClearPrefix,
  cacheGet,
  cacheSet,
  singleFlight,
} from "@/lib/ttl-cache";
import {
  canonicalProductName,
  dedupeKey,
  upperClean,
  upperCleanOrNull,
} from "@/lib/text";

function parseDate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
      return null;
    }
    return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const tzOffsetHours = 7;
  const shifted = new Date(d.getTime() + tzOffsetHours * 3600 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company,
      inisial,
      siteArea,
      tujuan,
      noPo,
      tglPo,
      expiredTgl,
      linkPo,
      noInvoice,
      items, // Expecting array of { namaProduk, pcs, pcsKirim, hargaPcs }
      remarks,
      status,
      regional,
    } = body ?? {};

    if (
      !company ||
      !noPo ||
      !tglPo ||
      !expiredTgl ||
      !tujuan ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "company, noPo, tglPo, expiredTgl, tujuan, dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    const companyTrim = String(company).trim();
    const inisialTrim = String(inisial).trim();
    const tujuanTrim = String(tujuan).trim();
    const noPoTrim = String(noPo).trim();
    const originalNoPoTrim = String(
      (body as any)?.originalNoPo ?? noPoTrim,
    ).trim();
    const siteAreaTrim = String(siteArea || "").trim();

    const companyUpper = upperClean(companyTrim);
    const inisialUpper = upperCleanOrNull(inisialTrim);
    const tujuanUpper = upperClean(tujuanTrim);
    const siteAreaUpper = upperCleanOrNull(siteAreaTrim);

    const tglPoParsed = parseDate(tglPo);
    const expiredParsed = parseDate(expiredTgl);
    if (!tglPoParsed) {
      return NextResponse.json({ error: "tglPo tidak valid" }, { status: 400 });
    }
    if (!expiredParsed) {
      return NextResponse.json(
        { error: "expiredTgl tidak valid" },
        { status: 400 },
      );
    }

    let ritel =
      (await prisma.ritelModern.findFirst({
        where: inisialUpper
          ? {
              namaPt: { equals: companyUpper, mode: "insensitive" },
              inisial: { equals: inisialUpper, mode: "insensitive" },
            }
          : {
              namaPt: { equals: companyUpper, mode: "insensitive" },
            },
      })) || null;
    if (!ritel) {
      const kNama = dedupeKey(companyUpper);
      const kIni = dedupeKey(inisialUpper || "");
      const namaToken =
        companyUpper.split(/\s+/).filter(Boolean)[0] || companyUpper;
      const iniToken =
        (inisialUpper || "").split(/\s+/).filter(Boolean)[0] ||
        inisialUpper ||
        "";
      const candidates = await prisma.ritelModern.findMany({
        where: {
          namaPt: { contains: namaToken, mode: "insensitive" },
          ...(inisialUpper
            ? { inisial: { contains: iniToken, mode: "insensitive" } }
            : {}),
        } as any,
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      const match =
        candidates.find((r) => {
          const n = upperClean(r?.namaPt);
          const i = upperCleanOrNull(r?.inisial);
          return dedupeKey(n) === kNama && dedupeKey(i || "") === kIni;
        }) || null;
      if (match?.id) {
        ritel = await prisma.ritelModern.update({
          where: { id: match.id },
          data: {
            namaPt: companyUpper,
            inisial: inisialUpper,
            tujuan: tujuanUpper || null,
            updatedAt: new Date(),
          },
        });
      }
    }
    if (!ritel) {
      ritel = await prisma.ritelModern.create({
        data: {
          id: randomUUID(),
          namaPt: companyUpper,
          inisial: inisialUpper,
          tujuan: tujuanUpper || null,
          updatedAt: new Date(),
        },
      });
    }

    let unit: any = null;
    if (siteAreaUpper) {
      unit = await prisma.unitProduksi.findFirst({
        where: { siteArea: { equals: siteAreaUpper, mode: "insensitive" } },
      });
      if (!unit) {
        return NextResponse.json(
          { error: "Unit Produksi dengan siteArea tersebut belum terdaftar" },
          { status: 400 },
        );
      }
    } else {
      unit = await prisma.unitProduksi.findFirst({
        where: { idRegional: "UNKNOWN" },
      });
      if (!unit) {
        try {
          unit = await prisma.unitProduksi.create({
            data: {
              idRegional: "UNKNOWN",
              siteArea: "UNKNOWN",
              namaRegional: "Unknown",
              updatedAt: new Date(),
            } as any,
          });
        } catch {
          unit = await prisma.unitProduksi.findFirst({
            where: { idRegional: "UNKNOWN" },
          });
        }
      }
      if (!unit) {
        return NextResponse.json(
          { error: "Unit Produksi belum tersedia" },
          { status: 400 },
        );
      }
    }

    // Upsert PO Header
    const poData = {
      ritelId: ritel.id,
      unitProduksiId: unit.idRegional,
      tglPo: tglPoParsed as Date,
      expiredTgl: expiredParsed,
      linkPo: linkPo || null,
      noInvoice: noInvoice || null,
      tujuanDetail: tujuanUpper || null,
      regional: upperCleanOrNull(regional) || null,
      statusKirim: !!status?.kirim,
      statusSdif: !!status?.sdif,
      statusPo: !!status?.po,
      statusFp: !!status?.fp,
      statusKwi: !!status?.kwi,
      statusInv: !!status?.inv,
      statusTagih: !!status?.tagih,
      statusBayar: !!status?.bayar,
      remarks: remarks || null,
      updatedAt: new Date(),
    };

    const updatedPO = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.purchaseOrder.findUnique({
        where: { noPo: originalNoPoTrim },
        select: { id: true, noPo: true },
      });
      if (existing && noPoTrim !== existing.noPo) {
        const conflict = await tx.purchaseOrder.findUnique({
          where: { noPo: noPoTrim },
          select: { id: true },
        });
        if (conflict && conflict.id !== existing.id) {
          throw new Error("Nomor PO sudah dipakai");
        }
      }

      const po = existing
        ? await tx.purchaseOrder.update({
            where: { id: existing.id },
            data: { ...poData, noPo: noPoTrim },
          })
        : await tx.purchaseOrder.create({
            data: {
              id: randomUUID(),
              noPo: noPoTrim,
              ...poData,
              createdAt: new Date(),
            },
          });

      // Handle Items: Delete existing and recreate
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });

      let supportsDiscount = true;
      for (const item of items) {
        const { namaProduk, pcs, pcsKirim, hargaPcs } = item;

        const namaProdukUpper = canonicalProductName(namaProduk);
        const productKey = dedupeKey(namaProdukUpper);
        let product: any = null;
        const token =
          namaProdukUpper.split(/\s+/).filter(Boolean)[0] || namaProdukUpper;
        const candidates = await tx.product.findMany({
          where: { name: { contains: token, mode: "insensitive" } },
          select: { id: true, name: true, createdAt: true, satuanKg: true },
          orderBy: { createdAt: "asc" },
          take: 50,
        });
        const match =
          candidates.find(
            (p: any) => dedupeKey(canonicalProductName(p?.name)) === productKey,
          ) || null;
        if (match?.id) {
          product = await tx.product.update({
            where: { id: match.id },
            data: { name: namaProdukUpper, updatedAt: new Date() },
          });
        }
        if (!product) {
          product = await tx.product.findFirst({
            where: { name: { equals: namaProdukUpper, mode: "insensitive" } },
          });
        }
        if (product) {
          try {
            product = await tx.product.update({
              where: { id: product.id },
              data: { name: namaProdukUpper, updatedAt: new Date() },
            });
          } catch {
            product = await tx.product.findFirst({
              where: { name: namaProdukUpper },
            });
          }
        }
        if (!product) {
          product = await tx.product.create({
            data: {
              id: randomUUID(),
              name: namaProdukUpper,
              updatedAt: new Date(),
            },
          });
        }

        const satuan = Number((product as any).satuanKg ?? 1) || 1;
        const pcsNum = Number(pcs) || 0;
        const pcsKirimNum = Number(pcsKirim) || 0;
        const hargaPcsNum = Number(hargaPcs) || 0;
        const discountNum = Math.max(0, Number((item as any)?.discount) || 0);
        const hargaKg = satuan > 0 ? hargaPcsNum / satuan : 0;
        const nominal = Math.max(0, hargaPcsNum * pcsNum - discountNum);
        const rpTagih = Math.max(0, hargaPcsNum * pcsKirimNum - discountNum);

        const baseData: any = {
          id: randomUUID(),
          purchaseOrderId: po.id,
          productId: product.id,
          pcs: Math.round(pcsNum),
          pcsKirim: Math.round(pcsKirimNum),
          hargaKg,
          hargaPcs: hargaPcsNum,
          nominal,
          rpTagih,
        };

        try {
          await tx.purchaseOrderItem.create({
            data: supportsDiscount
              ? { ...baseData, discount: discountNum }
              : baseData,
          });
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (
            supportsDiscount &&
            msg.includes("Unknown argument") &&
            msg.includes("discount")
          ) {
            supportsDiscount = false;
            await tx.purchaseOrderItem.create({ data: baseData });
          } else {
            throw e;
          }
        }
      }

      // Return minimal payload to avoid Prisma Client column mismatches
      return { id: po.id, noPo: po.noPo };
    });

    cacheClearPrefix("po:");
    return NextResponse.json(updatedPO, { status: 201 });
  } catch (error) {
    const e: any = error;
    const payload = {
      error: e?.message ?? String(error ?? "Unknown error"),
      code: e?.code ?? null,
      meta: e?.meta ?? null,
      name: e?.name ?? null,
    };
    console.error("POST /api/po error:", payload);
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function GET(request: Request) {
  const cacheKey = `po:${request.url}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    const includeUnknown =
      (searchParams.get("includeUnknown") || "true") === "true";
    const regionalParam = searchParams.get("regional") || undefined;
    const q = (searchParams.get("q") || "").trim();
    const tglFrom = parseDate(searchParams.get("tglFrom"));
    const tglTo = parseDate(searchParams.get("tglTo"));
    const submitFrom = parseDate(searchParams.get("submitFrom"));
    const submitTo = parseDate(searchParams.get("submitTo"));
    const group = (searchParams.get("group") || "all").trim();
    const noPoListRaw = searchParams.get("noPoList") || undefined;
    let noPoList: string[] | undefined = undefined;
    if (noPoListRaw) {
      try {
        const parsed = JSON.parse(noPoListRaw);
        if (Array.isArray(parsed)) {
          noPoList = parsed.map((s) => String(s));
        }
      } catch {
        const parts = noPoListRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) noPoList = parts;
      }
    }
    const summary = (searchParams.get("summary") || "false") === "true";
    const includeItems =
      !summary && (searchParams.get("includeItems") || "true") === "true";
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit =
      limitRaw == null
        ? null
        : Math.max(1, Math.min(500, Number(limitRaw) || 0));
    const offset =
      offsetRaw == null ? null : Math.max(0, Number(offsetRaw) || 0);
    const paged = limit != null || offset != null;
    const sort = (searchParams.get("sort") || "createdAt_desc").trim();

    const where: any = {};
    if (noPo) where.noPo = noPo;
    if (noPoList && noPoList.length > 0) where.noPo = { in: noPoList };
    if (tglFrom || tglTo) {
      where.tglPo = {
        ...(tglFrom ? { gte: tglFrom } : {}),
        ...(tglTo ? { lte: tglTo } : {}),
      };
    }
    if (submitFrom || submitTo) {
      where.createdAt = {
        ...(submitFrom ? { gte: submitFrom } : {}),
        ...(submitTo ? { lte: submitTo } : {}),
      };
    }
    if (regionalParam && regionalParam.trim()) {
      const rp = regionalParam.trim().toLowerCase();
      const syn = (() => {
        if (
          rp.includes("bandung") ||
          rp.includes("reg 1") ||
          rp.includes("regional 1") ||
          rp.includes(" i")
        ) {
          return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
        }
        if (
          rp.includes("surabaya") ||
          rp.includes("reg 2") ||
          rp.includes("regional 2") ||
          rp.includes(" ii")
        ) {
          return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
        }
        if (
          rp.includes("makassar") ||
          rp.includes("reg 3") ||
          rp.includes("regional 3") ||
          rp.includes(" iii")
        ) {
          return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
        }
        return [regionalParam.trim()];
      })();
      where.OR = [
        ...syn.map((s) => ({
          regional: { contains: s, mode: "insensitive" as const },
        })),
        {
          UnitProduksi: {
            is: {
              OR: syn.map((s) => ({
                namaRegional: { contains: s, mode: "insensitive" as const },
              })),
            },
          },
        },
      ];
    }
    if (company && company.trim()) {
      where.RitelModern = {
        is: {
          namaPt: {
            equals: company.trim(),
            mode: "insensitive",
          },
        },
      };
    }
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { noPo: { contains: q, mode: "insensitive" as const } },
            { noInvoice: { contains: q, mode: "insensitive" as const } },
            { tujuanDetail: { contains: q, mode: "insensitive" as const } },
            { regional: { contains: q, mode: "insensitive" as const } },
            {
              RitelModern: {
                is: {
                  OR: [
                    { namaPt: { contains: q, mode: "insensitive" as const } },
                    { inisial: { contains: q, mode: "insensitive" as const } },
                    { tujuan: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
            {
              UnitProduksi: {
                is: {
                  OR: [
                    { siteArea: { contains: q, mode: "insensitive" as const } },
                    {
                      namaRegional: {
                        contains: q,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
            {
              Items: {
                some: {
                  Product: {
                    is: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }
    const emptyInvoiceValues = ["", "-", "Unknown"];
    if (group === "completed") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { noInvoice: { not: null } },
        { noInvoice: { notIn: emptyInvoiceValues } },
      ];
    } else if (group === "in_progress") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
      ];
    } else if (group === "almost_expired") {
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const endOfSoon = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 14,
          23,
          59,
          59,
          999,
        ),
      );
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday, lte: endOfSoon } },
      ];
    } else if (group === "assign") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { unitProduksiId: "UNKNOWN" },
            {
              UnitProduksi: {
                is: {
                  siteArea: { in: ["UNKNOWN", ""] },
                },
              },
            },
          ],
        },
      ];
    }
    if (!includeUnknown) {
      where.NOT = [
        {
          OR: [
            { unitProduksiId: "UNKNOWN" },
            { tujuanDetail: null },
            { tujuanDetail: { in: ["", "-", "Unknown"] } },
            {
              RitelModern: {
                is: { namaPt: { in: ["", "-", "Unknown"] } },
              },
            },
          ],
        },
      ];
    }

    const orderBy =
      sort === "createdAt_asc"
        ? ({ createdAt: "asc" } as const)
        : sort === "company_asc"
          ? ({ RitelModern: { namaPt: "asc" } } as const)
          : sort === "company_desc"
            ? ({ RitelModern: { namaPt: "desc" } } as const)
            : sort === "tglPo_desc"
              ? ({ tglPo: "desc" } as const)
              : sort === "tglPo_asc"
                ? ({ tglPo: "asc" } as const)
                : ({ createdAt: "desc" } as const);

    const attachSummary = async (rows: any[]) => {
      const ids = rows.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) return rows;
      const agg = await prisma.purchaseOrderItem.groupBy({
        by: ["purchaseOrderId"],
        where: { purchaseOrderId: { in: ids } },
        _sum: {
          nominal: true,
          rpTagih: true,
          pcs: true,
          pcsKirim: true,
        },
        _count: { _all: true },
      });
      const byId = new Map(
        agg.map((a) => [
          a.purchaseOrderId,
          {
            itemsCount: a._count?._all ?? 0,
            totalNominal: a._sum?.nominal ?? 0,
            totalTagihan: a._sum?.rpTagih ?? 0,
            pcsTotal: a._sum?.pcs ?? 0,
            pcsKirimTotal: a._sum?.pcsKirim ?? 0,
          },
        ]),
      );
      return rows.map((r) => {
        const s = byId.get(r.id) || {
          itemsCount: 0,
          totalNominal: 0,
          totalTagihan: 0,
          pcsTotal: 0,
          pcsKirimTotal: 0,
        };
        return { ...r, ...s };
      });
    };

    if (!paged) {
      const data = await singleFlight(cacheKey, () =>
        prisma.purchaseOrder.findMany(
          summary
            ? ({
                where,
                select: {
                  id: true,
                  noPo: true,
                  createdAt: true,
                  updatedAt: true,
                  tglPo: true,
                  expiredTgl: true,
                  linkPo: true,
                  noInvoice: true,
                  tujuanDetail: true,
                  regional: true,
                  unitProduksiId: true,
                  statusKirim: true,
                  statusSdif: true,
                  statusPo: true,
                  statusFp: true,
                  statusKwi: true,
                  statusInv: true,
                  statusTagih: true,
                  statusBayar: true,
                  RitelModern: {
                    select: { namaPt: true, inisial: true, tujuan: true },
                  },
                  UnitProduksi: {
                    select: { siteArea: true, namaRegional: true },
                  },
                },
                orderBy,
              } as any)
            : ({
                where,
                include: {
                  ...(includeItems
                    ? { Items: { include: { Product: true } } }
                    : {}),
                  RitelModern: true,
                  UnitProduksi: true,
                } as any,
                orderBy,
              } as any),
        ),
      );
      return NextResponse.json(
        summary ? await attachSummary(data as any) : data,
      );
    }

    const take = limit ?? 50;
    const skip = offset ?? 0;
    const [total, data] = await singleFlight(cacheKey, () =>
      prisma.$transaction([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany(
          summary
            ? ({
                where,
                select: {
                  id: true,
                  noPo: true,
                  createdAt: true,
                  updatedAt: true,
                  tglPo: true,
                  expiredTgl: true,
                  linkPo: true,
                  noInvoice: true,
                  tujuanDetail: true,
                  regional: true,
                  unitProduksiId: true,
                  statusKirim: true,
                  statusSdif: true,
                  statusPo: true,
                  statusFp: true,
                  statusKwi: true,
                  statusInv: true,
                  statusTagih: true,
                  statusBayar: true,
                  RitelModern: {
                    select: { namaPt: true, inisial: true, tujuan: true },
                  },
                  UnitProduksi: {
                    select: { siteArea: true, namaRegional: true },
                  },
                },
                orderBy,
                take,
                skip,
              } as any)
            : ({
                where,
                include: {
                  ...(includeItems
                    ? { Items: { include: { Product: true } } }
                    : {}),
                  RitelModern: true,
                  UnitProduksi: true,
                } as any,
                orderBy,
                take,
                skip,
              } as any),
        ),
      ]),
    );
    const payload = {
      total,
      data: summary ? await attachSummary(data as any) : data,
      limit: take,
      offset: skip,
    };
    cacheSet(cacheKey, payload, 15000);
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    const noPo = body?.noPo as string | undefined;
    if (!id && !noPo) {
      return NextResponse.json(
        { error: "id atau noPo wajib disertakan" },
        { status: 400 },
      );
    }
    const po = id
      ? await prisma.purchaseOrder.findUnique({ where: { id } })
      : await prisma.purchaseOrder.findUnique({ where: { noPo: noPo! } });
    if (!po) {
      return NextResponse.json(
        { error: "PO tidak ditemukan" },
        { status: 404 },
      );
    }
    await prisma.$transaction(async (tx: any) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });
      await tx.purchaseOrder.delete({ where: { id: po.id } });
    });
    cacheClearPrefix("po:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
