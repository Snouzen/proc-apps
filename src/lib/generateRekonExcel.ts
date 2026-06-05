import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const generateRekonExcel = (items: any[], filterInfo: any) => {
  try {
    const wb = XLSX.utils.book_new();

    items.forEach((item, index) => {
      const sheetName = item.noRekonsiliasi.replace(/[\/\?\*\[\]]/g, '_').substring(0, 31) || `Rekon_${index + 1}`;
      
      const wsData: any[][] = [];

      // --- Header ---
      wsData.push(["Laporan Rekonsiliasi Pembayaran"]);
      wsData.push(["No. Rekon", item.noRekonsiliasi]);
      wsData.push(["Ritel", item.RitelModern?.namaPt || "-"]);
      wsData.push(["Tanggal Cetak", format(new Date(), "dd MMM yyyy HH:mm", { locale: id })]);
      wsData.push([]);

      // --- Summary ---
      wsData.push(["Bank Statement", "Total Invoice", "Total RTV", "Promo", "Admin Fee", "Net Due", "Selisih"]);
      
      const calcTotal = Number(item.totalInvoices || 0) - Number(item.totalRtvs || 0) - Number(item.totalPromo || 0) - Number(item.biayaAdmin || 0);
      const selisih = Number(item.bankStatement || 0) - calcTotal;

      wsData.push([
        Number(item.bankStatement || 0),
        Number(item.totalInvoices || 0),
        Number(item.totalRtvs || 0),
        Number(item.totalPromo || 0),
        Number(item.biayaAdmin || 0),
        Number(item.nominal || 0),
        selisih
      ]);
      wsData.push([]);

      // --- Invoices ---
      wsData.push(["Detail Invoice"]);
      wsData.push(["#", "No. Invoice", "Unit Produksi", "Produk", "Nominal"]);
      if (item.invoices && item.invoices.length > 0) {
        item.invoices.forEach((inv: any, i: number) => {
          wsData.push([
            i + 1,
            inv.noInvoice || "-",
            inv.unitProduksi || "-",
            inv.produk || "-",
            Number(inv.nominal || 0)
          ]);
        });
      } else {
        wsData.push(["-", "Tidak ada invoice", "-", "-", "-"]);
      }
      wsData.push([]);

      // --- RTVs ---
      wsData.push(["Detail RTV"]);
      wsData.push(["#", "No. RTV", "Tgl RTV", "Pcs", "Ref. Invoice", "Unit Produksi", "Pembebanan", "Lokasi Barang", "Tujuan", "Produk", "Rp/Kg", "Nominal"]);
      if (item.rtvs && item.rtvs.length > 0) {
        item.rtvs.forEach((rtv: any, i: number) => {
          const rtvNo = typeof rtv === "string" ? rtv : rtv.noRtv;
          const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
          const nominal = typeof rtv === "object" ? rtv.nominal : 0;
          const pembebanan = typeof rtv === "object" ? (rtv.pembebananRetur || "-") : "-";
          const lokasi = typeof rtv === "object" ? (rtv.lokasiBarang || "-") : "-";
          const produk = typeof rtv === "object" ? (rtv.produk || "-") : "-";
          const tujuan = typeof rtv === "object" ? (rtv.tujuan || "-") : "-";
          const rpKg = typeof rtv === "object" ? (rtv.rpKg || 0) : 0;
          const pcs = typeof rtv === "object" ? (rtv.qty || rtv.qtyReturn || 0) : 0;
          const tanggalRtv = (typeof rtv === "object" && rtv.tanggalRtv) ? format(new Date(rtv.tanggalRtv), "dd/MM/yyyy") : "-";
          
          const relatedInv = (item.invoices || []).find((inv: any) => inv.noInvoice === refInv);
          const unitProduksi = relatedInv?.siteArea || relatedInv?.unitProduksi || "-";
          
          wsData.push([
            i + 1,
            rtvNo || "-",
            tanggalRtv,
            Number(pcs),
            refInv || "-",
            unitProduksi,
            pembebanan,
            lokasi,
            tujuan,
            produk,
            Number(rpKg),
            Number(nominal || 0)
          ]);
        });
      } else {
        wsData.push(["-", "Tidak ada RTV", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
      }
      wsData.push([]);

      // --- Notes ---
      if (item.notesDesc || item.notesNominal) {
        wsData.push(["Notes / Inisiasi Manual"]);
        wsData.push(["Keterangan", item.notesDesc || "-"]);
        wsData.push(["Nominal Penambah", Number(item.notesNominal || 0)]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Simple formatting for numbers (optional, XLSX supports basic styling if pro, but we can at least format columns)
      // Auto-size columns loosely
      ws['!cols'] = [
        { wch: 15 }, // A
        { wch: 25 }, // B
        { wch: 25 }, // C
        { wch: 25 }, // D
        { wch: 25 }, // E
        { wch: 25 }, // F
        { wch: 25 }, // G
        { wch: 15 }, // H
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Write file
    let fileName = `Rekon_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    if (items.length === 1) {
       fileName = `Rekon_${items[0].noRekonsiliasi.replace(/[\/\?\*\[\]]/g, '_')}.xlsx`;
    }
    
    XLSX.writeFile(wb, fileName);
    return true;
  } catch (error) {
    console.error("Generate Excel Error:", error);
    throw error;
  }
};
