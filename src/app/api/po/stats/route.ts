import { buildPOQueryParams } from "../services/poQueryBuilder";
import { resolvePoScope } from "@/lib/resolvePoScope";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseYmdOrIsoToUtcNoon, getBusinessStartOfToday, getBusinessStartOfMonth, getBusinessEndOfSoon } from "@/lib/utils/dates";
import { getRegionalSynonyms } from "@/lib/utils/regional";
import { cacheGet, cacheSet, singleFlight } from "@/lib/ttl-cache";
import { unstable_cache } from "next/cache";
import { getSessionWithRole } from "@/lib/auth";

// [ENV] Timezone offset from env, not hardcoded


export async function GET(request: Request) {
  const auth = await getSessionWithRole(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session: sessionObj, dbUser, safeRole } = auth;
  const resolvedPoScope = await resolvePoScope(auth);

  const emptyResponse = {
    cAll: 0,
    cActive: 0,
    cAssign: 0,
    cAlmost: 0,
    cExpired: 0,
    cCompleted: 0,
    cProgress: 0,
    topSiteAreas: [],
    topSiteAreasMtd: [],
  };

  const { searchParams } = new URL(request.url);
  const includeUnknown =
    (searchParams.get("includeUnknown") || "true") === "true";
  const tglFrom = parseYmdOrIsoToUtcNoon(searchParams.get("tglFrom"));
  const tglTo = parseYmdOrIsoToUtcNoon(searchParams.get("tglTo"));

  let regionalParam: string | undefined = undefined;
  let siteAreaParam: string | undefined = undefined;

  // Strict Authoritative User Scope (Fail-closed, no client parameter override for non-pusat)
  if (safeRole === "pusat") {
    regionalParam = searchParams.get("regional")?.trim() || undefined;
    siteAreaParam = searchParams.get("siteArea")?.trim() || undefined;
  } else if (safeRole === "rm") {
    const userRegional = (dbUser?.regional || sessionObj?.regional || "").trim();
    if (!userRegional) {
      return NextResponse.json(emptyResponse);
    }
    regionalParam = userRegional;
  } else if (safeRole === "sitearea" || (safeRole as string) === "picsite" || (safeRole as string) === "spbdki") {
    const userSiteArea = (dbUser?.siteArea || sessionObj?.siteArea || "").trim();
    if (!userSiteArea) {
      return NextResponse.json(emptyResponse);
    }
    siteAreaParam = userSiteArea;
    const userRegional = (dbUser?.regional || sessionObj?.regional || "").trim();
    if (userRegional) regionalParam = userRegional;
  } else {
    return NextResponse.json(emptyResponse);
  }

  const keyParams = new URLSearchParams();
  keyParams.set("scope", JSON.stringify(resolvedPoScope));
  keyParams.set("includeUnknown", includeUnknown ? "true" : "false");
  if (regionalParam && regionalParam.trim())
    keyParams.set("regional", regionalParam.trim());
  if (siteAreaParam) keyParams.set("siteArea", siteAreaParam);
  if (tglFrom) keyParams.set("tglFrom", searchParams.get("tglFrom") || "");
  if (tglTo) keyParams.set("tglTo", searchParams.get("tglTo") || "");
  const cacheKey = `po_stats_v2:${safeRole}:${regionalParam || "all"}:${siteAreaParam || "all"}:${keyParams.toString()}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const emptyInvoiceValues = ["", "-", "Unknown"];
    const startOfToday = getBusinessStartOfToday();
    const startOfMonth = getBusinessStartOfMonth();
    const endOfSoon = getBusinessEndOfSoon(14);

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
              { unitProduksiId: "" },
              { tujuanDetail: { in: emptyText } },
              { tujuanDetail: null },
              { regional: { in: emptyText } },
              { regional: null }
            ]
          }
        });
      }

      // Filter Regional (Exact match on synonyms with UnitProduksi authoritative precedence)
      if (regionalParam && syn.length > 0) {
        andFilters.push({
          OR: [
            {
              unitProduksiId: { notIn: ["UNKNOWN", ""] },
              UnitProduksi: {
                OR: [
                  ...syn.map((s) => ({ namaRegional: { equals: s, mode: "insensitive" as const } })),
                  ...syn.map((s) => ({ kodeRegional: { equals: s, mode: "insensitive" as const } })),
                ],
              },
            },
            {
              unitProduksiId: { in: ["UNKNOWN", ""] },
              OR: syn.map((s) => ({ regional: { equals: s, mode: "insensitive" as const } })),
            },
          ],
        });
      }

      // Filter Site Area (Exact match on siteArea list)
      if (siteAreaParam) {
        const saList = siteAreaParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (saList.length > 0) {
          andFilters.push({
            UnitProduksi: {
              siteArea: { in: saList, mode: "insensitive" as const },
            },
          });
        }
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

      const groupWhere = (group: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("group", group);
        return buildPOQueryParams(params, { ...auth, resolvedPoScope }).where;
      };
      const [cAll, cActive, cAssign, cAlmost, cExpired, cCompleted, topUnits, topUnitsMtd] = await Promise.all([
        prisma.purchaseOrder.count({ where: groupWhere("all") }),
        prisma.purchaseOrder.count({ where: groupWhere("active") }),
        prisma.purchaseOrder.count({ where: groupWhere("assign") }),
        prisma.purchaseOrder.count({ where: groupWhere("almost_expired") }),
        prisma.purchaseOrder.count({ where: groupWhere("expired") }),
        prisma.purchaseOrder.count({ where: groupWhere("completed") }),
        prisma.purchaseOrder.groupBy({
          by: ['unitProduksiId'],
          _count: true,
          where: groupWhere("all"),
          orderBy: { _count: { unitProduksiId: 'desc' } },
          take: 6
        }),

        // topUnitsMtd
        prisma.purchaseOrder.groupBy({
          by: ['unitProduksiId'],
          _count: true,
          where: {
            ...groupWhere("all"),
            tglPo: { gte: startOfMonth }
          },
          orderBy: { _count: { unitProduksiId: 'desc' } },
          take: 6
        })
      ]);

      const unitIds = [...new Set([...topUnits.map((u: any) => u.unitProduksiId), ...topUnitsMtd.map((u: any) => u.unitProduksiId)])].filter(Boolean);
      const units = await prisma.unitProduksi.findMany({
        where: { idRegional: { in: unitIds as string[] } },
        select: { idRegional: true, siteArea: true }
      });
      
      const topSiteAreas = topUnits
        .filter((u: any) => u.unitProduksiId && u.unitProduksiId !== "UNKNOWN")
        .map((u: any) => ({
          name: units.find((unit: any) => unit.idRegional === u.unitProduksiId)?.siteArea || "UNKNOWN",
          po: u._count
        }))
        .filter((u: any) => u.name !== "UNKNOWN")
        .slice(0, 5);

      const topSiteAreasMtd = topUnitsMtd
        .filter((u: any) => u.unitProduksiId && u.unitProduksiId !== "UNKNOWN")
        .map((u: any) => ({
          name: units.find((unit: any) => unit.idRegional === u.unitProduksiId)?.siteArea || "UNKNOWN",
          po: u._count
        }))
        .filter((u: any) => u.name !== "UNKNOWN")
        .slice(0, 5);

        return {
          cAll, cActive, cAssign, cAlmost, cExpired, cCompleted, cProgress: 0, topSiteAreas, topSiteAreasMtd
        };
    }, [cacheKey], { revalidate: 120, tags: [cacheKey, "po_stats"] })();
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
