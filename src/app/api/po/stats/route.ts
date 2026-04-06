import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheGet, cacheSet, singleFlight } from "@/lib/ttl-cache";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

// [ENV] Timezone offset from env, not hardcoded
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

  // 4. Debugger (WAJIB CEK TERMINAL)
  console.log("🚨 [DEBUG API] EMAIL:", email, "| DB_USER:", dbUser ? "KETEMU" : "KOSONG", "| SAFE_ROLE:", safeRole);


  // 5. Tentukan Wilayah (Dengan Fallback ke Token Metadata jika ada)
  let overrideRegional: string | null = null;
  let overrideSiteArea: string | null = null;
  if (safeRole === 'picsite' || safeRole === 'spbdki') {
    overrideRegional = dbUser?.regional || (sessionObj as any)?.user_metadata?.regional || "Regional 1 Bandung";
    overrideSiteArea = dbUser?.siteArea || (sessionObj as any)?.user_metadata?.siteArea || "SPB DKI";
  } else if (safeRole === 'rm') {
    overrideRegional = dbUser?.regional || (sessionObj as any)?.regional || null;
  }

  const { searchParams } = new URL(request.url);
  const includeUnknown =
    (searchParams.get("includeUnknown") || "true") === "true";
  
  // Use overrides if present, otherwise search parameters
  const regionalParam = overrideRegional ?? (searchParams.get("regional") || undefined);
  const siteAreaParam = overrideSiteArea ?? (searchParams.get("siteArea") || undefined);

  const tglFrom = parseDate(searchParams.get("tglFrom"));
  const tglTo = parseDate(searchParams.get("tglTo"));

  const safeSa = overrideSiteArea || searchParams.get("siteArea") || "";
  const hasSiteArea = safeSa.length > 0;
  const saPattern = hasSiteArea ? `%${safeSa.trim()}%` : '%';

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
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND (po."expiredTgl" IS NULL OR po."expiredTgl" >= ${startOfToday})
          )::int AS "cActive",
          COUNT(*) FILTER (
            WHERE
              (COALESCE(trim(po."noInvoice"), '') = ANY(${emptyInvoiceValues}))
              AND (po."expiredTgl" IS NULL OR po."expiredTgl" >= ${startOfToday})
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
        LEFT JOIN "UnitProduksi" up ON up."idRegional" = po."unitProduksiId"
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
              OR COALESCE(up."namaRegional", '') ILIKE ANY(${regionalPatterns})
            )
          )
          AND (
            ${hasSiteArea} = false OR up."siteArea" ILIKE ${saPattern}
          )
      `;
      return {
        ...(rows[0] || {
          cAll: 0,
          cActive: 0,
          cAssign: 0,
          cAlmost: 0,
          cExpired: 0,
          cCompleted: 0,
        }),
        cProgress: 0,
      };
    });
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
