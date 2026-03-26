import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheGet, cacheSet, singleFlight } from "@/lib/ttl-cache";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function toYMDJakarta(d: Date) {
  return new Date(d.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

function jakartaDayStartUtc(y: number, m0: number, d: number) {
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0) - JAKARTA_OFFSET_MS);
}

function jakartaDayEndUtc(y: number, m0: number, d: number) {
  return new Date(Date.UTC(y, m0, d, 23, 59, 59, 999) - JAKARTA_OFFSET_MS);
}

export async function GET(request: Request) {
  const cacheKey = `po_trend:${request.url}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const { searchParams } = new URL(request.url);
    const daysRaw = Number(searchParams.get("days") || 90);
    const days =
      daysRaw === 7 || daysRaw === 30 || daysRaw === 90 ? daysRaw : 90;
    const metricRaw = String(searchParams.get("metric") || "kg").toLowerCase();
    const metric =
      metricRaw === "count" || metricRaw === "kg" ? metricRaw : "kg";
    const includeUnknown =
      (searchParams.get("includeUnknown") || "true") === "true";
    const regionalParam = searchParams.get("regional") || undefined;

    const now = new Date();
    const nowJakarta = new Date(now.getTime() + JAKARTA_OFFSET_MS);
    const y = nowJakarta.getUTCFullYear();
    const m0 = nowJakarta.getUTCMonth();
    const d0 = nowJakarta.getUTCDate();
    const start = jakartaDayStartUtc(y, m0, d0 - (days - 1));
    const end = jakartaDayEndUtc(y, m0, d0);

    const emptyText = ["", "-", "Unknown"];
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

    const data = await singleFlight(cacheKey, async () => {
      const ids = Array.from({ length: days }, (_, idx) => {
        const day = d0 - (days - 1) + idx;
        const utcStart = jakartaDayStartUtc(y, m0, day);
        return toYMDJakarta(utcStart);
      });

      if (metric === "count") {
        const rows = await prisma.$queryRaw<
          Array<{ date: string; count: number }>
        >`
          SELECT
            to_char((po."tglPo" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') as "date",
            COUNT(*)::int as "count"
          FROM "PurchaseOrder" po
          LEFT JOIN "UnitProduksi" up ON up."idRegional" = po."unitProduksiId"
          LEFT JOIN "ritel_modern" rm ON rm."id" = po."ritelId"
          WHERE po."tglPo" >= ${start} AND po."tglPo" <= ${end}
            AND (${includeUnknown} = true OR NOT (
              po."unitProduksiId" = 'UNKNOWN'
              OR COALESCE(trim(po."tujuanDetail"), '') = ANY(${emptyText})
              OR COALESCE(trim(rm."namaPt"), '') = ANY(${emptyText})
            ))
            AND (${hasRegional} = false OR (
              COALESCE(po."regional", '') ILIKE ANY(${regionalPatterns})
              OR COALESCE(up."namaRegional", '') ILIKE ANY(${regionalPatterns})
            ))
          GROUP BY 1
          ORDER BY 1 ASC
        `;
        const by = new Map(rows.map((r) => [r.date, r.count]));
        return ids.map((d) => ({ date: d, count: by.get(d) || 0, kg: 0 }));
      }

      const rows = await prisma.$queryRaw<
        Array<{ date: string; kg: number; count: number }>
      >`
        SELECT
          to_char((po."tglPo" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') as "date",
          COALESCE(SUM(i."pcs" * p."satuanKg"), 0)::float8 as "kg",
          COUNT(DISTINCT i."purchaseOrderId")::int as "count"
        FROM "PurchaseOrderItem" i
        JOIN "PurchaseOrder" po ON po."id" = i."purchaseOrderId"
        JOIN "Product" p ON p."id" = i."productId"
        LEFT JOIN "UnitProduksi" up ON up."idRegional" = po."unitProduksiId"
        LEFT JOIN "ritel_modern" rm ON rm."id" = po."ritelId"
        WHERE po."tglPo" >= ${start} AND po."tglPo" <= ${end}
          AND (${includeUnknown} = true OR NOT (
            po."unitProduksiId" = 'UNKNOWN'
            OR COALESCE(trim(po."tujuanDetail"), '') = ANY(${emptyText})
            OR COALESCE(trim(rm."namaPt"), '') = ANY(${emptyText})
          ))
          AND (${hasRegional} = false OR (
            COALESCE(po."regional", '') ILIKE ANY(${regionalPatterns})
            OR COALESCE(up."namaRegional", '') ILIKE ANY(${regionalPatterns})
          ))
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      const by = new Map(rows.map((r) => [r.date, r]));
      return ids.map((d) => {
        const r = by.get(d);
        return { date: d, count: r?.count || 0, kg: r?.kg || 0 };
      });
    });

    const payload = { days, metric, data };
    cacheSet(cacheKey, payload, 600_000);
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
