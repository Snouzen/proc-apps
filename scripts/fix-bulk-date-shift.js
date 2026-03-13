/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return "";
  return v;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeConnectionUrl(url) {
  const sep = url.includes("?") ? "&" : "?";
  if (!url.includes("connect_timeout=")) {
    const params = new URLSearchParams();
    params.set("connect_timeout", "15");
    return `${url}${sep}${params.toString()}`;
  }
  return url;
}

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error(
      "DATABASE_URL is not set. Set DATABASE_URL in your environment or .env",
    );
  }
  const connectionString = normalizeConnectionUrl(rawUrl);
  const poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
  const adapter = new PrismaPg(poolConfig);
  return new PrismaClient({ adapter });
}

function parseDateArg(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

function addDaysAndNoonUTC(date, days) {
  const ms = date.getTime() + days * 86400 * 1000;
  const d = new Date(ms);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function normalizeToUtcNoonFromOffset(date, tzOffsetHours) {
  const shifted = new Date(date.getTime() + tzOffsetHours * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m0 = shifted.getUTCMonth();
  const d1 = shifted.getUTCDate();
  return new Date(Date.UTC(y, m0, d1, 12, 0, 0, 0));
}

async function main() {
  const fromRaw = getArg("fromCreatedAt");
  const toRaw = getArg("toCreatedAt");
  const daysRaw = getArg("days");
  const dryRun = hasFlag("dryRun");
  const limitRaw = getArg("limit");
  const onlyUtcMidnight = hasFlag("onlyUtcMidnight");
  const tzOffsetRaw = getArg("tzOffsetHours");
  const noPoRaw = getArg("noPo");
  const noPoListRaw = getArg("noPoList");

  const from = parseDateArg(fromRaw);
  const to = parseDateArg(toRaw);
  const days = Number(daysRaw || "1");
  const limit = limitRaw ? Number(limitRaw) : 0;
  const tzOffsetHours = tzOffsetRaw ? Number(tzOffsetRaw) : 7;
  const noPoList = (() => {
    const set = new Set();
    if (noPoRaw) set.add(String(noPoRaw).trim());
    if (noPoListRaw) {
      const parts = String(noPoListRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) set.add(p);
    }
    return Array.from(set).filter(Boolean);
  })();

  if (noPoList.length === 0 && (!from || !to)) {
    console.log(
      [
        "Usage:",
        "  node scripts/fix-bulk-date-shift.js --fromCreatedAt 2026-11-01T00:00:00Z --toCreatedAt 2026-11-02T00:00:00Z --days 1 --dryRun",
        "  node scripts/fix-bulk-date-shift.js --noPo 4502768150 --days 1 --dryRun",
        "  node scripts/fix-bulk-date-shift.js --noPoList 4502768150,4502768151 --days 1 --dryRun",
        "",
        "Notes:",
        "- Use a tight createdAt window matching your bulk upload time.",
        "- --days can be negative to subtract days.",
        "- Add --onlyUtcMidnight to only adjust rows whose stored tglPo/expiredTgl are at 00:00:00Z.",
        "- Add --limit N to only process N records (for testing).",
        "- Use --tzOffsetHours 7 for WIB (default 7).",
      ].join("\n"),
    );
    process.exit(1);
  }
  if (!Number.isFinite(days) || Math.abs(days) > 3) {
    throw new Error("--days must be a number with reasonable magnitude (<= 3)");
  }

  const prisma = createPrisma();
  try {
    const where =
      noPoList.length > 0
        ? { noPo: { in: noPoList } }
        : { createdAt: { gte: from, lt: to } };

    const pos = await prisma.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        noPo: true,
        tglPo: true,
        expiredTgl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });

    const candidates = pos.filter((po) => {
      if (!po.tglPo && !po.expiredTgl) return false;
      if (!onlyUtcMidnight) return true;
      const okTgl =
        !po.tglPo ||
        (po.tglPo.getUTCHours() === 0 &&
          po.tglPo.getUTCMinutes() === 0 &&
          po.tglPo.getUTCSeconds() === 0);
      const okExp =
        !po.expiredTgl ||
        (po.expiredTgl.getUTCHours() === 0 &&
          po.expiredTgl.getUTCMinutes() === 0 &&
          po.expiredTgl.getUTCSeconds() === 0);
      return okTgl && okExp;
    });

    console.log(
      JSON.stringify(
        {
          fromCreatedAt: from ? from.toISOString() : null,
          toCreatedAt: to ? to.toISOString() : null,
          noPoList: noPoList.length > 0 ? noPoList : null,
          days,
          dryRun,
          onlyUtcMidnight,
          found: pos.length,
          candidates: candidates.length,
        },
        null,
        2,
      ),
    );

    const sample = candidates.slice(0, 10).map((po) => ({
      noPo: po.noPo,
      createdAt: po.createdAt.toISOString(),
      tglPo_before: po.tglPo ? po.tglPo.toISOString() : null,
      expired_before: po.expiredTgl ? po.expiredTgl.toISOString() : null,
      tglPo_after: po.tglPo
        ? normalizeToUtcNoonFromOffset(addDaysAndNoonUTC(po.tglPo, days), tzOffsetHours).toISOString()
        : null,
      expired_after: po.expiredTgl
        ? normalizeToUtcNoonFromOffset(addDaysAndNoonUTC(po.expiredTgl, days), tzOffsetHours).toISOString()
        : null,
    }));
    console.log("Sample (first 10):");
    console.table(sample);

    if (dryRun) {
      console.log("Dry run: no changes applied.");
      return;
    }

    let updated = 0;
    for (const po of candidates) {
      const nextTgl = po.tglPo
        ? normalizeToUtcNoonFromOffset(addDaysAndNoonUTC(po.tglPo, days), tzOffsetHours)
        : null;
      const nextExp = po.expiredTgl
        ? normalizeToUtcNoonFromOffset(addDaysAndNoonUTC(po.expiredTgl, days), tzOffsetHours)
        : null;
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          ...(nextTgl ? { tglPo: nextTgl } : {}),
          ...(nextExp ? { expiredTgl: nextExp } : {}),
          updatedAt: new Date(),
        },
      });
      updated += 1;
      if (updated % 200 === 0) {
        console.log(`Updated ${updated}/${candidates.length}...`);
      }
    }
    console.log(`Done. Updated ${updated} purchase orders.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
