import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { getSessionWithRole } from "@/lib/auth";
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
import { POBodySchema } from "@/lib/schemas/po";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { ensureInvoiceNumber } from "@/lib/generatePoInvoiceNumber";




export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;
    const raw = await request.json();
    const parsed = POBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Payload tidak valid: " +
            parsed.error.issues
              .map((i) => i.path.join(".") + " " + i.message)
              .join(", "),
        },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const {
      company,
      inisial,
      siteArea,
      tujuan,
      noPo,
      originalNoPo,
      tglPo,
      expiredTgl,
      linkPo,
      noInvoice,
      items,
      remarks,
      status,
      regional,
      tglKirim,
      buktiTagih,
      buktiBayar,
      buktiKirim,
      buktiFp,
      namaSupir,
      platNomor,
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

    let effectiveRegional = regional;
    if (safeRole === "rm" && (dbUser?.regional || (session as any).regional)) {
      effectiveRegional = dbUser?.regional || (session as any).regional;
    }

    const JUNK_STRINGS = ["unknown", "site area belum ada unit produksi", "belum ada", "n/a", "none", "-", ""];
    const sanitizeToNull = (val: string | null | undefined): string | null => {
      if (!val) return null;
      const cleaned = val.trim();
      if (!cleaned) return null;
      if (JUNK_STRINGS.includes(cleaned.toLowerCase())) return null;
      return cleaned;
    };

    const companyTrim = String(company).trim();
    const inisialTrim = String(inisial).trim();
    const tujuanTrim = String(tujuan).trim();
    const noPoTrim = String(noPo).trim();
    const originalNoPoTrim = String(originalNoPo ?? noPoTrim).trim();
    const siteAreaTrim = sanitizeToNull(String(siteArea || "")) ?? "";

    const companyUpper = upperClean(companyTrim);
    const inisialUpper = upperCleanOrNull(inisialTrim);
    const tujuanUpper = upperClean(tujuanTrim);
    const siteAreaUpper = sanitizeToNull(siteAreaTrim) ? upperCleanOrNull(siteAreaTrim) : null;

    const tglPoParsed = parseYmdOrIsoToUtcNoon(tglPo);
    const expiredParsed = parseYmdOrIsoToUtcNoon(expiredTgl);
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

    const poRitelId = ritel.id;
    const poUnitProduksiId = unit.idRegional;
    const poTglPo = tglPoParsed as Date;
    const poExpiredTgl = expiredParsed;
    const poLinkPo = linkPo || null;
    const poNoInvoice = noInvoice || null;
    const poTujuanDetail = tujuanUpper || null;
    const poRegional = sanitizeToNull(effectiveRegional) ? (upperCleanOrNull(sanitizeToNull(effectiveRegional)!) || null) : null;
    const poStatusKirim = !!status?.kirim;
    const poStatusSdif = !!status?.sdif;
    const poStatusPo = !!status?.po;
    const poStatusFp = !!status?.fp;
    const poStatusKwi = !!status?.kwi;
    const poStatusInv = !!status?.inv;
    const poStatusTagih = !!status?.tagih;
    const poStatusBayar = !!status?.bayar;
    const poRemarks = remarks || null;
    const poTglKirim = tglKirim ? parseYmdOrIsoToUtcNoon(tglKirim) : undefined;
    const poUpdatedAt = new Date();

    const updatedPO = await prisma.$transaction(
      async (tx: any) => {
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

        let finalNoFaktur = existing?.noFaktur || null;

        if (poTglKirim && !finalNoFaktur) {
            finalNoFaktur = await ensureInvoiceNumber(tx, {
               noFaktur: finalNoFaktur,
               unitProduksiId: poUnitProduksiId
            }, poTglKirim);
        }

        const po = existing
          ? await tx.purchaseOrder.update({
              where: { id: existing.id },
              data: {
                noPo: noPoTrim,
                ritelId: poRitelId,
                unitProduksiId: poUnitProduksiId,
                tglPo: poTglPo,
                expiredTgl: poExpiredTgl,
                linkPo: poLinkPo,
                noInvoice: poNoInvoice,
                noFaktur: finalNoFaktur,
                tujuanDetail: poTujuanDetail,
                regional: poRegional,
                statusKirim: poStatusKirim,
                statusSdif: poStatusSdif,
                statusPo: poStatusPo,
                statusFp: poStatusFp,
                statusKwi: poStatusKwi,
                statusInv: poStatusInv,
                statusTagih: poStatusTagih,
                statusBayar: poStatusBayar,
                remarks: poRemarks,
                buktiTagih,
                buktiBayar,
                buktiKirim,
                buktiFp,
                ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
                updatedAt: poUpdatedAt,
              },
            })
          : await tx.purchaseOrder.upsert({
              where: { noPo: noPoTrim },
              create: {
                id: randomUUID(),
                noPo: noPoTrim,
                ritelId: poRitelId,
                unitProduksiId: poUnitProduksiId,
                tglPo: poTglPo,
                expiredTgl: poExpiredTgl,
                linkPo: poLinkPo,
                noInvoice: poNoInvoice,
                noFaktur: finalNoFaktur,
                tujuanDetail: poTujuanDetail,
                regional: poRegional,
                statusKirim: poStatusKirim,
                statusSdif: poStatusSdif,
                statusPo: poStatusPo,
                statusFp: poStatusFp,
                statusKwi: poStatusKwi,
                statusInv: poStatusInv,
                statusTagih: poStatusTagih,
                statusBayar: poStatusBayar,
                remarks: poRemarks,
                buktiTagih,
                buktiBayar,
                buktiKirim,
                buktiFp,
                ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
                updatedAt: poUpdatedAt,
                createdAt: new Date(),
              },
              update: {
                ritelId: poRitelId,
                unitProduksiId: poUnitProduksiId,
                tglPo: poTglPo,
                expiredTgl: poExpiredTgl,
                linkPo: poLinkPo,
                noInvoice: poNoInvoice,
                noFaktur: finalNoFaktur,
                tujuanDetail: poTujuanDetail,
                regional: poRegional,
                statusKirim: poStatusKirim,
                statusSdif: poStatusSdif,
                statusPo: poStatusPo,
                statusFp: poStatusFp,
                statusKwi: poStatusKwi,
                statusInv: poStatusInv,
                statusTagih: poStatusTagih,
                statusBayar: poStatusBayar,
                remarks: poRemarks,
                buktiTagih,
                buktiBayar,
                buktiKirim,
                buktiFp,
                ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
                updatedAt: poUpdatedAt,
              },
            });

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: po.id },
        });

        const names = Array.from(
          new Set(items.map((it: any) => canonicalProductName(it.namaProduk))),
        );
        const existingProducts = await tx.product.findMany({
          where: { name: { in: names } },
          select: { id: true, name: true, satuanKg: true },
        });
        type ProdLite = { id: string; name: string; satuanKg?: number };
        const existingMap: Map<string, ProdLite> = new Map(
          existingProducts.map((p: any) => [p.name, p as ProdLite]),
        );
        const missing = names.filter((n) => !existingMap.has(n));
        if (missing.length > 0) {
          await tx.product.createMany({
            data: missing.map((n) => ({
              id: randomUUID(),
              name: n,
              updatedAt: new Date(),
            })),
            skipDuplicates: true,
          });
          const created = await tx.product.findMany({
            where: { name: { in: missing } },
            select: { id: true, name: true, satuanKg: true },
          });
          for (const p of created) existingMap.set(p.name, p as ProdLite);
        }

        const parseAmt = (v: any) => {
          if (typeof v === "number") return v;
          return Number(String(v || "").replace(/[^0-9]/g, "")) || 0;
        };

        const rows = items.map((item: any) => {
          const nm = canonicalProductName(item.namaProduk);
          const product = existingMap.get(nm)!;
          const satuan =
            Number((product?.satuanKg as number | undefined) ?? 1) || 1;
          const pcsNum = Number(item.pcs) || 0;
          const pcsKirimNum = Number(item.pcsKirim || 0) || 0;
          const hargaPcsNum = Number(item.hargaPcs) || 0;
          const discountNum = parseAmt(item.discount);
          const hargaKg = satuan > 0 ? hargaPcsNum / satuan : 0;
          const divider = pcsNum || 1;
          const nominal = Math.max(0, hargaPcsNum * pcsNum - discountNum);
          const proportionalDiscount = (discountNum / divider) * pcsKirimNum;
          const rpTagih = Math.max(0, hargaPcsNum * pcsKirimNum - proportionalDiscount);
          return {
            id: randomUUID(),
            purchaseOrderId: po.id,
            productId: product.id,
            pcs: Math.round(pcsNum),
            pcsKirim: Math.round(pcsKirimNum),
            hargaKg,
            hargaPcs: hargaPcsNum,
            nominal,
            rpTagih,
            discount: discountNum,
          };
        });

        try {
          await tx.purchaseOrderItem.createMany({
            data: rows,
            skipDuplicates: true,
          });
        } catch {
          const rowsNoDisc = rows.map(({ discount, ...rest }) => rest);
          await tx.purchaseOrderItem.createMany({
            data: rowsNoDisc as any,
            skipDuplicates: true,
          });
        }

        return { id: po.id, noPo: po.noPo };
      },
      { timeout: 20000 },
    );

    cacheClearPrefix("po:");
    cacheClearPrefix("po_total:");
    cacheClearPrefix("po_stats:");
    cacheClearPrefix("ritel:");
    cacheClearPrefix("company");
    return NextResponse.json(updatedPO, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser, email } = auth;

    const { searchParams } = new URL(request.url);

    let overrideRegional: string | null = null;
    let overrideSiteArea: string | null = null;
    if (safeRole === 'sitearea') {
      overrideRegional = dbUser?.regional || (session as any)?.user_metadata?.regional || null;
      overrideSiteArea = dbUser?.siteArea || (session as any)?.user_metadata?.siteArea || null;
    } else if (safeRole === 'rm') {
      overrideRegional = dbUser?.regional || (session as any)?.regional || null;
    }

    const regionalParam = overrideRegional || (searchParams.get("regional") || undefined);
    const siteAreaParam = overrideSiteArea || (searchParams.get("siteArea") || undefined);

    const cacheKey = `po:${safeRole}:${regionalParam || "all"}:${siteAreaParam || "all"}:${searchParams.toString()}`;
    const cached = cacheGet<any>(cacheKey);
    const totalParams = new URLSearchParams(searchParams);
    totalParams.delete("limit");
    totalParams.delete("offset");
    totalParams.delete("sort");
    totalParams.delete("summary");
    totalParams.delete("includeItems");
    const totalCacheKey = `po_total:${safeRole}:${regionalParam || "all"}:${siteAreaParam || "all"}:${totalParams.toString()}`;
    const cachedTotal = cacheGet<number>(totalCacheKey);

    const company = searchParams.get("company") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    const includeUnknown =
      (searchParams.get("includeUnknown") || "true") === "true";
    const q = (searchParams.get("q") || "").trim();
    const tglFrom = parseYmdOrIsoToUtcNoon(searchParams.get("tglFrom"));
    const tglTo = parseYmdOrIsoToUtcNoon(searchParams.get("tglTo"));
    const submitFrom = parseYmdOrIsoToUtcNoon(searchParams.get("submitFrom"));
    const submitTo = parseYmdOrIsoToUtcNoon(searchParams.get("submitTo"));
    const group = (searchParams.get("group") || "all").trim();
    const pcsKirimParam = searchParams.get("pcsKirim") || undefined;
    const status = searchParams.get("status") || undefined;
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const retailerIdRaw = searchParams.get("retailerId") || undefined;
    const retailerIds = retailerIdRaw ? retailerIdRaw.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    const inisial = searchParams.get("inisial") || undefined;

    let colFilters: Record<string, string> = {};
    const colFiltersRaw = searchParams.get("colFilters");
    if (colFiltersRaw) {
      try {
        colFilters = JSON.parse(colFiltersRaw);
      } catch (e) {
      }
    }
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

    const statsKeyParams = new URLSearchParams();
    statsKeyParams.set("includeUnknown", includeUnknown ? "true" : "false");
    if (tglFrom)
      statsKeyParams.set("tglFrom", searchParams.get("tglFrom") || "");
    if (tglTo) statsKeyParams.set("tglTo", searchParams.get("tglTo") || "");
    const statsCacheKey = `po_stats:${safeRole}:${regionalParam || "all"}:${siteAreaParam || "all"}:${statsKeyParams.toString()}`;
    const canApproxFromStats =
      !q &&
      !company &&
      !noPo &&
      (!noPoList || noPoList.length === 0) &&
      !submitFrom &&
      !submitTo &&
      !regionalParam &&
      includeUnknown &&
      (group === "all" ||
        group === "active" ||
        group === "almost_expired" ||
        group === "expired" ||
        group === "completed");
    const approxTotal = canApproxFromStats
      ? (() => {
          const s = cacheGet<any>(statsCacheKey);
          if (!s) return undefined;
          if (group === "active") return Number(s.cActive) || 0;
          if (group === "almost_expired") return Number(s.cAlmost) || 0;
          if (group === "expired") return Number(s.cExpired) || 0;
          if (group === "completed") return Number(s.cCompleted) || 0;
          return Number(s.cAll) || 0;
        })()
      : undefined;
    const summary = (searchParams.get("summary") || "false") === "true";
    const includeItems =
      !summary && (searchParams.get("includeItems") || "true") === "true";
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit =
      limitRaw == null
        ? null
        : Math.max(1, Math.min(1000, Number(limitRaw) || 0));
    const offset =
      offsetRaw == null ? null : Math.max(0, Number(offsetRaw) || 0);
    const paged = limit != null || offset != null;
    const sort = (searchParams.get("sort") || "createdAt_desc").trim();

    const where: any = {};
    if (retailerIds && retailerIds.length > 0) {
      where.ritelId = retailerIds.length === 1 ? retailerIds[0] : { in: retailerIds };
    }
    if (inisial) {
      where.RitelModern = {
        is: { inisial: { equals: inisial, mode: "insensitive" } },
      };
    }
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

    const filterBy = (searchParams.get("filterBy") || "tglkirim").trim();
    if (monthParam && yearParam) {
      const y = parseInt(yearParam);
      const m = parseInt(monthParam);
      if (!isNaN(y) && !isNaN(m)) {
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));

        const dateField = filterBy === "expired" ? "expiredTgl" : "tglkirim";

        where.AND = [
          ...(where.AND || []),
          {
            [dateField]: {
              gte: startDate,
              lt: endDate,
            },
          },
        ];
      }
    }


    if (regionalParam && regionalParam.trim()) {
      const syn = getRegionalSynonyms(regionalParam);
      where.OR = [
        ...syn.map((s) => ({
          regional: { contains: s, mode: "insensitive" as const },
        })),
        {
          UnitProduksi: {
            OR: syn.map((s) => ({
              namaRegional: { contains: s, mode: "insensitive" as const },
            })),
          },
        },
      ];
    }
    if (safeRole === "rm" && overrideRegional) {
      const syn = getRegionalSynonyms(overrideRegional);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            ...syn.map((s) => ({
              regional: { contains: s, mode: "insensitive" as const },
            })),
            {
              UnitProduksi: {
                OR: syn.map((s) => ({
                  namaRegional: { contains: s, mode: "insensitive" as const },
                })),
              },
            },
          ],
        },
      ];
    }
    if (safeRole === "sitearea" && overrideSiteArea) {
      const sa = overrideSiteArea.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          UnitProduksi: {
            siteArea: { contains: sa, mode: "insensitive" as const },
          },
        },
      ];
      if (overrideRegional) {
        const syn = getRegionalSynonyms(overrideRegional);
        where.AND.push({
          OR: [
            ...syn.map((s) => ({ regional: { contains: s, mode: "insensitive" as const } })),
            { UnitProduksi: { OR: syn.map((s) => ({ namaRegional: { contains: s, mode: "insensitive" as const } })) } }
          ]
        });
      }
    }
    
    if ((safeRole === "pusat" || safeRole === "rm") && siteAreaParam && siteAreaParam.trim()) {
      const sa = siteAreaParam.trim();
      const saFilter = {
        UnitProduksi: {
          siteArea: { contains: sa, mode: "insensitive" as const },
        },
      };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), saFilter];
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
      const qLower = q.toLowerCase();
      const isDashSearch = q === "-";
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { noPo: { contains: q, mode: "insensitive" as const } },
            { noInvoice: { contains: q, mode: "insensitive" as const } },
            { tujuanDetail: { contains: q, mode: "insensitive" as const } },
            { regional: { contains: q, mode: "insensitive" as const } },
            ...(isDashSearch ? [{ regional: null }, { regional: "" }] : []),
            { remarks: { contains: q, mode: "insensitive" as const } },
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
                OR: [
                  { siteArea: { contains: q, mode: "insensitive" as const } },
                  ...(isDashSearch ? [{ siteArea: null }, { siteArea: "" }] : []),
                  {
                    namaRegional: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
            {
              Items: {
                some: {
                  Product: {
                    name: { contains: q, mode: "insensitive" as const },
                  },
                },
              },
            },
          ],
        },
      ];
    }
    const emptyInvoiceValues = ["", "-", "Unknown"];
    const emptyRegionalValues = ["", "-", "Unknown", "UNKNOWN"];
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
    if (group === "completed" || group === "done") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { noInvoice: { not: null } },
        { noInvoice: { notIn: emptyInvoiceValues } },
      ];
    } else if (group === "active" || group === "in_progress" || status === "active") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { 
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        {
          OR: [{ expiredTgl: null }, { expiredTgl: { gte: startOfToday } }],
        },
        { unitProduksiId: { not: "UNKNOWN" } },
        {
          UnitProduksi: {
            isNot: { siteArea: "UNKNOWN" }
          }
        }
      ];
    } else if (group === "schedule_page") {
      const startOfPast14Days = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 14, 0, 0, 0, 0)
      );
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { 
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        {
          OR: [
            { expiredTgl: null },
            { expiredTgl: { gte: startOfToday } },
            { 
              AND: [
                { expiredTgl: { gte: startOfPast14Days, lt: startOfToday } },
                { tglkirim: null }
              ]
            }
          ]
        },
        { unitProduksiId: { not: "UNKNOWN" } },
        {
          UnitProduksi: {
            isNot: { siteArea: "UNKNOWN" }
          }
        }
      ];
    } else if (group === "almost_expired") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday, lte: endOfSoon } },
      ];
    } else if (group === "expired") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { lt: startOfToday } },
      ];
    } else if (group === "assign") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday } },
        {
          OR: [
            { regional: null },
            { regional: { in: emptyRegionalValues } },
            { unitProduksiId: "UNKNOWN" },
            {
              UnitProduksi: {
                is: {
                  namaRegional: { in: emptyRegionalValues },
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

    if (pcsKirimParam) {
      const pNum = Number(pcsKirimParam);
      if (!isNaN(pNum)) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          { Items: { some: { pcsKirim: pNum } } },
        ];
      }
    }

    if (colFilters && Object.keys(colFilters).length > 0) {
      const AND = Array.isArray(where.AND) ? where.AND : [];
      for (const [key, val] of Object.entries(colFilters)) {
        let vals: string[] = [];
        if (Array.isArray(val)) {
          vals = val.map(String).map((v) => v.trim()).filter(Boolean);
        } else {
          const strVal = String(val).trim();
          if (strVal) vals.push(strVal);
        }
        if (vals.length === 0) continue;

        const isBool = (v: string) => {
          const norm = v.toLowerCase();
          return ["1", "true", "ya", "yes", "y"].includes(norm)
            ? true
            : ["0", "false", "tidak", "no", "n"].includes(norm)
              ? false
              : null;
        };

        const orConditions = [];

        for (const strVal of vals) {
          if (
            key === "noPo" ||
            key === "tujuan" ||
            key === "tujuanDetail" ||
            key === "noInvoice" ||
            key === "linkPo" ||
            key === "remarks" ||
            key === "buktiTagih" ||
            key === "buktiBayar" ||
            key === "namaSupir" ||
            key === "platNomor"
          ) {
            const dbKey = key === "tujuan" ? "tujuanDetail" : key;
            orConditions.push({ [dbKey]: { contains: strVal, mode: "insensitive" } });
          } else if (key === "company" || key === "inisial") {
            const dbKey = key === "company" ? "namaPt" : "inisial";
            orConditions.push({
              RitelModern: {
                is: { [dbKey]: { contains: strVal, mode: "insensitive" } },
              },
            });
          } else if (key === "siteArea") {
            orConditions.push({
              UnitProduksi: {
                is: { siteArea: { contains: strVal, mode: "insensitive" } },
              },
            });
          } else if (key === "regional") {
            orConditions.push({
              OR: [
                { regional: { contains: strVal, mode: "insensitive" } },
                {
                  UnitProduksi: {
                    is: {
                      namaRegional: { contains: strVal, mode: "insensitive" },
                    },
                  },
                },
              ],
            });
          } else if (key === "products" || key === "namaProduk") {
            orConditions.push({
              Items: {
                some: {
                  Product: {
                    is: { name: { contains: strVal, mode: "insensitive" } },
                  },
                },
              },
            });
          } else if (key.startsWith("status")) {
            const bVal = isBool(strVal);
            if (bVal !== null) {
              orConditions.push({ [key]: bVal });
            }
          }
        }

        if (orConditions.length > 0) {
          if (orConditions.length === 1) {
            AND.push(orConditions[0]);
          } else {
            AND.push({ OR: orConditions });
          }
        }
      }
      if (AND.length > 0) {
        where.AND = AND;
      }
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

      const hasItemsIncluded = rows.length > 0 && Array.isArray(rows[0].Items) && rows[0].Items.length > 0 && rows[0].Items[0].Product;
      
      let allItems: any[] = [];
      if (hasItemsIncluded) {
        allItems = rows.flatMap(r => r.Items.map((it: any) => ({ ...it, purchaseOrderId: r.id })));
      } else {
        allItems = await prisma.purchaseOrderItem.findMany({
          where: { purchaseOrderId: { in: ids } },
          select: {
            id: true,
            purchaseOrderId: true,
            pcs: true,
            pcsKirim: true,
            nominal: true,
            rpTagih: true,
            hargaPcs: true,
            discount: true,
            createdAt: true,
            Product: { select: { name: true, satuanKg: true } }
          },
          orderBy: { createdAt: 'asc' }
        });
      }

      const agg = new Map<string, any>();
      for (let i = 0; i < allItems.length; i++) {
        const it = allItems[i];
        const poId = String(it.purchaseOrderId);
        
        if (!agg.has(poId)) {
          agg.set(poId, {
            itemsCount: 0, totalNominal: 0, totalTagihan: 0,
            pcsTotal: 0, pcsKirimTotal: 0, totalDiscount: 0,
            totalKg: 0, totalKgKirim: 0, 
            firstProductName: it.Product?.name || null,
            Items: []
          });
        }
        
        const s = agg.get(poId);
        s.itemsCount += 1;
        s.totalNominal += Number(it.nominal) || 0;
        s.totalTagihan += Number(it.rpTagih) || 0;
        s.pcsTotal += Number(it.pcs) || 0;
        s.pcsKirimTotal += Number(it.pcsKirim) || 0;
        s.totalDiscount += Number(it.discount) || 0;

        const satuan = Number(it.Product?.satuanKg) || 1;
        s.totalKg += (Number(it.pcs) || 0) * satuan;
        s.totalKgKirim += (Number(it.pcsKirim) || 0) * satuan;
        
        s.Items.push({
          id: it.id,
          pcs: it.pcs,
          pcsKirim: it.pcsKirim,
          namaProduk: it.Product?.name,
          nominal: it.nominal,
          hargaPcs: it.hargaPcs,
          rpTagih: it.rpTagih,
          discount: it.discount,
          Product: it.Product
        });
      }

      return rows.map((r) => {
        const s = agg.get(String(r.id)) || {
          itemsCount: 0, totalNominal: 0, totalTagihan: 0,
          pcsTotal: 0, pcsKirimTotal: 0, totalDiscount: 0,
          totalKg: 0, totalKgKirim: 0, firstProductName: null,
          Items: []
        };
        return { ...r, ...s };
      });
    };

    if (!paged) {
      if (cached) return NextResponse.json(cached);
      const data = await prisma.purchaseOrder.findMany(
          summary
            ? ({
                where,
                select: {
                  id: true,
                  noPo: true,
                  createdAt: true,
                  tglPo: true,
                  expiredTgl: true,
                  linkPo: true,
                  noInvoice: true,
                  noFaktur: true,
                  tujuanDetail: true,
                  regional: true,
                  statusCreditLimit: true,
                  remarksCreditLimit: true,
                  kodeVendor: true,
                  remarks: true,
                  buktiTagih: true,
                  buktiBayar: true,
                  buktiKirim: true,
                  buktiFp: true,
                  tglkirim: true,
                  namaSupir: true,
                  platNomor: true,
                  RitelModern: { select: { namaPt: true, inisial: true } },
                  UnitProduksi: { select: { siteArea: true, namaRegional: true } },
                  CreditLimitBatch: { select: { batchCode: true, status: true } },
                },
                orderBy,
              } as any)
            : ({
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
                  noFaktur: true,
                  tujuanDetail: true,
                  regional: true,
                  statusKirim: true,
                  statusSdif: true,
                  statusPo: true,
                  statusFp: true,
                  statusKwi: true,
                  statusInv: true,
                  statusTagih: true,
                  statusBayar: true,
                  statusCreditLimit: true,
                  remarksCreditLimit: true,
                  kodeVendor: true,
                  tglkirim: true,
                  remarks: true,
                  buktiTagih: true,
                  buktiBayar: true,
                  buktiKirim: true,
                  buktiFp: true,
                  namaSupir: true,
                  platNomor: true,
                  ...(includeItems
                    ? {
                        Items: {
                          select: {
                            id: true,
                            pcs: true,
                            pcsKirim: true,
                            hargaKg: true,
                            hargaPcs: true,
                            nominal: true,
                            rpTagih: true,
                            discount: true,
                            Product: { select: { id: true, name: true, satuanKg: true } },
                          },
                        },
                      }
                    : {}),
                  RitelModern: {
                    select: { id: true, namaPt: true, inisial: true, tujuan: true },
                  },
                  UnitProduksi: {
                    select: { idRegional: true, namaRegional: true, siteArea: true, alamat: true },
                  },
                  CreditLimitBatch: { select: { batchCode: true, status: true } },
                },
                orderBy,
              } as any),
        );
      const payload = summary ? await attachSummary(data as any) : data;
      cacheSet(cacheKey, payload, 15000);
      return NextResponse.json(payload);
    }

    const take = limit ? Math.min(5000, limit) : 50;
    const skip = offset ?? 0;

    if (cached) return NextResponse.json(cached);

    const [total, data] = await (async () => {
      const t =
        cachedTotal ??
        (typeof approxTotal === "number" ? approxTotal : undefined) ??
        (await prisma.purchaseOrder.count({ where }));
      const d = await prisma.purchaseOrder.findMany(
        summary
          ? ({
              where,
              select: {
                id: true,
                noPo: true,
                createdAt: true,
                tglPo: true,
                expiredTgl: true,
                linkPo: true,
                noInvoice: true,
                noFaktur: true,
                tujuanDetail: true,
                regional: true,
                statusCreditLimit: true,
                remarksCreditLimit: true,
                kodeVendor: true,
                remarks: true,
                buktiTagih: true,
                buktiBayar: true,
                buktiKirim: true,
                buktiFp: true,
                // [RESTORE FIELD JADWAL]
                tglkirim: true,
                namaSupir: true,
                platNomor: true,
                // ----------------------
                RitelModern: { select: { namaPt: true, inisial: true } },
                UnitProduksi: { select: { siteArea: true, namaRegional: true } },
                CreditLimitBatch: { select: { batchCode: true, status: true } },
              },
              orderBy,
              take,
              skip,
            } as any)
          : ({
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
                noFaktur: true,
                tujuanDetail: true,
                regional: true,
                statusKirim: true,
                statusSdif: true,
                statusPo: true,
                statusFp: true,
                statusKwi: true,
                statusInv: true,
                statusTagih: true,
                statusBayar: true,
                statusCreditLimit: true,
                remarksCreditLimit: true,
                kodeVendor: true,
                tglkirim: true,
                remarks: true,
                 buktiTagih: true,
                buktiBayar: true,
                buktiKirim: true,
                buktiFp: true,
                namaSupir: true,
                platNomor: true,
                ...(includeItems
                  ? {
                      Items: {
                        select: {
                          id: true,
                          pcs: true,
                          pcsKirim: true,
                          hargaKg: true,
                          hargaPcs: true,
                          nominal: true,
                          rpTagih: true,
                          discount: true,
                          Product: { select: { id: true, name: true, satuanKg: true } },
                        },
                      },
                    }
                  : {}),
                RitelModern: {
                  select: { id: true, namaPt: true, inisial: true, tujuan: true },
                },
                UnitProduksi: {
                  select: { idRegional: true, namaRegional: true, siteArea: true },
                },
                CreditLimitBatch: { select: { batchCode: true, status: true } },
              },
              orderBy,
              take,
              skip,
            } as any),
      );
      return [t, d] as const;
    })();
    // });
    const payload = {
      total,
      data: summary ? await attachSummary(data as any) : data,
      limit: take,
      offset: skip,
    };
    cacheSet(totalCacheKey, total, 30000);
    cacheSet(cacheKey, payload, 15000);
    return NextResponse.json(payload);
  } catch (error) {
    const cached = cacheGet<any>(
      `po:${new URL(request.url).searchParams.toString()}`,
    );
    if (cached) return NextResponse.json(cached);
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// [REST] DELETE must extract identifiers from URL searchParams, NOT from request body
export async function DELETE(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { session, role: safeRole, dbUser } = auth;

    if (safeRole !== "pusat") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // [REST] Read from URL params instead of body
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    if (!id && !noPo) {
      return NextResponse.json(
        { error: "id atau noPo wajib disertakan sebagai query param" },
        { status: 400 },
      );
    }
    // [PERF] Only select id — we don't need the full row
    const po = id
      ? await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true } })
      : await prisma.purchaseOrder.findUnique({ where: { noPo: noPo! }, select: { id: true } });
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
    cacheClearPrefix("po_total:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
