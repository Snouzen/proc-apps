import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const generateRekonExcel = (items: any[], filterInfo: any) => {
  try {
    const wb = XLSX.utils.book_new();

    const wsData: any[][] = [];
    
    // --- Header ---
    wsData.push(["LAPORAN REKONSILIASI PEMBAYARAN UB INDUSTRI"]);
    
    const filterParts: string[] = [];
    if (filterInfo?.startDate) filterParts.push(`Dari: ${format(new Date(filterInfo.startDate), "dd MMM yyyy", { locale: id })}`);
    if (filterInfo?.endDate) filterParts.push(`Sampai: ${format(new Date(filterInfo.endDate), "dd MMM yyyy", { locale: id })}`);
    if (filterInfo?.search) filterParts.push(`Pencarian: "${filterInfo.search}"`);
    const filterText = filterParts.length > 0 ? filterParts.join(" | ") : "Semua Data";
    
    wsData.push([`Filter: ${filterText}`]);
    const createdDate = items.length > 0 && items[0].createdAt ? format(new Date(items[0].createdAt), "dd MMM yyyy", { locale: id }) : "-";
    wsData.push([`Tgl Dibuat: ${createdDate}`]);
    wsData.push([]);
    
    // --- Summary Table Header ---
    wsData.push(["RINGKASAN REKONSILIASI"]);
    wsData.push([
      "#", "No. Rekon", "Ritel", "Bank Statement", "Invoice", "RTV", "Promo", "Admin Fee", "Notes", "Remarks", "Net Due", "Tanggal"
    ]);

    let grandBS = 0, grandInv = 0, grandRtv = 0, grandPromo = 0, grandAdmin = 0, grandNotes = 0, grandNet = 0;

    items.forEach((item, idx) => {
      grandBS += Number(item.bankStatement || 0);
      grandInv += Number(item.totalInvoices || 0);
      grandRtv += Number(item.totalRtvs || 0);
      grandPromo += Number(item.totalPromo || 0);
      grandAdmin += Number(item.biayaAdmin || 0);
      grandNotes += Number(item.notesNominal || 0);
      grandNet += Number(item.nominal || 0);

      wsData.push([
        idx + 1,
        item.noRekonsiliasi || "-",
        item.RitelModern?.namaPt || "-",
        Number(item.bankStatement || 0),
        Number(item.totalInvoices || 0),
        Number(item.totalRtvs || 0),
        Number(item.totalPromo || 0),
        Number(item.biayaAdmin || 0),
        Number(item.notesNominal || 0),
        item.remarks || "-",
        Number(item.nominal || 0),
        item.tglBayar ? format(new Date(item.tglBayar), "dd/MM/yyyy") : "-"
      ]);
    });

    // Grand Totals
    wsData.push([
      "", "", "GRAND TOTAL",
      grandBS, grandInv, grandRtv, grandPromo, grandAdmin, grandNotes, "", grandNet, ""
    ]);

    wsData.push([]);
    wsData.push([]);
    
    // --- Signatures ---
    wsData.push(["", "Diketahui oleh,", "", "", "", "", "Dibuat Oleh,"]);
    wsData.push([]);
    wsData.push([]);
    wsData.push([]);
    wsData.push(["", "Fiana Fega Sari", "Muhammad Fakri Firdaus", "", "", "", "Izath Rytami", "Rakha Arfiansyah"]);
    wsData.push(["", "Manager Keuangan dan Umum", "Manager Bisnis", "", "", "", "Asman Penjualan", "Asman Akuntansi dan Umum"]);

    wsData.push([]);
    wsData.push([]);
    wsData.push(["======================================================================================================"]);
    wsData.push([]);
    wsData.push([]);

    // --- Breakdown per Record ---
    items.forEach((item, index) => {
      // --- Breakdown Header ---
      wsData.push([`BREAKDOWN: ${item.noRekonsiliasi || "-"}`]);
      wsData.push([`Ritel: ${item.RitelModern?.namaPt || "-"}`]);
      wsData.push([`Tanggal Pembayaran: ${item.tglBayar ? format(new Date(item.tglBayar), "dd MMM yyyy", { locale: id }) : "-"}`]);
      wsData.push([]);

      // --- Summary Box ---
      wsData.push(["Bank Statement", "Total Invoice", "Total RTV", "Promo", "Admin Fee", "NET DUE", "REMARKS"]);
      wsData.push([
        Number(item.bankStatement || 0),
        Number(item.totalInvoices || 0),
        Number(item.totalRtvs || 0),
        Number(item.totalPromo || 0),
        Number(item.biayaAdmin || 0) * -1,
        Number(item.nominal || 0),
        item.remarks || "-"
      ]);
      wsData.push([]);

      // --- Bank Statement Detail ---
      wsData.push([`DETAIL BANK STATEMENT`]);
      wsData.push(["#", "Deskripsi", "Nominal"]);
      if (item.bankStatements && item.bankStatements.length > 0) {
        item.bankStatements.forEach((bs: any, i: number) => {
          wsData.push([i + 1, bs.desc || "-", Number(bs.nominal || 0)]);
        });
        wsData.push(["", "TOTAL BANK STATEMENT", Number(item.bankStatement || 0)]);
      } else {
        wsData.push(["-", "Total Keseluruhan", Number(item.bankStatement || 0)]);
      }
      wsData.push([]);

      // --- Invoices ---
      wsData.push([`DETAIL INVOICE (${item.invoices?.length || 0})`]);
      wsData.push(["#", "No. Invoice", "Unit Produksi", "Produk", "Nominal"]);
      if (item.invoices && item.invoices.length > 0) {
        item.invoices.forEach((inv: any, i: number) => {
          wsData.push([
            i + 1,
            inv.noInvoice || "-",
            inv.siteArea || inv.unitProduksi || "-",
            inv.produk || "-",
            Number(inv.nominal || 0)
          ]);
        });
        wsData.push(["", "TOTAL INVOICE", "", "", Number(item.totalInvoices || 0)]);
      } else {
        wsData.push(["-", "Tidak ada invoice", "-", "-", "-"]);
      }
      wsData.push([]);

      // --- RTVs ---
      wsData.push([`DETAIL RTV (${item.rtvs?.length || 0})`]);
      wsData.push(["#", "No. RTV", "Pcs", "Ref. Invoice", "Unit Produksi", "Lokasi Barang", "Tujuan", "Produk", "Rp/Kg", "Nominal"]);
      if (item.rtvs && item.rtvs.length > 0) {
        item.rtvs.forEach((rtv: any, i: number) => {
          const rtvNo = typeof rtv === "string" ? rtv : rtv.noRtv;
          const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
          const nominal = typeof rtv === "object" ? rtv.nominal : 0;
          const lokasi = typeof rtv === "object" ? (rtv.lokasiBarang || "-") : "-";
          const produk = typeof rtv === "object" ? (rtv.produk || "-") : "-";
          const tujuan = typeof rtv === "object" ? (rtv.tujuan || "-") : "-";
          const rpKg = typeof rtv === "object" ? (rtv.rpKg || 0) : 0;
          const pcs = typeof rtv === "object" ? (rtv.qty || rtv.qtyReturn || 0) : 0;
          
          const relatedInv = (item.invoices || []).find((inv: any) => inv.noInvoice === refInv);
          const unitProduksi = relatedInv?.siteArea || relatedInv?.unitProduksi || "-";
          
          wsData.push([
            i + 1,
            rtvNo || "-",
            Number(pcs),
            refInv || "-",
            unitProduksi,
            lokasi,
            tujuan,
            produk,
            Number(rpKg),
            Number(nominal || 0)
          ]);
        });
        wsData.push(["", "TOTAL RTV", "", "", "", "", "", "", "", Number(item.totalRtvs || 0)]);
      } else {
        wsData.push(["-", "Tidak ada RTV", "-", "-", "-", "-", "-", "-", "-", "-"]);
      }
      wsData.push([]);

      // --- Summary Net Tiap Invoice ---
      wsData.push(["SUMMARY NET TIAP INVOICE"]);
      wsData.push(["#", "Unit Produksi / Site Area", "No. Invoice", "Nominal Invoice", "No. Retur", "Nominal Retur", "Jumlah Total (Net)"]);
      
      const sortedInvoices = [...(item.invoices || [])].sort((a, b) => {
        const ua = (a.siteArea || a.unitProduksi || "").toLowerCase();
        const ub = (b.siteArea || b.unitProduksi || "").toLowerCase();
        return ua.localeCompare(ub);
      });

      let grandNominalInv = 0;
      let grandNominalRetur = 0;
      let grandNetTotal = 0;
      
      if (sortedInvoices.length > 0) {
        sortedInvoices.forEach((inv: any, i: number) => {
          const unitProduksi = inv.siteArea || inv.unitProduksi || "-";
          const noInvoice = inv.noInvoice || "-";
          const nominalInv = Number(inv.nominal) || 0;
          
          const relatedRtvs = (item.rtvs || []).filter((rtv: any) => {
            const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
            return refInv === noInvoice;
          });
          const nominalRetur = relatedRtvs.reduce((sum: number, rtv: any) => sum + (Number(rtv.nominal) || 0), 0);
          const netNominal = nominalInv - nominalRetur;
          
          grandNominalInv += nominalInv;
          grandNominalRetur += nominalRetur;
          grandNetTotal += netNominal;

          if (relatedRtvs.length > 0) {
            wsData.push([
              i + 1,
              unitProduksi,
              noInvoice,
              nominalInv,
              typeof relatedRtvs[0] === "string" ? relatedRtvs[0] : (relatedRtvs[0].noRtv || "-"),
              Number(relatedRtvs[0].nominal || 0),
              netNominal
            ]);
            for (let j = 1; j < relatedRtvs.length; j++) {
              const rtv = relatedRtvs[j];
              wsData.push([
                "", "", "", "",
                typeof rtv === "string" ? rtv : (rtv.noRtv || "-"),
                Number(rtv.nominal || 0),
                ""
              ]);
            }
          } else {
            wsData.push([
              i + 1,
              unitProduksi,
              noInvoice,
              nominalInv,
              "-",
              0,
              netNominal
            ]);
          }
        });
        wsData.push(["", "TOTAL KESELURUHAN", "", grandNominalInv, "", grandNominalRetur, grandNetTotal]);
      } else {
        wsData.push(["-", "Tidak ada invoice", "-", "-", "-", "-", "-"]);
      }
      wsData.push([]);

      // --- Rekap Transfer Move ---
      if (item.rtvs && item.rtvs.length > 0) {
        const extractKgPerUnit = (produk: string): number => {
          const match = (produk || "").match(/(\d+(?:[.,]\d+)?)\s*KG/i);
          if (match) return parseFloat(match[1].replace(",", "."));
          return 0;
        };

        const transferMoveMap: Record<string, { sku: string, pengirim: string, penerima: string, totalPcs: number, totalKg: number }> = {};
        (item.rtvs || []).forEach((rtv: any) => {
          const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
          const relatedInv = (item.invoices || []).find((inv: any) => inv.noInvoice === refInv);
          const unitProduksi = relatedInv?.siteArea || relatedInv?.unitProduksi || "-";
          const lokasi = typeof rtv === "object" ? (rtv.lokasiBarang || "-") : "-";
          const produk = typeof rtv === "object" ? (rtv.produk || "-") : "-";
          const pcs = typeof rtv === "object" ? (Number(rtv.qty) || Number(rtv.qtyReturn) || 0) : 0;
          const kgPerUnit = extractKgPerUnit(produk);
          const kg = pcs * kgPerUnit;
          
          if (pcs > 0) {
            const key = `${produk}_${unitProduksi}_${lokasi}`;
            if (!transferMoveMap[key]) {
              transferMoveMap[key] = { sku: produk, pengirim: unitProduksi, penerima: lokasi, totalPcs: 0, totalKg: 0 };
            }
            transferMoveMap[key].totalPcs += pcs;
            transferMoveMap[key].totalKg += kg;
          }
        });

        const tmValues = Object.values(transferMoveMap);
        if (tmValues.length > 0) {
          wsData.push(["REKAP TRANSFER MOVE"]);
          wsData.push(["#", "SKU", "Pengirim", "Penerima", "Kuantum (Kg)", "Kuantum (Pack)"]);
          
          let grandTotalKg = 0;
          let grandTotalPcs = 0;

          tmValues.forEach((tm, i) => {
            grandTotalKg += tm.totalKg;
            grandTotalPcs += tm.totalPcs;
            wsData.push([
              i + 1,
              tm.sku,
              tm.pengirim,
              tm.penerima,
              tm.totalKg,
              tm.totalPcs
            ]);
          });
          
          wsData.push(["", "", "", "Total", grandTotalKg, grandTotalPcs]);
          wsData.push([]);
        }
      }

      // --- Promos ---
      if (item.promos && item.promos.length > 0) {
        wsData.push([`DETAIL PROMO (${item.promos.length})`]);
        wsData.push(["#", "No. Promo", "Kegiatan", "Nominal"]);
        item.promos.forEach((p: any, i: number) => {
          wsData.push([
            i + 1,
            p.nomor || "-",
            p.kegiatan || "-",
            Number(p.total || 0)
          ]);
        });
        wsData.push(["", "TOTAL PROMO", "", Number(item.totalPromo || 0)]);
        wsData.push([]);
      }

      // --- Notes ---
      const notesArr: Array<{desc: string, nominal: number}> = Array.isArray(item.notes) && item.notes.length > 0
        ? item.notes
        : (item.notesDesc || item.notesNominal ? [{ desc: item.notesDesc || "", nominal: item.notesNominal || 0 }] : []);
      const totalNotesNominal = notesArr.reduce((s, n) => s + (Number(n.nominal) || 0), 0);

      if (notesArr.length > 0) {
        wsData.push([`DETAIL NOTES (${notesArr.length})`]);
        wsData.push(["#", "Keterangan", "Nominal"]);
        notesArr.forEach((n: any, i: number) => {
          wsData.push([
            i + 1,
            n.desc || "-",
            Number(n.nominal || 0)
          ]);
        });
        wsData.push(["", "TOTAL NOTES", totalNotesNominal]);
        wsData.push([]);
      }

      // --- Formula ---
      let formulaText = `Bank Statement (${Number(item.bankStatement || 0)}) = Invoice (${Number(item.totalInvoices || 0)}) - RTV (${Number(item.totalRtvs || 0)}) - Promo (${Number(item.totalPromo || 0)}) - Admin Fee (${Number(item.biayaAdmin || 0)})`;
      if (totalNotesNominal > 0) {
        notesArr.forEach((n: any) => {
          formulaText += ` - ${n.desc || "Notes"} (${Number(n.nominal || 0)})`;
        });
      }
      wsData.push(["FORMULA REKONSILIASI:"]);
      wsData.push([formulaText]);
      const calcResult = (item.totalInvoices || 0) - (item.totalRtvs || 0) - (item.totalPromo || 0) - (item.biayaAdmin || 0) - totalNotesNominal;
      wsData.push([`Kalkulasi: ${calcResult}`]);

      wsData.push([]);
      wsData.push([]);
      wsData.push(["======================================================================================================"]);
      wsData.push([]);
      wsData.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 8 },  // A - #
      { wch: 25 }, // B - No Rekon / SKU / Deskripsi
      { wch: 25 }, // C - Ritel / Pengirim / Unit Produksi
      { wch: 20 }, // D - BS / Penerima / Produk
      { wch: 15 }, // E - Invoice / Kg
      { wch: 15 }, // F - RTV / Pack
      { wch: 15 }, // G - Promo
      { wch: 15 }, // H - Admin
      { wch: 15 }, // I - Notes
      { wch: 15 }, // J - Net Due
      { wch: 15 }, // K - Tanggal
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Rekonsiliasi");

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
