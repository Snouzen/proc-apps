import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  canonicalProductName,
  dedupeKey,
  upperClean,
  upperCleanOrNull,
} from "@/lib/text";
import { norm } from "./poBulkHelpers";

export type UnitLite = {
  siteArea: string;
  idRegional: string;
  namaRegional?: string;
};

export async function initUnitProduksiMap() {
  const units = (await prisma.unitProduksi.findMany()) as unknown as UnitLite[];
  const AREA_ALIASES: Record<string, string[]> = {
    "spb dki jakarta": ["spb dki", "spb dki jkt", "spb dki (jakarta)"],
  };
  const unitMap = new Map<string, UnitLite>();
  for (const u of units) {
    const key = String(u.siteArea || "")
      .toLowerCase()
      .trim();
    unitMap.set(key, u);
    const aliases = AREA_ALIASES[key] || [];
    for (const a of aliases) {
      unitMap.set(a.toLowerCase(), u);
    }
  }

  // Ensure fallback placeholder (idRegional: 'UNKNOWN')
  let fallbackUnit = units.find((u) => u.idRegional === "UNKNOWN");
  if (!fallbackUnit) {
    try {
      fallbackUnit = await prisma.unitProduksi.create({
        data: {
          idRegional: "UNKNOWN",
          siteArea: "UNKNOWN",
          namaRegional: "Unknown",
          updatedAt: new Date(),
        } as any,
      });
    } catch {
      fallbackUnit =
        (await prisma.unitProduksi.findFirst({
          where: { idRegional: "UNKNOWN" },
        })) || undefined;
    }
  }

  return { unitMap, fallbackUnit };
}

