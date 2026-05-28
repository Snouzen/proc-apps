import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { cacheGet, cacheSet, singleFlight } from "@/lib/ttl-cache";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

// [ENV] Timezone offset from env, not hardcoded


export async function GET(request: Request) {
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
  let rawRole = dbUser?.role || (sessionObj as any)?.user_metadata?.role || sessionObj?.role || "";

  // 🔥 GEMBOK PAKSA DARURAT JIKA DB GAGAL 🔥
  if (email.includes("spbdki") && !dbUser) {
    rawRole = "picsite"; 
  }

  const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");




// 5. Tentukan Wilayah (Dengan Fallback ke Token Metadata jika ada)
  let overrideRegional: string | null = null;
  let overrideSiteArea: string | null = null;
  if (safeRole === 'sitearea') {
    overrideRegional = dbUser?.regional || (sessionObj as any)?.user_metadata?.regional || null;
    overrideSiteArea = dbUser?.siteArea || (sessionObj as any)?.user_metadata?.siteArea || null;
  } else if (safeRole === 'rm') {
    overrideRegional = dbUser?.regional || (sessionObj as any)?.regional || null;
  }

  const { searchParams } = new URL(request.url);
  const includeUnknown =
    (searchParams.get("includeUnknown") || "true") === "true";
  
  // Use overrides if present, otherwise search parameters
  const regionalParam = overrideRegional ?? (searchParams.get("regional") || undefined);
  const siteAreaParam = overrideSiteArea ?? (searchParams.get("siteArea") || undefined);

  const tglFrom = parseYmdOrIsoToUtcNoon(searchParams.get("tglFrom"));
  const tglTo = parseYmdOrIsoToUtcNoon(searchParams.get("tglTo"));

  const safeSa = overrideSiteArea || searchParams.get("siteArea") || "";
  const hasSiteArea = safeSa.length > 0;

  const keyParams = new URLSearchParams();
  keyParams.set("includeUnknown", includeUnknown ? "true" : "false");
  if (regionalParam && regionalParam.trim())
    keyParams.set("regional", regionalParam.trim());
  if (siteAreaParam) keyParams.set("siteArea", siteAreaParam);
  if (tglFrom) keyParams.set("tglFrom", searchParams.get("tglFrom") || "");
  if (tglTo) keyParams.set("tglTo", searchParams.get("tglTo") || "");
  const cacheKey = `po_stats:${safeRole}:${regionalParam || "all"}:${siteAreaParam || "all"}:${keyParams.toString()}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const emptyInvoiceValues = ["", "-", "Unknown"];
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

    const syn = getRegionalSynonyms(String(regionalParam || ""));
    const emptyText = ["", "-", "Unknown", "UNKNOWN"];

    const payload = await unstable_cache(async () => {
      // 1. Susun Base Where (Filter Global)
      const baseWhere: any = {};
      
      if (tglFrom || tglTo) {
        baseWhere.tglPo = {};
        if (tglFrom) baseWhere.tglPo.gte = tglFrom;
        if (tglTo) baseWhere.tglPo.lte = tglTo;
      }

      const andFilters: any[] = [];

      // Filter Unknown
      if (!includeUnknown) {
        andFilters.push({
          NOT: {
            OR: [
              { unitProduksiId: "UNKNOWN" },
              { unitProduksiId: null },
              { tujuanDetail: { in: emptyText } },
              { tujuanDetail: null },
              { regional: { in: emptyText } },
              { regional: null }
            ]
          }
        });
      }

      // Filter Regional (Fuzzy Search)
      if (syn.length > 0) {
        andFilters.push({
          OR: syn.flatMap(s => [
            { regional: { contains: s, mode: "insensitive" } },
            { UnitProduksi: { namaRegional: { contains: s, mode: "insensitive" } } }
          ])
        });
      }

      // Filter Site Area
      if (hasSiteArea) {
        andFilters.push({
          UnitProduksi: { siteArea: { contains: safeSa.trim(), mode: "insensitive" } }
        });
      }

      if (andFilters.length > 0) {
        baseWhere.AND = andFilters;
      }

      // 2. Kondisi-kondisi Spesifik
      const noInvoiceCond = {
        OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }]
      };
      
      const hasInvoiceCond = {
        NOT: { OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }] }
      };

      // 3. Eksekusi 6 Hitungan secara Paralel (Ngebut & Bersih!)
      const [cAll, cActive, cAssign, cAlmost, cExpired, cCompleted] = await Promise.all([
        // cAll
        prisma.purchaseOrder.count({ where: baseWhere }),
        
        // cActive
        prisma.purchaseOrder.count({
          where: {
            ...baseWhere,
            ...noInvoiceCond,
            OR: [{ expiredTgl: null }, { expiredTgl: { gte: startOfToday } }]
          }
        }),

        // cAssign (Active + Regional Kosong/Unknown)
        prisma.purchaseOrder.count({
          where: {
            ...baseWhere,
            ...noInvoiceCond,
            OR: [{ expiredTgl: null }, { expiredTgl: { gte: startOfToday } }],
            AND: [
              ...(baseWhere.AND || []),
              { OR: [{ regional: null }, { regional: { in: emptyText } }, { unitProduksiId: "UNKNOWN" }] }
            ]
          }
        }),

        // cAlmost
        prisma.purchaseOrder.count({
          where: {
            ...baseWhere,
            ...noInvoiceCond,
            expiredTgl: { not: null, gte: startOfToday, lte: endOfSoon }
          }
        }),

        // cExpired
        prisma.purchaseOrder.count({
          where: {
            ...baseWhere,
            ...noInvoiceCond,
            expiredTgl: { not: null, lt: startOfToday }
          }
        }),

        // cCompleted
        prisma.purchaseOrder.count({
          where: {
            ...baseWhere,
            ...hasInvoiceCond
          }
        })
      ]);

        return {
          cAll, cActive, cAssign, cAlmost, cExpired, cCompleted, cProgress: 0
        };
    }, [cacheKey], { revalidate: 120, tags: [cacheKey] })();
    cacheSet(cacheKey, payload, 30000);
    cacheSet(
      `po_stats_group:${safeRole}:${keyParams.toString()}:all`,
      payload.cAll,
      30000,
    );
    cacheSet(
      `po_stats_group:${safeRole}:${keyParams.toString()}:active`,
      payload.cActive,
      30000,
    );
    cacheSet(
      `po_stats_group:${safeRole}:${keyParams.toString()}:almost_expired`,
      payload.cAlmost,
      30000,
    );
    cacheSet(
      `po_stats_group:${safeRole}:${keyParams.toString()}:expired`,
      payload.cExpired,
      30000,
    );
    cacheSet(
      `po_stats_group:${safeRole}:${keyParams.toString()}:completed`,
      payload.cCompleted,
      30000,
    );
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    console.error("GET /api/po/stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
