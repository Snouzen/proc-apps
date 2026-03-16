import { NextResponse } from "next/server";
import prisma from "@/lib/db";
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

function safeParseDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === "string") {
    const isoPart = input.length >= 10 ? input.slice(0, 10) : input;
    const tryIso = new Date(isoPart);
    if (!isNaN(tryIso.getTime())) return tryIso;
    if (input.includes("/")) {
      const parts = input.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
        if (
          !Number.isNaN(dd) &&
          !Number.isNaN(mm) &&
          !Number.isNaN(yyyy) &&
          dd >= 1 &&
          dd <= 31 &&
          mm >= 1 &&
          mm <= 12
        ) {
          const dt = new Date(yyyy, mm - 1, dd);
          return isNaN(dt.getTime()) ? null : dt;
        }
      }
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
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

    const where: any = {
      tglPo: { gte: start, lte: end },
    };
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

    const rows =
      metric === "count"
        ? await singleFlight(cacheKey, () =>
            prisma.purchaseOrder.findMany({
              where,
              select: { tglPo: true },
              orderBy: { tglPo: "asc" },
            }),
          )
        : await singleFlight(cacheKey, () =>
            prisma.purchaseOrderItem.findMany({
              where: { PurchaseOrder: { is: where } } as any,
              select: {
                purchaseOrderId: true,
                pcs: true,
                PurchaseOrder: { select: { tglPo: true } },
                Product: { select: { satuanKg: true } },
              },
            }),
          );

    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = d0 - i;
      const utcStart = jakartaDayStartUtc(y, m0, day);
      dates.push(toYMDJakarta(utcStart));
    }
    const byDate = new Map<
      string,
      { count: number; kg: number; poIds: Set<string> }
    >();
    for (const d of dates) byDate.set(d, { count: 0, kg: 0, poIds: new Set() });

    if (metric === "count") {
      for (const po of rows as any[]) {
        const dt = safeParseDate((po as any)?.tglPo);
        const key = dt ? toYMDJakarta(dt) : null;
        if (!key || !byDate.has(key)) continue;
        const rec = byDate.get(key)!;
        rec.count += 1;
      }
    } else {
      for (const it of rows as any[]) {
        const dt = safeParseDate(it?.PurchaseOrder?.tglPo);
        const key = dt ? toYMDJakarta(dt) : null;
        if (!key || !byDate.has(key)) continue;
        const rec = byDate.get(key)!;
        const pcs = Number(it?.pcs) || 0;
        const satuan = Number(it?.Product?.satuanKg ?? 1) || 1;
        rec.kg += pcs * satuan;
        if (it?.purchaseOrderId) rec.poIds.add(String(it.purchaseOrderId));
      }
      for (const rec of byDate.values()) {
        rec.count = rec.poIds.size;
      }
    }

    const data = dates.map((d) => {
      const rec = byDate.get(d)!;
      return { date: d, count: rec.count || 0, kg: rec.kg || 0 };
    });
    const payload = { days, metric, data };
    cacheSet(cacheKey, payload, 15000);
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