export function createRitelResolver() {
  const ritelCache = new Map<string, Promise<{ id: string }>>();

  const getRitel = (companyName: string, inisial: string | null) => {
    const companyUpper = upperClean(companyName);
    const inisialUpper = upperCleanOrNull(inisial);
    const ritelKey = `${norm(companyUpper)}|${norm(inisialUpper || "")}`;
    const cached = ritelCache.get(ritelKey);
    if (cached) return cached;

    const p = (async () => {
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
        select: { id: true, namaPt: true, inisial: true, createdAt: true, updatedAt: true },
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
        const needsUpdate =
          match.namaPt !== companyUpper ||
          (match.inisial || null) !== (inisialUpper || null);

        if (needsUpdate) {
          const updated = await prisma.$transaction(async (tx) => {
            const lockKeys = Array.from(
              new Set([match.namaPt.toLowerCase(), companyUpper.toLowerCase()])
            ).sort();
            for (const k of lockKeys) {
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${k}))))`;
            }

            // Baca ulang record sumber setelah advisory lock diperoleh
            const fresh = await tx.ritelModern.findUnique({
              where: { id: match.id },
              select: { id: true, namaPt: true, inisial: true, updatedAt: true },
            });
            if (!fresh) return null;

            // Validasi identitas dan versi record sumber
            const isModified =
              fresh.namaPt !== match.namaPt ||
              (fresh.inisial || null) !== (match.inisial || null) ||
              fresh.updatedAt.getTime() !== match.updatedAt.getTime();

            if (isModified) {
              const freshMatches =
                dedupeKey(upperClean(fresh.namaPt)) === kNama &&
                dedupeKey(upperCleanOrNull(fresh.inisial) || "") === kIni;

              if (!freshMatches) {
                // Record sumber telah diubah ke entitas lain di Master Ritel, batalkan penimpaan
                return null;
              }
            }

            if (
              fresh.namaPt === companyUpper &&
              (fresh.inisial || null) === (inisialUpper || null)
            ) {
              return { id: fresh.id };
            }

            const duplicate = await tx.ritelModern.findFirst({
              where: {
                id: { not: fresh.id },
                namaPt: { equals: companyUpper, mode: "insensitive" },
                inisial: inisialUpper ? { equals: inisialUpper, mode: "insensitive" } : null,
              },
              select: { id: true },
            });
            if (duplicate) return duplicate;

            // Update bersyarat menggunakan versi updatedAt terbaru dari fresh
            const updateRes = await tx.ritelModern.updateMany({
              where: {
                id: fresh.id,
                updatedAt: fresh.updatedAt,
              },
              data: {
                namaPt: companyUpper,
                inisial: inisialUpper,
                updatedAt: new Date(),
              },
            });
            if (updateRes.count === 0) {
              return null;
            }

            return { id: fresh.id };
          });

          if (updated?.id) {
            return { id: updated.id };
          }
        } else {
          return { id: match.id };
        }
      }
      let ritel: { id: string; namaPt: string; inisial: string | null; updatedAt: Date } | null = null;
      if (inisialUpper) {
        ritel = await prisma.ritelModern.findFirst({
          where: {
            namaPt: { equals: companyUpper, mode: "insensitive" },
            inisial: { equals: inisialUpper, mode: "insensitive" },
          },
          select: { id: true, namaPt: true, inisial: true, updatedAt: true },
        });
      } else {
        ritel = await prisma.ritelModern.findFirst({
          where: {
            namaPt: { equals: companyUpper, mode: "insensitive" },
            OR: [{ inisial: null }, { inisial: { equals: "" } }],
          },
          select: { id: true, namaPt: true, inisial: true, updatedAt: true },
        });
      }
      if (ritel) {
        const needsUpdate =
          ritel.namaPt !== companyUpper ||
          (ritel.inisial || null) !== (inisialUpper || null);

        if (needsUpdate) {
          const updated = await prisma.$transaction(async (tx) => {
            const lockKeys = Array.from(
              new Set([ritel.namaPt.toLowerCase(), companyUpper.toLowerCase()])
            ).sort();
            for (const k of lockKeys) {
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${k}))))`;
            }

            // Baca ulang record sumber setelah advisory lock diperoleh
            const fresh = await tx.ritelModern.findUnique({
              where: { id: ritel.id },
              select: { id: true, namaPt: true, inisial: true, updatedAt: true },
            });
            if (!fresh) return null;

            // Validasi identitas dan versi record sumber
            const isModified =
              fresh.namaPt !== ritel.namaPt ||
              (fresh.inisial || null) !== (ritel.inisial || null) ||
              fresh.updatedAt.getTime() !== ritel.updatedAt.getTime();

            if (isModified) {
              const freshInisialNorm = upperCleanOrNull(fresh.inisial);
              const inisialMatches = inisialUpper
                ? freshInisialNorm?.toLowerCase() === inisialUpper.toLowerCase()
                : freshInisialNorm === null;

              const freshMatches =
                fresh.namaPt.toLowerCase() === companyUpper.toLowerCase() &&
                inisialMatches;

              if (freshMatches) {
                return { id: fresh.id };
              }
              // Record sumber telah diubah ke entitas lain, batalkan penimpaan
              return null;
            }

            if (
              fresh.namaPt === companyUpper &&
              (fresh.inisial || null) === (inisialUpper || null)
            ) {
              return { id: fresh.id };
            }

            const duplicate = await tx.ritelModern.findFirst({
              where: {
                id: { not: fresh.id },
                namaPt: { equals: companyUpper, mode: "insensitive" },
                inisial: inisialUpper ? { equals: inisialUpper, mode: "insensitive" } : null,
              },
              select: { id: true },
            });
            if (duplicate) return duplicate;

            // Update bersyarat menggunakan versi updatedAt terbaru dari fresh
            const updateRes = await tx.ritelModern.updateMany({
              where: {
                id: fresh.id,
                updatedAt: fresh.updatedAt,
              },
              data: {
                namaPt: companyUpper,
                inisial: inisialUpper,
                updatedAt: new Date(),
              },
            });
            if (updateRes.count === 0) {
              return null;
            }

            return { id: fresh.id };
          });

          if (updated?.id) {
            return { id: updated.id };
          }
        } else {
          return { id: ritel.id };
        }
      }
      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${companyUpper}))))`;
        const existing = await tx.ritelModern.findFirst({
          where: inisialUpper
            ? {
                namaPt: { equals: companyUpper, mode: "insensitive" },
                inisial: { equals: inisialUpper, mode: "insensitive" },
              }
            : {
                namaPt: { equals: companyUpper, mode: "insensitive" },
                OR: [{ inisial: null }, { inisial: { equals: "" } }],
              },
          select: { id: true },
        });
        if (existing) return existing;

        return await tx.ritelModern.create({
          data: {
            id: randomUUID(),
            namaPt: companyUpper,
            inisial: inisialUpper,
            updatedAt: new Date(),
          },
          select: { id: true },
        });
      });
      return { id: created.id };
    })().catch((e) => {
      ritelCache.delete(ritelKey);
      throw e;
    });

    ritelCache.set(ritelKey, p);
    return p;
  };

  return { getRitel };
}

export function createProductResolver() {
  const productCache = new Map<
    string,
    Promise<{ id: string; satuanKg?: number | null }>
  >();

  const getProduct = (productName: string) => {
    const productUpper = canonicalProductName(productName);
    const productKey = dedupeKey(productUpper);
    const cached = productCache.get(productKey);
    if (cached) return cached;

    const p = (async () => {
      const token =
        productUpper.split(/\s+/).filter(Boolean)[0] || productUpper;
      const candidates = await prisma.product.findMany({
        where: { name: { contains: token, mode: "insensitive" } },
        select: { id: true, name: true, satuanKg: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      const match =
        candidates.find(
          (p) => dedupeKey(canonicalProductName(p?.name)) === productKey,
        ) || null;
      if (match?.id) {
        prisma.product
          .update({
            where: { id: match.id },
            data: { name: productUpper, updatedAt: new Date() },
            select: { id: true, satuanKg: true },
          })
          .catch(() => {});
        return { id: match.id, satuanKg: match.satuanKg ?? null };
      }
      const found = await prisma.product.findFirst({
        where: { name: { equals: productUpper, mode: "insensitive" } },
        select: { id: true, satuanKg: true },
      });
      if (found) {
        prisma.product
          .update({
            where: { id: found.id },
            data: { name: productUpper, updatedAt: new Date() },
            select: { id: true, satuanKg: true },
          })
          .catch(() => {});
        return { id: found.id, satuanKg: found.satuanKg ?? null };
      }
      const created = await prisma.product.create({
        data: {
          id: randomUUID(),
          name: productUpper,
          updatedAt: new Date(),
        },
        select: { id: true, satuanKg: true },
      });
      return { id: created.id, satuanKg: created.satuanKg ?? null };
    })().catch((e) => {
      productCache.delete(productKey);
      throw e;
    });

    productCache.set(productKey, p);
    return p;
  };

  return { getProduct };
}
