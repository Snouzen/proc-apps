import prisma from "@/lib/prisma";
import { checkPOOwnership, checkReturOwnership } from "@/lib/utils/regional";

export interface ReconcileAccessTarget {
  id?: string;
  ritelId?: string | null;
  siblingRitelIds?: string[];
  status?: string | null;
  invoices?: string[] | null;
  rtvs?: string[] | null;
  rtvDetails?: any;
  createdBy?: string | null;
  preloadedCreatorId?: string | null;
  preloadedPos?: any[];
  preloadedReturs?: any[];
  preloadedPoMap?: Map<string, any[]>;
  preloadedIdReturMap?: Map<string, any>;
  preloadedCnReturMap?: Map<string, any[]>;
}

export function normalizeRitelKey(val?: string | null): string {
  if (val === null || val === undefined) return "";
  const s = String(val).trim().replace(/\s+/g, " ");
  if (s === "" || s === "—" || s === "-") return "";
  return s.toLowerCase();
}

/**
 * Resolves all RitelModern IDs that share the same (namaPt, inisial) regardless of tujuan.
 */
export async function resolveRitelGroup(
  db: any,
  ritelId?: string | null,
  companyName?: string | null,
  inisial?: string | null
): Promise<{
  primaryRitelId: string | null;
  namaPt: string | null;
  inisial: string | null;
  siblingRitelIds: string[];
  companyRitelIds: string[];
}> {
  const client = db || prisma;
  try {
    let targetRitel: { id: string; namaPt: string; inisial: string | null } | null = null;
    if (ritelId && client?.ritelModern?.findUnique) {
      targetRitel = await client.ritelModern.findUnique({
        where: { id: ritelId },
        select: { id: true, namaPt: true, inisial: true },
      });
    }

    const effectiveNamaPt = (targetRitel?.namaPt || companyName || "").trim();
    const hasExplicitInisial = inisial !== undefined && inisial !== null && String(inisial).trim() !== "";
    const effectiveInisial = hasExplicitInisial ? String(inisial).trim() : (targetRitel?.inisial ?? null);

    if (effectiveNamaPt && client?.ritelModern?.findMany) {
      const allCompanyRows: Array<{ id: string; namaPt: string; inisial: string | null }> =
        await client.ritelModern.findMany({
          where: {
            namaPt: { equals: effectiveNamaPt, mode: "insensitive" },
          },
          select: { id: true, namaPt: true, inisial: true },
        });

      if (allCompanyRows.length > 0) {
        const companyRitelIds = Array.from(
          new Set([...(targetRitel?.id ? [targetRitel.id] : []), ...allCompanyRows.map((r) => r.id)])
        );

        const shouldFilterInisial = hasExplicitInisial || Boolean(targetRitel);
        if (shouldFilterInisial) {
          const normInisial = normalizeRitelKey(effectiveInisial);
          const matchingRows = allCompanyRows.filter(
            (r) => normalizeRitelKey(r.inisial) === normInisial
          );
          const siblingRitelIds =
            matchingRows.length > 0
              ? Array.from(new Set(matchingRows.map((r) => r.id)))
              : targetRitel?.id
              ? [targetRitel.id]
              : companyRitelIds;
          const primaryRitelId =
            (ritelId && siblingRitelIds.includes(ritelId) ? ritelId : null) ||
            siblingRitelIds[0] ||
            targetRitel?.id ||
            ritelId ||
            null;

          return {
            primaryRitelId,
            namaPt: effectiveNamaPt,
            inisial: effectiveInisial,
            siblingRitelIds,
            companyRitelIds,
          };
        }

        return {
          primaryRitelId: ritelId || allCompanyRows[0]?.id || null,
          namaPt: effectiveNamaPt,
          inisial: effectiveInisial,
          siblingRitelIds: companyRitelIds,
          companyRitelIds,
        };
      }
    }
  } catch {
    // Fallback gracefully if ritelModern table is unavailable in unit test mocks
  }

  return {
    primaryRitelId: ritelId || null,
    namaPt: companyName || null,
    inisial: inisial || null,
    siblingRitelIds: ritelId ? [ritelId] : [],
    companyRitelIds: ritelId ? [ritelId] : [],
  };
}

export interface ReconcileAuthContext {
  session?: any;
  dbUser?: any;
  role?: string | null;
  safeRole?: string | null;
  userRegional?: string | null;
  userSiteArea?: string | null;
  userId?: string | null;
}

