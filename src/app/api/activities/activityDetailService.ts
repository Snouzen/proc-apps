import prisma from "@/lib/prisma";
import { hasPermission } from "@/lib/accessControl";
import { checkPOOwnership, checkReturOwnership } from "@/lib/utils/regional";
import { checkReconcileAccess } from "@/app/api/rekon/services/rekonAccessHelper";

export class ActivityDetailError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new ActivityDetailError(status, code, message); };
const value = (v: any) => v === null || v === undefined || v === "" ? "—" : String(v);
const date = (v: any) => v ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(v)) + " WIB" : "—";
const money = (v: any) => v === null || v === undefined ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));
const field = (label: string, v: any) => ({ label, value: value(v) });

export async function fetchActivityDetail(activityId: string, recordId: string | null, auth: any, db: any = prisma, permission = hasPermission) {
  const role = auth.safeRole || auth.role;
  const regional = auth.dbUser ? auth.dbUser.regional : auth.session?.regional;
  const siteArea = auth.dbUser ? auth.dbUser.siteArea : auth.session?.siteArea;
  const global = ["pusat", "magang"].includes(role);
  const log = await db.auditLog.findUnique({ where: { id: activityId }, select: { id: true, entity: true, entityId: true, action: true, newData: true, createdAt: true, userRole: true } });
  if (!log || log.action !== "CREATE" || !["PurchaseOrder", "DataRetur", "Reconcile", "CreditLimitBatch"].includes(log.entity)) fail(404, "ACTIVITY_NOT_FOUND", "Aktivitas tidak ditemukan.");
  const required = log.entity === "DataRetur" ? ["retur_view"] : log.entity === "Reconcile" ? ["rekon_view", "rekon_detail", "rekon_calc_save"] : log.entity === "CreditLimitBatch" ? ["cl_data_view", ...(role === "pusat" ? ["cl_appr_view"] : [])] : ["po_view", "po_create", "po_edit"];
  if (role !== "pusat" && !(await Promise.all(required.map(p => permission(role, p)))).some(Boolean)) fail(403, "ACTIVITY_PERMISSION_DENIED", "Akun tidak memiliki izin melihat jenis data ini.");
  const deny = () => fail(403, "ACTIVITY_SCOPE_DENIED", "Data tidak tersedia dalam wewenang akun Anda.");
  const missing = () => fail(404, "ACTIVITY_RECORD_NOT_FOUND", "Record sudah dihapus atau tidak ditemukan.");
  const checkPO = (po: any) => global || checkPOOwnership(po, role, regional, siteArea).allowed;
  const href = (id?: string) => `/activities/${encodeURIComponent(log.id)}${id ? "?recordId=" + encodeURIComponent(id) : ""}`;
  const creator = async (entity: string, id: string) => db.auditLog.findFirst({ where: { entity, entityId: id, action: "CREATE" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { userRole: true, createdAt: true } });
  let title = "", fields: Array<{ label: string; value: string }> = [], details: Array<{ label: string; value: string }> = [];
  let records: Array<{ id: string; number: string; role: string; createdAt: string; detailHref: string }> = [];
  let notice: string | null = null, noticeCode: string | null = null;
  if (log.entity === "PurchaseOrder") {
    if (recordId && recordId !== log.entityId) missing();
    const po = await db.purchaseOrder.findUnique({ where: { id: log.entityId }, include: { UnitProduksi: true, RitelModern: true, CreditLimitBatch: true, Items: { include: { Product: true } } } });
    if (!po) missing(); if (!checkPO(po)) deny();
    const initial = await creator("PurchaseOrder", po.id);
    title = "Detail PO";
    fields = [field("No. PO", po.noPo), field("Role pembuat", initial?.userRole), field("Tanggal input", date(po.createdAt)), field("Nama ritel", po.RitelModern?.namaPt), field("Site area", po.UnitProduksi?.siteArea)];
    details = [field("No. invoice", po.noInvoice), field("Tujuan", po.tujuanDetail), field("Regional", po.regional), field("Tanggal kirim", date(po.tglkirim)), field("Kode batch", po.CreditLimitBatch?.batchCode), ...(po.Items || []).map((i: any) => field(i.namaProduk || i.Product?.name || "Produk", `PCS PO: ${value(i.pcs)} · PCS kirim: ${value(i.pcsKirim)}`))];
  } else if (log.entity === "DataRetur") {
    const bulk = log.entityId.startsWith("batch-") || log.newData?.isBatch;
    if (bulk) {
      // Legacy bulk logs only store a count/company IDs. Never infer records by
      // company, CN or timestamp, which may associate unrelated rows.
      const ids = Array.isArray(log.newData?.recordIds) ? [...new Set<string>(log.newData.recordIds.filter((id: any) => typeof id === "string"))] : [];
      if (!ids.length) {
        if (!global) deny();
        title = "Upload Retur Massal";
        fields = [field("Jumlah retur", log.newData?.count), field("Role pembuat", log.userRole), field("Tanggal input", date(log.createdAt))];
        notice = "Log bulk lama tidak menyimpan ID tiap retur. Daftar nomor dan tautan detail tidak dapat ditentukan dengan aman."; noticeCode = "ACTIVITY_BULK_REFERENCES_UNAVAILABLE";
        return { title, fields, details, records, notice, noticeCode, detailHref: null, entity: log.entity };
      }
      if (ids.length > 100) fail(409, "ACTIVITY_BULK_TOO_LARGE", "Referensi aktivitas massal melebihi batas tampilan.");
      if (log.newData?.count !== undefined && Number(log.newData.count) !== ids.length) fail(409, "ACTIVITY_BULK_REFERENCES_INCOMPLETE", "Referensi record pada aktivitas massal tidak lengkap. Rincian tidak ditampilkan sebagian.");
      const rows = await db.dataRetur.findMany({ where: { id: { in: ids } }, include: { LokasiBarang: true, PembebananReturn: true } });
      if (rows.length !== ids.length) missing();
      if (!global && !rows.every((r: any) => checkReturOwnership(r, role, regional, siteArea).allowed)) deny();
      if (recordId) { if (!ids.includes(recordId)) missing(); }
      else {
        const logs = await db.auditLog.findMany({ where: { entity: "DataRetur", action: "CREATE", entityId: { in: ids } }, orderBy: [{ entityId: "asc" }, { createdAt: "asc" }], distinct: ["entityId"], select: { entityId: true, userRole: true } });
        const roles = new Map(logs.map((l: any) => [l.entityId, l.userRole]));
        title = "Upload Retur Massal";
        records = rows.map((r: any) => ({ id: r.id, number: value(r.rtvCn), role: value(roles.get(r.id) || log.userRole), createdAt: date(r.createdAt), detailHref: href(r.id) }));
        return { title, fields, details, records, notice, noticeCode, detailHref: null, entity: log.entity };
      }
    } else if (recordId && recordId !== log.entityId) missing();
    const id = recordId || log.entityId;
    const ret = await db.dataRetur.findUnique({ where: { id }, include: { Product: true, LokasiBarang: true, PembebananReturn: true, RitelModern: true } });
    if (!ret) missing(); if (!global && !checkReturOwnership(ret, role, regional, siteArea).allowed) deny();
    const initial = await creator("DataRetur", ret.id);
    title = "Ringkasan Retur";
    fields = [field("No. retur", ret.rtvCn), field("Role pembuat", initial?.userRole || (bulk ? log.userRole : null)), field("Tanggal input", date(ret.createdAt)), field("Produk", ret.produk || ret.Product?.name), field("Qty retur", ret.qtyReturn), field("Status barang", ret.statusBarang), field("Lokasi barang", ret.LokasiBarang?.siteArea)];
    details = [field("Nama ritel", ret.RitelModern?.namaPt || ret.namaCompany), field("Pembebanan retur", ret.PembebananReturn?.siteArea), field("Kemasan produk", ret.Product?.satuanKg ? ret.Product.satuanKg + " KG" : null), field("Nominal", money(ret.nominal)), field("Referensi pembayaran", ret.referensiPembayaran), field("Invoice rekon", ret.invoiceRekon), field("Remarks", ret.remarks)];
  } else if (log.entity === "Reconcile") {
    if (recordId && recordId !== log.entityId) missing();
    const rekon = await db.reconcile.findUnique({ where: { id: log.entityId }, include: { RitelModern: true } });
    if (!rekon) missing(); if (role !== "pusat" && !(await checkReconcileAccess(rekon, auth, db)).allowed) deny();
    title = "Ringkasan Rekonsiliasi";
    // nominal is the persisted Balance Net Due: never recalculate it here.
    fields = [field("No. rekon", rekon.noRekonsiliasi), field("Tanggal input", date(rekon.createdAt)), field("Nominal rekening koran", money(rekon.bankStatement)), field("Nama ritel", rekon.RitelModern?.namaPt), field("Net due", money(rekon.nominal))];
    details = [field("Status", rekon.status), field("Total invoice", money(rekon.totalInvoices)), field("Total RTV", money(rekon.totalRtvs)), field("Total promo", money(rekon.totalPromo)), field("Biaya admin", money(rekon.biayaAdmin)), field("Invoice", (rekon.invoices || []).join(", ")), field("RTV", (rekon.rtvs || []).join(", ")), field("Remarks", rekon.remarks)];
  } else {
    const batch = await db.creditLimitBatch.findUnique({ where: { id: log.entityId }, include: { PurchaseOrders: { take: 51, include: { UnitProduksi: true, RitelModern: true } } } });
    if (!batch) missing();
    const rows = batch.PurchaseOrders || [];
    if (rows.length > 50) fail(409, "ACTIVITY_BATCH_CAPACITY_INVALID", "Jumlah PO batch tidak sesuai batas kapasitas.");
    if (!global && (!rows.length || !rows.every(checkPO))) deny();
    if (recordId && !rows.some((p: any) => p.id === recordId)) missing();
    const requests = rows.length ? await db.auditLog.findMany({ where: { entity: "PurchaseOrder", action: "UPDATE", entityId: { in: rows.map((p: any) => p.id) }, OR: [{ newData: { path: ["action"], equals: "request" } }, { newData: { path: ["action"], equals: "reRequest" } }] }, orderBy: [{ entityId: "asc" }, { createdAt: "asc" }, { id: "asc" }], distinct: ["entityId"], select: { entityId: true, userRole: true, createdAt: true } }) : [];
    const requestMap = new Map<string, any>(requests.map((r: any) => [r.entityId, r]));
    title = "Ringkasan Credit Limit";
    fields = [field("Kode batch", batch.batchCode), field("Tanggal pembuatan batch", date(batch.createdAt))];
    records = (recordId ? rows.filter((p: any) => p.id === recordId) : rows).map((p: any) => ({ id: p.id, number: p.noPo, role: value(requestMap.get(p.id)?.userRole), createdAt: date(requestMap.get(p.id)?.createdAt), detailHref: href(p.id) }));
    if (recordId) {
      const po = rows.find((p: any) => p.id === recordId);
      details = [field("No. PO", po.noPo), field("Nama ritel", po.RitelModern?.namaPt), field("Site area", po.UnitProduksi?.siteArea), field("Status Credit Limit", po.statusCreditLimit), field("No. ND", po.noNd)];
    }
    notice = "Daftar PO mengikuti anggota batch saat ini. Identitas pengaju berasal dari pengajuan awal; jika riwayat tidak tersedia ditampilkan —.";
  }
  return { title, fields, details, records, notice, noticeCode, detailHref: href(recordId || undefined), entity: log.entity };
}
