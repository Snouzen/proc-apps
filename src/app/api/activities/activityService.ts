import prisma from "@/lib/prisma";
import { checkPOOwnership, checkReturOwnership } from "@/lib/utils/regional";
import { checkReconcileAccess } from "@/app/api/rekon/services/rekonAccessHelper";

const ENTITIES = ["PurchaseOrder", "Reconcile", "DataRetur", "CreditLimitBatch"];
const FEED_SIZE = 15, BATCH_SIZE = 50, MAX_CANDIDATES = 150;

export async function fetchScopedActivities(auth: any, db: any = prisma) {
  const role = String(auth.safeRole || auth.role || "").trim().toLowerCase();
  const regional = auth.dbUser ? auth.dbUser.regional : auth.session?.regional;
  const siteArea = auth.dbUser ? auth.dbUser.siteArea : auth.session?.siteArea;
  // Preserve the existing global read scope of pusat/magang.
  const globalScope = role === "pusat" || role === "magang";
  const scoped = ["rm", "sitearea", "picsite", "spbdki"].includes(role);
  if (!globalScope && (!scoped || (role === "rm" ? !regional?.trim() : !siteArea?.trim()))) {
    return { data: [], scopeScanLimited: false };
  }
  const data: any[] = [];
  let scanned = 0;
  let cursor: string | undefined;
  const canPO = (po: any) => checkPOOwnership(po, role, regional, siteArea).allowed;
  // Bounded scan: a polling widget must not read the entire audit history.
  while (scanned < MAX_CANDIDATES && data.length < FEED_SIZE) {
    const take = globalScope ? FEED_SIZE : BATCH_SIZE;
    const activities = await db.auditLog.findMany({
      where: { entity: { in: ENTITIES }, action: "CREATE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...(!globalScope ? { select: { id: true, entity: true, entityId: true, action: true, userName: true, userRole: true, createdAt: true } } : {}),
    });
    if (!activities.length) return { data, scopeScanLimited: false };
    scanned += activities.length;
    cursor = activities[activities.length - 1].id;
    const ids = (entity: string) => activities.filter((a: any) => a.entity === entity).map((a: any) => a.entityId);
    const poIds = ids("PurchaseOrder"), rekonIds = ids("Reconcile"), returIds = ids("DataRetur").filter((id: string) => !id.startsWith("batch-"));
    const batchIds = ids("CreditLimitBatch");
    const [pos, rekons, returs, batches] = await Promise.all([
      poIds.length ? db.purchaseOrder.findMany({ where: { id: { in: poIds } }, select: { id: true, noPo: true, regional: true, unitProduksiId: true, UnitProduksi: true } }) : [],
      rekonIds.length ? db.reconcile.findMany({ where: { id: { in: rekonIds } }, select: { id: true, noRekonsiliasi: true, ritelId: true, invoices: true, rtvs: true, rtvDetails: true } }) : [],
      returIds.length ? db.dataRetur.findMany({ where: { id: { in: returIds } }, select: { id: true, rtvCn: true, lokasiBarangId: true, pembebananReturnId: true, LokasiBarang: true, PembebananReturn: true } }) : [],
      !globalScope && batchIds.length ? db.creditLimitBatch.findMany({ where: { id: { in: batchIds } }, select: {
        id: true, PurchaseOrders: { take: 51, select: { id: true, regional: true, unitProduksiId: true, UnitProduksi: true } },
      } }) : [],
    ]);
    const poMap = new Map<string, any>(pos.map((p: any) => [p.id, p]));
    const rekonMap = new Map<string, any>(rekons.map((r: any) => [r.id, r]));
    const returMap = new Map<string, any>(returs.map((r: any) => [r.id, r]));
    const batchMap = new Map<string, any>(batches.map((b: any) => [b.id, b]));
    for (const act of activities) {
      const po = poMap.get(act.entityId), rekon = rekonMap.get(act.entityId), retur = returMap.get(act.entityId);
      if (!globalScope) {
        let allowed = false;
        if (act.entity === "PurchaseOrder") allowed = Boolean(po && canPO(po));
        else if (act.entity === "DataRetur") allowed = Boolean(retur && checkReturOwnership(retur, role, regional, siteArea).allowed);
        else if (act.entity === "Reconcile") allowed = Boolean(rekon && (await checkReconcileAccess(rekon, auth, db)).allowed);
        else if (act.entity === "CreditLimitBatch") {
          const members = batchMap.get(act.entityId)?.PurchaseOrders || [];
          allowed = members.length > 0 && members.length <= 50 && members.every(canPO);
        }
        // No actor-based shortcut or fallback to stale audit snapshots.
        if (!allowed) continue;
      }
      const refNumber = act.entity === "PurchaseOrder" ? po?.noPo || (globalScope ? act.newData?.noPo : null)
        : act.entity === "Reconcile" ? rekon?.noRekonsiliasi || (globalScope ? act.newData?.noRekonsiliasi : null)
        : act.entity === "DataRetur" ? retur?.rtvCn || (globalScope ? act.newData?.rtvCn : null) : null;
      if (globalScope) data.push({ ...act, refNumber: refNumber || null });
      else {
        // Avoid snapshots containing unrelated historic references/global counts.
        data.push({ id: act.id, entityId: act.entityId, entity: act.entity, action: act.action,
          userName: act.userName, userRole: act.userRole, createdAt: act.createdAt,
          refNumber: refNumber || null, newData: null });
      }
      if (data.length === FEED_SIZE) break;
    }
    if (globalScope || activities.length < take) return { data, scopeScanLimited: false };
  }
  return { data, scopeScanLimited: data.length < FEED_SIZE && scanned >= MAX_CANDIDATES };
}
