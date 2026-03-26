import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheGet, cacheSet, singleFlight } from "@/lib/ttl-cache";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeUnknown =
    (searchParams.get("includeUnknown") || "true") === "true";
  const regionalParam = searchParams.get("regional") || undefined;
  const tglFrom = parseDate(searchParams.get("tglFrom"));
  const tglTo = parseDate(searchParams.get("tglTo"));

  const keyParams = new URLSearchParams();
  keyParams.set("includeUnknown", includeUnknown ? "true" : "false");
  if (regionalParam && regionalParam.trim()) keyParams.set("regional", regionalParam.trim());
  if (tglFrom) keyParams.set("tglFrom", searchParams.get("tglFrom") || "");
  if (tglTo) keyParams.set("tglTo", searchParams.get("tglTo") || "");
  const cacheKey = `po_stats:${keyParams.toString()}`;
  const cached = cacheGet<any>(cacheKey);
  try {
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

    const syn = (() => {
      const rp = String(regionalParam || "")
        .trim()
        .toLowerCase();
      if (!rp) return [];
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
      return [String(regionalParam || "").trim()];
    })();
    const regionalPatterns = syn.map((s) => `%${s}%`);
    const hasRegional = regionalPatterns.length > 0;
    const emptyText = ["", "-", "Unknown"];

    const payload = await singleFlight(cacheKey, async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          cAll: number;
          cProgress: number;
          cActive: number;
          cAssign: number;
          cAlmost: number;
          cExpired: number;
          cCompleted: number;
        }>
      >`
        SELECT
          COUNT(*)::int AS "cAll",
          COUNT(*) FILTER (
            WHERE
              NOT (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND po."expiredTgl" IS NOT NULL
              AND po."expiredTgl" >= ${startOfToday}
          )::int AS "cProgress",
          COUNT(*) FILTER (
            WHERE
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND po."expiredTgl" IS NOT NULL
              AND po."expiredTgl" >= ${startOfToday}
          )::int AS "cActive",
          COUNT(*) FILTER (
            WHERE
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND po."expiredTgl" IS NOT NULL
              AND po."expiredTgl" >= ${startOfToday}
              AND (
                COALESCE(trim(COALESCE(po."regional", '')), '') = ANY(${emptyRegionalValues})
                OR po."unitProduksiId" = 'UNKNOWN'
              )
          )::int AS "cAssign",
          COUNT(*) FILTER (
            WHERE
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND po."expiredTgl" IS NOT NULL
              AND po."expiredTgl" >= ${startOfToday}
              AND po."expiredTgl" <= ${endOfSoon}
          )::int AS "cAlmost",
          COUNT(*) FILTER (
            WHERE
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND po."expiredTgl" IS NOT NULL
              AND po."expiredTgl" < ${startOfToday}
          )::int AS "cExpired",
          COUNT(*) FILTER (
            WHERE
              NOT (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
          )::int AS "cCompleted"
        FROM "PurchaseOrder" po
        WHERE
          (${tglFrom}::timestamptz IS NULL OR po."tglPo" >= ${tglFrom}::timestamptz)
          AND (${tglTo}::timestamptz IS NULL OR po."tglPo" <= ${tglTo}::timestamptz)
          AND (
            ${includeUnknown} = true OR NOT (
              po."unitProduksiId" = 'UNKNOWN'
              OR COALESCE(trim(po."tujuanDetail"), '') = ANY(${emptyText})
              OR COALESCE(trim(COALESCE(po."regional", '')), '') = ANY(${emptyText})
            )
          )
          AND (
            ${hasRegional} = false OR (
              COALESCE(po."regional", '') ILIKE ANY(${regionalPatterns})
            )
          )
      `;
      return (
        rows[0] || {
          cAll: 0,
          cProgress: 0,
          cActive: 0,
          cAssign: 0,
          cAlmost: 0,
          cExpired: 0,
          cCompleted: 0,
        }
      );
    });
    cacheSet(cacheKey, payload, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:all`, payload.cAll, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:active`, payload.cActive, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:almost_expired`, payload.cAlmost, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:expired`, payload.cExpired, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:completed`, payload.cCompleted, 30000);
    cacheSet(`po_stats_group:${keyParams.toString()}:progress`, payload.cProgress, 30000);
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    console.error("GET /api/po/stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