/**
 * Unified access validator for Reconcile records.
 * Rules:
 * 1. Pusat has unrestricted access.
 * 2. Regional Manager (RM) and Site Area fail-closed if regional/siteArea configurations are missing.
 * 3. Every requested invoice must be resolved and authorized (.every, fail-closed on missing/partial).
 * 4. Every requested RTV must be resolved:
 *    - Items with an explicit ID are resolved ONLY by ID (scoped by ritelId).
 *    - Items without an ID use fallback CN resolution (scoped by ritelId) and reject ambiguous multi-product CNs.
 * 5. Reconciles with no POs and no Returs: verified via persistent AuditLog creator record.
 */
export async function checkReconcileAccess(
  rekon: ReconcileAccessTarget,
  auth: ReconcileAuthContext,
  txOrPrisma?: any
): Promise<{ allowed: boolean; reason?: string }> {
  const db = txOrPrisma || prisma;
  const safeRole = String(auth?.safeRole || auth?.role || "").toLowerCase().trim();

  // 1. Pusat has unrestricted access
  if (safeRole === "pusat") {
    return { allowed: true };
  }

  // 2. Resolve user's regional and siteArea scopes
  const userRegional =
    auth?.userRegional ??
    auth?.dbUser?.regional ??
    (auth?.session as any)?.regional ??
    null;
  const userSiteArea =
    auth?.userSiteArea ??
    auth?.dbUser?.siteArea ??
    (auth?.session as any)?.siteArea ??
    null;
  const currentUserId =
    auth?.userId ??
    auth?.dbUser?.id ??
    (auth?.session as any)?.user?.id ??
    null;

  // 3. Fail-closed for scoped roles without proper configuration
  if (safeRole === "rm") {
    if (!userRegional || !userRegional.trim()) {
      return {
        allowed: false,
        reason: "Akun Regional Manager tidak memiliki konfigurasi wilayah regional.",
      };
    }
  } else if (safeRole === "sitearea" || safeRole === "picsite" || safeRole === "spbdki") {
    if (!userSiteArea || !userSiteArea.trim()) {
      return {
        allowed: false,
        reason: "Akun Cabang / Site Area tidak memiliki konfigurasi siteArea.",
      };
    }
  } else if (safeRole !== "magang") {
    return {
      allowed: false,
      reason: "Akun Anda tidak memiliki hak akses pada data rekonsiliasi ini.",
    };
  }

  const invoices = Array.isArray(rekon?.invoices)
    ? rekon.invoices.filter((x): x is string => Boolean(x && typeof x === "string"))
    : [];

  const rtvs = Array.isArray(rekon?.rtvs)
    ? rekon.rtvs.filter((x): x is string => Boolean(x && typeof x === "string"))
    : [];
  const rtvDetails = Array.isArray(rekon?.rtvDetails) ? rekon.rtvDetails : [];

  const explicitRtvIds = rtvDetails
    .map((d: any) => (typeof d === "object" && d?.id ? String(d.id).trim() : null))
    .filter(Boolean) as string[];

  // Fallback CN items: only items without an ID
  const detailCnsWithoutId = rtvDetails
    .filter((d: any) => !(typeof d === "object" && d?.id))
    .map((d: any) => (typeof d === "object" && d?.noRtv ? String(d.noRtv).trim() : null))
    .filter(Boolean) as string[];
  const rootRtvsWithoutId = rtvs
    .map((r) => String(r).trim())
    .filter((r) => !rtvDetails.some((d: any) => d?.id && d?.noRtv === r));
  const fallbackRtvCns = Array.from(new Set([...detailCnsWithoutId, ...rootRtvsWithoutId]));

  // Resolve sibling RitelModern IDs (same namaPt + inisial, ignoring tujuan)
  let siblingRitelIds: string[] = [];
  if (Array.isArray(rekon?.siblingRitelIds) && rekon.siblingRitelIds.length > 0) {
    siblingRitelIds = rekon.siblingRitelIds;
  } else if (rekon?.ritelId) {
    const group = await resolveRitelGroup(db, rekon.ritelId);
    siblingRitelIds = group.siblingRitelIds.length > 0 ? group.siblingRitelIds : [rekon.ritelId];
  }
  const siblingRitelSet = new Set<string>(siblingRitelIds);
  const isDraftRekon = String(rekon?.status || "").toLowerCase() === "draft";

  const isReturWithoutUnit = (ret: any) =>
    !ret?.LokasiBarang && !ret?.PembebananReturn && !ret?.lokasiBarangId && !ret?.pembebananReturnId;

  let checkedPoCount = 0;
  let checkedReturCount = 0;

  // 4. Validate PO ownership (ensure every requested invoice is present and authorized)
  if (rekon.preloadedPoMap !== undefined || rekon.preloadedPos !== undefined) {
    let preloadedMap: Map<string, any[]>;
    if (rekon.preloadedPoMap !== undefined) {
      preloadedMap = rekon.preloadedPoMap;
    } else {
      preloadedMap = new Map<string, any[]>();
      for (const po of (rekon.preloadedPos || [])) {
        if (po?.noInvoice) {
          if (!preloadedMap.has(po.noInvoice)) preloadedMap.set(po.noInvoice, []);
          preloadedMap.get(po.noInvoice)!.push(po);
        }
      }
    }

    for (const inv of invoices) {
      let pos = preloadedMap.get(inv) || [];
      if (siblingRitelSet.size > 0) {
        pos = pos.filter((p) => p.ritelId && siblingRitelSet.has(p.ritelId));
      }
      if (pos.length === 0) {
        return {
          allowed: false,
          reason: `Data invoice "${inv}" tidak ditemukan atau bukan milik ritel rekonsiliasi ini.`,
        };
      }
      for (const po of pos) {
        const chk = checkPOOwnership(po, safeRole, userRegional, userSiteArea);
        if (!chk.allowed) {
          return {
            allowed: false,
            reason: chk.reason || `PO #${po.noPo || inv} di luar wewenang regional Anda.`,
          };
        }
      }
    }
    checkedPoCount = invoices.length;
  } else if (invoices.length > 0) {
    const pos = await db.purchaseOrder.findMany({
      where: {
        noInvoice: { in: invoices },
        ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
      },
      include: { UnitProduksi: true },
    });

    const foundInvoiceSet = new Set(pos.map((p: any) => p.noInvoice).filter(Boolean));
    const missingInvoices = invoices.filter((inv) => !foundInvoiceSet.has(inv));
    if (missingInvoices.length > 0) {
      return {
        allowed: false,
        reason: `Satu atau lebih invoice rekonsiliasi tidak ditemukan di sistem: ${missingInvoices.slice(0, 3).join(", ")}.`,
      };
    }

    for (const po of pos) {
      const chk = checkPOOwnership(po, safeRole, userRegional, userSiteArea);
      if (!chk.allowed) {
        return {
          allowed: false,
          reason: chk.reason || `PO #${po.noPo} di luar wewenang regional Anda.`,
        };
      }
    }
    checkedPoCount = invoices.length;
  }

  // 5. Validate Retur / RTV ownership (scoped by siblingRitelIds, ID-only resolution for items with ID)
  if (
    rekon.preloadedIdReturMap !== undefined ||
    rekon.preloadedCnReturMap !== undefined ||
    rekon.preloadedReturs !== undefined
  ) {
    let preloadedIdMap: Map<string, any>;
    let preloadedCnMap: Map<string, any[]>;

    if (rekon.preloadedIdReturMap && rekon.preloadedCnReturMap) {
      preloadedIdMap = rekon.preloadedIdReturMap;
      preloadedCnMap = rekon.preloadedCnReturMap;
    } else {
      const preloaded = rekon.preloadedReturs || [];
      preloadedIdMap = new Map<string, any>();
      preloadedCnMap = new Map<string, any[]>();

      for (const r of preloaded) {
        if (r?.id) preloadedIdMap.set(String(r.id), r);
        if (r?.rtvCn) {
          if (!preloadedCnMap.has(r.rtvCn)) preloadedCnMap.set(r.rtvCn, []);
          preloadedCnMap.get(r.rtvCn)!.push(r);
        }
      }
    }

    // 5a. Explicit IDs: match ONLY by ID
    for (const rId of explicitRtvIds) {
      const ret = preloadedIdMap.get(rId);
      if (!ret) {
        return {
          allowed: false,
          reason: `Data retur RTV dengan ID "${rId}" tidak ditemukan atau belum dimuat.`,
        };
      }
      if (siblingRitelSet.size > 0 && (!ret.ritelId || !siblingRitelSet.has(ret.ritelId))) {
        return {
          allowed: false,
          reason: `Data retur RTV dengan ID "${rId}" bukan milik ritel rekonsiliasi ini.`,
        };
      }
      if (isDraftRekon && isReturWithoutUnit(ret)) {
        continue;
      }
      const chk = checkReturOwnership(ret, safeRole, userRegional, userSiteArea);
      if (!chk.allowed) {
        return {
          allowed: false,
          reason: chk.reason || `Retur RTV #${ret.rtvCn || rId} di luar wewenang Anda.`,
        };
      }
    }

    // 5b. Fallback CNs: items WITHOUT an ID
    for (const cn of fallbackRtvCns) {
      let matches = preloadedCnMap.get(cn) || [];
      if (siblingRitelSet.size > 0) {
        matches = matches.filter((r) => r.ritelId && siblingRitelSet.has(r.ritelId));
      }
      if (matches.length === 0) {
        return {
          allowed: false,
          reason: `Data retur RTV "${cn}" tidak ditemukan di sistem atau bukan milik ritel rekonsiliasi ini.`,
        };
      }
      const uniqueMatchIds = new Set(matches.map((r: any) => String(r.id || "")));
      if (uniqueMatchIds.size > 1) {
        return {
          allowed: false,
          reason: `Nomor RTV "${cn}" memiliki beberapa produk retur berbeda di sistem. Harap sertakan ID retur spesifik.`,
        };
      }
      if (isDraftRekon && isReturWithoutUnit(matches[0])) {
        continue;
      }
      const chk = checkReturOwnership(matches[0], safeRole, userRegional, userSiteArea);
      if (!chk.allowed) {
        return {
          allowed: false,
          reason: chk.reason || `Retur RTV #${cn} di luar wewenang Anda.`,
        };
      }
    }
    checkedReturCount = explicitRtvIds.length + fallbackRtvCns.length;
  } else if (explicitRtvIds.length > 0 || fallbackRtvCns.length > 0) {
    // 5a. Explicit IDs: query strictly by ID (scoped by siblingRitelIds)
    if (explicitRtvIds.length > 0) {
      const idRecords = await db.dataRetur.findMany({
        where: {
          id: { in: explicitRtvIds },
          ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
        },
        include: { LokasiBarang: true, PembebananReturn: true },
      });

      const foundIdSet = new Set(idRecords.map((r: any) => String(r.id)));
      const missingIds = explicitRtvIds.filter((id) => !foundIdSet.has(id));
      if (missingIds.length > 0) {
        return {
          allowed: false,
          reason: `Satu atau lebih ID retur RTV tidak ditemukan di sistem: ${missingIds.slice(0, 3).join(", ")}.`,
        };
      }

      for (const ret of idRecords) {
        if (isDraftRekon && isReturWithoutUnit(ret)) {
          continue;
        }
        const chk = checkReturOwnership(ret, safeRole, userRegional, userSiteArea);
        if (!chk.allowed) {
          return {
            allowed: false,
            reason: chk.reason || `Retur RTV #${ret.rtvCn || ret.id} di luar wewenang Anda.`,
          };
        }
      }
    }

    // 5b. Fallback CNs: query strictly items without ID (scoped by siblingRitelIds)
    if (fallbackRtvCns.length > 0) {
      const cnRecords = await db.dataRetur.findMany({
        where: {
          rtvCn: { in: fallbackRtvCns },
          ...(siblingRitelIds.length > 0 ? { ritelId: { in: siblingRitelIds } } : {}),
        },
        include: { LokasiBarang: true, PembebananReturn: true },
      });

      for (const cn of fallbackRtvCns) {
        const matches = cnRecords.filter((r: any) => r.rtvCn === cn);
        if (matches.length === 0) {
          return {
            allowed: false,
            reason: `Data retur RTV "${cn}" tidak ditemukan di sistem atau bukan milik ritel ini.`,
          };
        }
        const uniqueMatchIds = new Set(matches.map((r: any) => String(r.id || "")));
        if (uniqueMatchIds.size > 1) {
          return {
            allowed: false,
            reason: `Nomor RTV "${cn}" memiliki beberapa produk retur berbeda di sistem. Harap sertakan ID retur spesifik.`,
          };
        }
        if (isDraftRekon && isReturWithoutUnit(matches[0])) {
          continue;
        }
        const chk = checkReturOwnership(matches[0], safeRole, userRegional, userSiteArea);
        if (!chk.allowed) {
          return {
            allowed: false,
            reason: chk.reason || `Retur RTV #${cn} di luar wewenang Anda.`,
          };
        }
      }
    }
    checkedReturCount = explicitRtvIds.length + fallbackRtvCns.length;
  }

  // 6. If reconcile has neither POs nor Returs: check persistent creator via AuditLog
  if (checkedPoCount === 0 && checkedReturCount === 0) {
    if (rekon.preloadedCreatorId !== undefined) {
      if (rekon.preloadedCreatorId && currentUserId && rekon.preloadedCreatorId === currentUserId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: "Rekonsiliasi draft kosong hanya dapat diakses oleh pembuatnya.",
      };
    }

    if (rekon?.id && currentUserId) {
      try {
        const createLog = await db.auditLog.findFirst({
          where: {
            entity: "Reconcile",
            entityId: rekon.id,
            action: "CREATE",
          },
          select: { userId: true },
          orderBy: { createdAt: "asc" },
        });
        if (createLog?.userId && createLog.userId === currentUserId) {
          return { allowed: true };
        }
      } catch {
        // Fallback to rejection on query error
      }
    }
    return {
      allowed: false,
      reason: "Rekonsiliasi tidak memiliki data PO atau Retur yang dapat divalidasi wewenangnya.",
    };
  }

  return { allowed: true };
}
