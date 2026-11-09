import * as XLSX from "xlsx";
import { cleanSiteArea } from "@/lib/credit-limit";

const exportDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" });

export function approvalExportRow(po: any, index: number) {
  // Explicit WIB keeps export dates identical on localhost and UTC-based serverless workers.
  const date = (value: string | Date | null) => value ? exportDate.format(new Date(value)) : "-";
  return { No: index + 1, Batch: po.CreditLimitBatch?.batchCode || "Tanpa Batch", "No PO": po.noPo || "-",
    Company: po.RitelModern?.namaPt || po.company || "-", Inisial: po.RitelModern?.inisial || "-",
    "Site Area": cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea), Tujuan: po.tujuanDetail || po.RitelModern?.tujuan || "-",
    "Tgl PO": date(po.tglPo), "Due Date": date(po.expiredTgl), "Tgl Kirim": date(po.tglkirim),
    "Pcs Total": Number(po.pcsTotal || 0), "Pcs Kirim": Number(po.pcsKirimTotal || 0), Nominal: Number(po.totalNominal || 0),
    "Kode Vendor": po.kodeVendor || "-", Remarks: po.remarksCreditLimit || "-", ND: po.isNotaDinas ? "true" : "false",
    Status: po.statusCreditLimit === "APPROVED" ? "Approved (Pusat)" : po.statusCreditLimit === "APPROVED_DIREKSI" ? "Approved (Direksi)" : (po.statusCreditLimit || "-") };
}

export function approvalExportWorkbook(rows: ReturnType<typeof approvalExportRow>[]) {
  const totals = rows.reduce((sum, row) => ({ pcs: sum.pcs + row["Pcs Total"], kirim: sum.kirim + row["Pcs Kirim"], nominal: sum.nominal + row.Nominal }), { pcs: 0, kirim: 0, nominal: 0 });
  const subtotal = Object.fromEntries(Object.keys(rows[0]).map(key => [key, ""]));
  Object.assign(subtotal, { "Tgl Kirim": "SUB TOTAL", "Pcs Total": totals.pcs, "Pcs Kirim": totals.kirim, Nominal: totals.nominal });
  const worksheet = XLSX.utils.json_to_sheet([...rows, subtotal]);
  worksheet["!cols"] = [4,16,18,25,12,18,18,12,12,12,10,10,16,14,25,12,20].map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Approval PO");
  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
