import { NextResponse } from "next/server";
import prisma from "@/lib/db";
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
  const cacheKey = `po_stats:${request.url}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const { searchParams } = new URL(request.url);
    const includeUnknown =
      (searchParams.get("includeUnknown") || "true") === "true";
    const regionalParam = searchParams.get("regional") || undefined;
    const tglFrom = parseDate(searchParams.get("tglFrom"));
    const tglTo = parseDate(searchParams.get("tglTo"));

    const baseWhere: any = {};
    if (tglFrom || tglTo) {
      baseWhere.tglPo = {
        ...(tglFrom ? { gte: tglFrom } : {}),
        ...(tglTo ? { lte: tglTo } : {}),
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
      baseWhere.OR = [
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
      baseWhere.NOT = [
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

    const whereAll = baseWhere;
    const whereInProgress = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
        { noInvoice: { not: null } },
        { noInvoice: { notIn: emptyInvoiceValues } },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday } },
      ],
    };
    const whereActive = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday } },
      ],
    };
    const whereAssign = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
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
                is: { namaRegional: { in: emptyRegionalValues } },
              },
            },
          ],
        },
      ],
    };
    const whereCompleted = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
        { noInvoice: { not: null } },
        { noInvoice: { notIn: emptyInvoiceValues } },
      ],
    };
    const whereAlmostExpired = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { gte: startOfToday, lte: endOfSoon } },
      ],
    };
    const whereExpired = {
      ...baseWhere,
      AND: [
        ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
        {
          OR: [{ noInvoice: null }, { noInvoice: { in: emptyInvoiceValues } }],
        },
        { expiredTgl: { not: null } },
        { expiredTgl: { lt: startOfToday } },
      ],
    };

    const [cAll, cProgress, cActive, cAssign, cAlmost, cExpired, cCompleted] =
      await singleFlight(cacheKey, async () => {
        const [a, b, c, d, e, f, g] = await Promise.all([
          prisma.purchaseOrder.count({ where: whereAll }),
          prisma.purchaseOrder.count({ where: whereInProgress }),
          prisma.purchaseOrder.count({ where: whereActive }),
          prisma.purchaseOrder.count({ where: whereAssign }),
          prisma.purchaseOrder.count({ where: whereAlmostExpired }),
          prisma.purchaseOrder.count({ where: whereExpired }),
          prisma.purchaseOrder.count({ where: whereCompleted }),
        ]);
        return [a, b, c, d, e, f, g] as const;
      });

    const payload = {
      cAll,
      cProgress,
      cActive,
      cAssign,
      cAlmost,
      cExpired,
      cCompleted,
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
