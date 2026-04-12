import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
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

// [ENV] Timezone offset from env, not hardcoded magic number
const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS) || 7;

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
  const shifted = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
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
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      const hdr = request.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const sessionRaw = verifySession(token);
    const sessionObj = await Promise.resolve(sessionRaw);
    const email = sessionObj?.email || (sessionObj as any)?.user?.email;

    let dbUser = null;
    if (email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
    }

    const rawRole = dbUser?.role || sessionObj?.role || "";
    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    if (!sessionObj) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = POBodySchema.safeParse(raw);
    if (!parsed.success) {
      console.error("Payload validation failed:", parsed.error);
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

    // FEATURE: Role-based Security - Force-Override Pattern for RM users
    // If user is RM, we use their session regional regardless of what the frontend sent.
    // This prevents string mismatch errors (caps, spaces) and unauthorized regional data entry.
    let effectiveRegional = regional;
    if (safeRole === "rm" && (dbUser?.regional || (sessionObj as any).regional)) {
      effectiveRegional = dbUser?.regional || (sessionObj as any).regional;
    }

    // ── Backend Guard: sanitize junk values to null ──
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
    // Use the effective regional (which might be forced from session for RM users)
    // sanitizeToNull is defined above and guards against all junk strings
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
                ...(poTglKirim !== undefined ? { tglkirim: poTglKirim } : {}),
                updatedAt: poUpdatedAt,
              },
            });

        // Handle Items: Delete existing and recreate
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

        const rows = items.map((item: any) => {
          const nm = canonicalProductName(item.namaProduk);
          const product = existingMap.get(nm)!;
          const satuan =
            Number((product?.satuanKg as number | undefined) ?? 1) || 1;
          const pcsNum = Number(item.pcs) || 0;
          const pcsKirimNum = Number(item.pcsKirim || 0) || 0;
          const hargaPcsNum = Number(item.hargaPcs) || 0;
          const discountNum = Math.max(0, Number(item.discount || 0) || 0);
          const hargaKg = satuan > 0 ? hargaPcsNum / satuan : 0;
          const nominal = Math.max(0, hargaPcsNum * pcsNum - discountNum);
          const rpTagih = Math.max(0, hargaPcsNum * pcsKirimNum - discountNum);
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

        // Return minimal payload to avoid Prisma Client column mismatches
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
    console.error("POST /api/po error:", msg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      const hdr = request.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const sessionObj = await Promise.resolve(verifySession(token));
    if (!sessionObj) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Ekstrak Email Sekuat Tenaga (Anti-Undefined & Lowercase)
    const emailRaw = sessionObj?.email || (sessionObj as any)?.user?.email || (sessionObj as any)?.payload?.email || "";
    const email = String(emailRaw).toLowerCase().trim();

    // 2. Cari di DB (Abaikan Huruf Besar/Kecil dengan findFirst)
    let dbUser = null;
    if (email) {
      dbUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
    }

    // 3. Ekstrak Role & Hard-Fallback
    const rawRole = dbUser?.role || (sessionObj as any)?.user_metadata?.role || sessionObj?.role || "";

    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    // 4. Debugger (WAJIB CEK TERMINAL)
    console.log("🚨 [DEBUG API] EMAIL:", email, "| DB_USER:", dbUser ? "KETEMU" : "KOSONG", "| SAFE_ROLE:", safeRole);

    const { searchParams } = new URL(request.url);

    // 5. Tentukan Wilayah (Dengan Fallback ke Token Metadata jika ada)
    let overrideRegional: string | null = null;
    let overrideSiteArea: string | null = null;
    if (safeRole === 'sitearea') {
      overrideRegional = dbUser?.regional || (sessionObj as any)?.user_metadata?.regional || null;
      overrideSiteArea = dbUser?.siteArea || (sessionObj as any)?.user_metadata?.siteArea || null;
    } else if (safeRole === 'rm') {
      overrideRegional = dbUser?.regional || (sessionObj as any)?.regional || null;
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
    const tglFrom = parseDate(searchParams.get("tglFrom"));
    const tglTo = parseDate(searchParams.get("tglTo"));
    const submitFrom = parseDate(searchParams.get("submitFrom"));
    const submitTo = parseDate(searchParams.get("submitTo"));
    const group = (searchParams.get("group") || "all").trim();
    const pcsKirimParam = searchParams.get("pcsKirim") || undefined;
    const status = searchParams.get("status") || undefined;
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    let colFilters: Record<string, string> = {};
    const colFiltersRaw = searchParams.get("colFilters");
    if (colFiltersRaw) {
      try {
        colFilters = JSON.parse(colFiltersRaw);
      } catch (e) {
        console.error("Failed to parse colFilters", e);
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

    if (monthParam && yearParam) {
      const y = parseInt(yearParam);
      const m = parseInt(monthParam); // 1 - 12
      if (!isNaN(y) && !isNaN(m)) {
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));

        where.AND = [
          ...(where.AND || []),
          {
            tglkirim: {
              gte: startDate,
              lt: endDate,
            },
          },
        ];
      }
    }
    function getRegionalSynonyms(input: string): string[] {
      const rp = input.trim().toLowerCase();
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
      return [input.trim()];
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
    // Strict RBAC: force regional scope for RM users with synonym support for robustness
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
    // Strict RBAC: force siteArea scope for sitearea users
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
      // Also lock regional if available for sitearea for extra security
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
    
    // Normal siteAreaParam user filter (only for pusat)
    if (safeRole === "pusat" && siteAreaParam && siteAreaParam.trim()) {
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
        // [SCHEDULE FIX] Data yang di-reject (kembali ke UNKNOWN) tidak boleh muncul di antrean Schedule (Active)
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
        const strVal = String(val).trim();
        if (!strVal) continue;

        const isBool = (v: string) => {
          const norm = v.toLowerCase();
          return ["1", "true", "ya", "yes", "y"].includes(norm)
            ? true
            : ["0", "false", "tidak", "no", "n"].includes(norm)
              ? false
              : null;
        };

        if (
          key === "noPo" ||
          key === "tujuan" ||
          key === "noInvoice" ||
          key === "linkPo" ||
          key === "remarks"
        ) {
          const dbKey = key === "tujuan" ? "tujuanDetail" : key;
          AND.push({ [dbKey]: { contains: strVal, mode: "insensitive" } });
        } else if (key === "company" || key === "inisial") {
          const dbKey = key === "company" ? "namaPt" : "inisial";
          AND.push({
            RitelModern: {
              is: { [dbKey]: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "siteArea") {
          AND.push({
            UnitProduksi: {
              is: { siteArea: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "regional") {
          AND.push({
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
        } else if (key === "products") {
          AND.push({
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
            AND.push({ [key]: bVal });
          }
        }
        // Note: filtering by computed columns (totalNominal, totalTagihan) is not supported at DB level via Prisma findMany.
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
      const rowsAgg = await prisma.$queryRaw<
        Array<{
          purchaseOrderId: string;
          itemsCount: number;
          totalNominal: number;
          totalTagihan: number;
          pcsTotal: number;
          pcsKirimTotal: number;
          totalDiscount: number;
          totalKg: number;
          totalKgKirim: number;
          firstProductName: string | null;
        }>
      >(Prisma.sql`
          SELECT
            i."purchaseOrderId" as "purchaseOrderId",
            COUNT(*)::int as "itemsCount",
            COALESCE(SUM(i."nominal"), 0) as "totalNominal",
            COALESCE(SUM(i."rpTagih"), 0) as "totalTagihan",
            COALESCE(SUM(i."pcs"), 0) as "pcsTotal",
            COALESCE(SUM(i."pcsKirim"), 0) as "pcsKirimTotal",
            COALESCE(SUM(i."discount"), 0) as "totalDiscount",
            COALESCE(SUM(i."pcs" * p."satuanKg"), 0)::float8 as "totalKg",
            COALESCE(SUM(i."pcsKirim" * p."satuanKg"), 0)::float8 as "totalKgKirim",
            (ARRAY_AGG(p."name" ORDER BY i."createdAt" ASC))[1] as "firstProductName"
          FROM "PurchaseOrderItem" i
          JOIN "Product" p ON p."id" = i."productId"
          WHERE i."purchaseOrderId" IN (${Prisma.join(ids)})
          GROUP BY i."purchaseOrderId"
        `);
      const byId = new Map<string, (typeof rowsAgg)[number]>();
      for (const a of rowsAgg) byId.set(String(a.purchaseOrderId), a);
      return rows.map((r) => {
        const s = byId.get(r.id);
        return {
          ...r,
          itemsCount: Number(s?.itemsCount) || 0,
          totalNominal: Number(s?.totalNominal) || 0,
          totalTagihan: Number(s?.totalTagihan) || 0,
          pcsTotal: Number(s?.pcsTotal) || 0,
          pcsKirimTotal: Number(s?.pcsKirimTotal) || 0,
          totalDiscount: Number(s?.totalDiscount) || 0,
          totalKg: Number(s?.totalKg) || 0,
          totalKgKirim: Number(s?.totalKgKirim) || 0,
          firstProductName: s?.firstProductName
            ? String(s.firstProductName)
            : null,
        };
      });
    };

    if (!paged) {
      if (cached) return NextResponse.json(cached);
      const data = await singleFlight(cacheKey, () =>
        prisma.purchaseOrder.findMany(
          summary
            ? ({
                where,
                take: 2000,
                select: {
                  id: true,
                  noPo: true,
                  createdAt: true,
                  updatedAt: true,
                  tglPo: true,
                  expiredTgl: true,
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
                  tglkirim: true,
                  buktiTagih: true,
                  buktiBayar: true,
                  namaSupir: true,
                  platNomor: true,
                  RitelModern: {
                    select: { namaPt: true, inisial: true, tujuan: true },
                  },
                  UnitProduksi: {
                    select: { siteArea: true, namaRegional: true, alamat: true },
                  },
                  // [PERF] Removed Items relation fetch in summary mode as we use aggregate SQL instead to save memory
                },
                orderBy,
              } as any)
            : ({
                where,
                take: 2000,
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
                  statusKirim: true,
                  statusSdif: true,
                  statusPo: true,
                  statusFp: true,
                  statusKwi: true,
                  statusInv: true,
                  statusTagih: true,
                  statusBayar: true,
                  tglkirim: true,
                  remarks: true,
                  buktiTagih: true,
                  buktiBayar: true,
                  namaSupir: true,
                  platNomor: true,
                  // Prevent over-fetching by using specific selects instead of raw includes
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
                },
                orderBy,
              } as any),
        ),
      );
      const payload = summary ? await attachSummary(data as any) : data;
      cacheSet(cacheKey, payload, 15000);
      return NextResponse.json(payload);
    }

    const take = limit ? Math.min(5000, limit) : 50;
    const skip = offset ?? 0;

    if (cached) return NextResponse.json(cached);

    const [total, data] = await singleFlight(cacheKey, async () => {
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
                updatedAt: true,
                tglPo: true,
                expiredTgl: true,
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
                tglkirim: true,
                buktiTagih: true,
                buktiBayar: true,
                namaSupir: true,
                platNomor: true,
                RitelModern: {
                  select: { namaPt: true, inisial: true, tujuan: true },
                },
                UnitProduksi: {
                  select: { siteArea: true, namaRegional: true },
                },
                // [PERF] Removed Items relation fetch in summary mode to save memory as totals are aggregated via SQL
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
                tglkirim: true,
                remarks: true,
                buktiTagih: true,
                buktiBayar: true,
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
              },
              orderBy,
              take,
              skip,
            } as any),
      );
      return [t, d] as const;
    });
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
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      const hdr = request.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const sessionRaw = verifySession(token);
    const sessionObj = await Promise.resolve(sessionRaw);
    const email = sessionObj?.email || (sessionObj as any)?.user?.email;

    let dbUser = null;
    if (email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
    }

    const rawRole = dbUser?.role || sessionObj?.role || "";
    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    if (!sessionObj) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
