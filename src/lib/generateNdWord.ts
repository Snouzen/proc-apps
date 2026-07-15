import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

export interface PiutangRow {
  tgl_input: string;
  tbl_1_30: string;
  tbl_2_30: string;
  total: string;
  tbl_cash_in: string;
  tbl_net_piutang: string;
  tbl_sales: string;
  tbl_ars: string;
}

export interface NdFormData {
  nomor_surat: string;
  det_perihal: string;
  tgl_input: string;
  nominal_teks_1: string;
  nominal_teks: string;
  percentage: string;
  qty: string;
  nominal_teks_2: string;
  nominal_teks_3: string;
  nominal_teks_4: string;
  nominal_teks_5: string;
  nominal_teks_6: string;
  list_piutang: PiutangRow[];
}

export function getDefaultNdFormData(): NdFormData {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return {
    nomor_surat: `/DB602/${month}/${year}`,
    det_perihal: `Permohonan Persetujuan Pembukaan Credit Limit bulan ${getMonthName(now.getMonth())} ${year}.`,
    tgl_input: formatDateIndonesian(now),
    nominal_teks_1: "",
    nominal_teks: "",
    percentage: "",
    qty: "",
    nominal_teks_2: "",
    nominal_teks_3: "",
    nominal_teks_4: "",
    nominal_teks_5: "",
    nominal_teks_6: "",
    list_piutang: [
      {
        tgl_input: "",
        tbl_1_30: "",
        tbl_2_30: "",
        total: "",
        tbl_cash_in: "",
        tbl_net_piutang: "",
        tbl_sales: "",
        tbl_ars: "",
      },
    ],
  };
}

function getMonthName(monthIndex: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return months[monthIndex];
}

function formatDateIndonesian(date: Date): string {
  const day = date.getDate();
  const month = getMonthName(date.getMonth());
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export async function generateNdWord(formData: NdFormData, pos?: any[]): Promise<void> {
  // Fetch the template from public folder
  const response = await fetch("/template/Draft ND Pengajuan Credit Limit.docx");
  if (!response.ok) {
    throw new Error("Gagal memuat template Word. Pastikan file template ada di folder public/template/");
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Don't throw on undefined tags - leave them blank
    nullGetter: () => "",
  });

  const cleanSiteArea = (str: string) => {
    if (!str) return "-";
    return str
      .replace(/KANTOR CABANG/i, "KC")
      .replace(/KANTOR WILAYAH/i, "KANWIL")
      .replace(/SUB CABANG/i, "KCP");
  };

  const list_po_grouped = [];
  if (pos && pos.length > 0) {
    const groupedPos = pos.reduce((acc: any, po: any) => {
      const siteArea = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea || "-");
      if (!acc[siteArea]) acc[siteArea] = [];
      acc[siteArea].push(po);
      return acc;
    }, {});

    let groupIndex = 1;
    for (const [site, items] of Object.entries(groupedPos)) {
      const itms = items as any[];
      const firstItem = itms[0];
      const restItems = itms.slice(1).map((po: any) => ({
        kodeVendor: po.kodeVendor || "-",
        inisial: po.RitelModern?.inisial || "-",
        noPo: po.noPo,
        totalAmount: Number(po.totalNominal || po.nominal || 0).toLocaleString("id-ID"),
      }));
      const subtotal = itms.reduce((sum: number, po: any) => sum + Number(po.totalNominal || po.nominal || 0), 0);

      list_po_grouped.push({
        no: groupIndex++,
        siteArea: site,
        firstKodeVendor: firstItem.kodeVendor || "-",
        firstInisial: firstItem.RitelModern?.inisial || "-",
        firstNoPo: firstItem.noPo,
        firstTotalAmount: Number(firstItem.totalNominal || firstItem.nominal || 0).toLocaleString("id-ID"),
        rest_items: restItems,
        subtotal: subtotal.toLocaleString("id-ID"),
      });
    }
  }

  // Render data into the template
  doc.render({ ...formData, list_po_grouped });

  // Generate output
  const output = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  // Trigger download
  const now = new Date();
  const dateStr = `${now.getDate()}${getMonthName(now.getMonth())}${now.getFullYear()}`;
  saveAs(output, `ND Pengajuan Credit Limit ${dateStr}.docx`);
}
