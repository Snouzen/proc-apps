import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate Reconciliation Report PDF
 * Menampilkan ringkasan rekonsiliasi dengan breakdown Invoice & RTV per record.
 */
export const generateRekonPdf = (
  data: any[],
  filters: { startDate?: string; endDate?: string; search?: string },
  action: "download" | "preview" = "preview",
) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const formatRp = (num: number) =>
    num ? `Rp ${num.toLocaleString("id-ID")}` : "Rp 0";

  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${dt.getDate().toString().padStart(2, "0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const now = new Date();
  const printTime = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ═══════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════
  try {
    doc.addImage("/logo-bulog.png", "PNG", 14, 8, 30, 10, "logo", "FAST");
  } catch {}

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN REKONSILIASI PEMBAYARAN UB INDUSTRI", pageWidth / 2, 16, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  // Filter info line
  const filterParts: string[] = [];
  if (filters.startDate) filterParts.push(`Dari: ${formatDate(filters.startDate)}`);
  if (filters.endDate) filterParts.push(`Sampai: ${formatDate(filters.endDate)}`);
  if (filters.search) filterParts.push(`Pencarian: "${filters.search}"`);
  const filterText = filterParts.length > 0 ? filterParts.join(" | ") : "Semua Data";
  
  doc.text(`Filter: ${filterText}`, pageWidth / 2, 22, { align: "center" });
  
  const createdDate = data.length > 0 && data[0].createdAt ? formatDate(data[0].createdAt) : "-";
  doc.text(`Tgl Dibuat: ${createdDate}`, pageWidth / 2, 26, { align: "center" });
  // Horizontal separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, 29, pageWidth - 14, 29);

  // ═══════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ═══════════════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN REKONSILIASI", 14, 35);

  const notesHeader = "Notes";

  const summaryBody = data.map((item, idx) => [
    String(idx + 1),
    item.noRekonsiliasi || "-",
    item.RitelModern?.namaPt || "-",
    formatRp(item.bankStatement || 0),
    formatRp(item.totalInvoices || 0),
    formatRp(item.totalRtvs || 0),
    formatRp(item.totalPromo || 0),
    formatRp(item.biayaAdmin || 0),
    formatRp(item.notesNominal || 0),
    formatRp(item.nominal || 0),
    formatDate(item.tglBayar),
  ]);

  // Grand totals
  const grandBS = data.reduce((s, d) => s + (Number(d.bankStatement) || 0), 0);
  const grandInv = data.reduce((s, d) => s + (Number(d.totalInvoices) || 0), 0);
  const grandRtv = data.reduce((s, d) => s + (Number(d.totalRtvs) || 0), 0);
  const grandPromo = data.reduce((s, d) => s + (Number(d.totalPromo) || 0), 0);
  const grandAdmin = data.reduce((s, d) => s + (Number(d.biayaAdmin) || 0), 0);
  const grandNotes = data.reduce((s, d) => s + (Number(d.notesNominal) || 0), 0);
  const grandNet = data.reduce((s, d) => s + (Number(d.nominal) || 0), 0);

  summaryBody.push([
    "",
    "",
    "GRAND TOTAL",
    formatRp(grandBS),
    formatRp(grandInv),
    formatRp(grandRtv),
    formatRp(grandPromo),
    formatRp(grandAdmin),
    formatRp(grandNotes),
    formatRp(grandNet),
    "",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["#", "No. Rekon", "Ritel", "Bank Statement", "Invoice", "RTV", "Promo", "Admin Fee", notesHeader, "Net Due", "Tanggal"]],
    body: summaryBody,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: {
      fontStyle: "bold",
      fillColor: [15, 23, 42],   // slate-900
      textColor: [255, 255, 255],
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 20 },
      7: { halign: "right", cellWidth: 20 },
      8: { halign: "right", cellWidth: 22 },
      9: { halign: "right", cellWidth: 22, fontStyle: "bold" },
      10: { halign: "center", cellWidth: 18 },
    },
    didParseCell: (hookData: any) => {
      // Style grand total row
      if (hookData.row.index === summaryBody.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [241, 245, 249]; // slate-100
      }
    },
  });

  // ─── Signature Block (below-right of summary table) ───
  const summaryFinalY = (doc as any).lastAutoTable.finalY;
  const signStartY = summaryFinalY + 12;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  const col1X = 20;
  const col2X = 90;
  const col3X = 170;
  const col4X = 230;

  // Headers
  doc.text("Disetujui oleh,", 75, signStartY, { align: "center" });
  doc.text("Dibuat Oleh,", 215, signStartY, { align: "center" });

  // Names (Row 1)
  const nameStartY = signStartY + 30;
  
  // Disetujui oleh
  doc.text("Fiana Fega Sari", col1X, nameStartY);
  doc.text("Manager Keuangan dan Umum", col1X, nameStartY + 5);

  doc.text("Muhammad Fakri Firdaus", col2X, nameStartY);
  doc.text("Manager Bisnis", col2X, nameStartY + 5);

  // Dibuat Oleh
  doc.text("Izath Rytami", col3X, nameStartY);
  doc.text("Asman Penjualan", col3X, nameStartY + 5);

  doc.text("Rakha Arfiansyah", col4X, nameStartY);
  doc.text("Asman Akuntansi dan Umum", col4X, nameStartY + 5);

  // ═══════════════════════════════════════════════════════
  // DETAIL BREAKDOWN PER RECORD
  // ═══════════════════════════════════════════════════════
  data.forEach((item) => {
    doc.addPage();

    // Record Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`BREAKDOWN: ${item.noRekonsiliasi || "-"}`, 14, 16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Ritel: ${item.RitelModern?.namaPt || "-"}`, 14, 22);
    doc.text(`Tanggal Pembayaran: ${formatDate(item.tglBayar)}`, 14, 26);

    // Summary box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 29, pageWidth - 28, 18, 2, 2, "FD");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const summaryItems = [
      { label: "Bank Statement", value: formatRp(item.bankStatement || 0) },
      { label: "Total Invoice", value: formatRp(item.totalInvoices || 0) },
      { label: "Total RTV", value: formatRp(item.totalRtvs || 0) },
      { label: "Promo", value: formatRp(item.totalPromo || 0) },
      { label: "Admin Fee", value: `(${formatRp(item.biayaAdmin || 0)})` },
      { label: "NET DUE", value: formatRp(item.nominal || 0) },
    ];

    const boxWidth = (pageWidth - 28) / summaryItems.length;
    summaryItems.forEach((si, i) => {
      const x = 14 + boxWidth * i + boxWidth / 2;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(si.label.toUpperCase(), x, 35, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(si.value, x, 41, { align: "center" });
    });

    let nextY = 52;

    // ─── Bank Statement Detail Table ───
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text(`DETAIL BANK STATEMENT`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const bsBody = (item.bankStatements || []).map((bs: any, i: number) => [
      String(i + 1),
      bs.desc || "-",
      formatRp(bs.nominal || 0),
    ]);

    if (bsBody.length === 0) {
      bsBody.push(["-", "Total Keseluruhan", formatRp(item.bankStatement || 0)]);
    } else {
      bsBody.push([
        "",
        "TOTAL BANK STATEMENT",
        formatRp(item.bankStatement || 0),
      ]);
    }

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "Keterangan", "Nominal"]],
      body: bsBody,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fontStyle: "bold",
        fillColor: [245, 158, 11],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 100 },
        2: { halign: "right", cellWidth: 40 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === bsBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [254, 243, 199]; // amber-100
        }
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;

    // ─── Invoice Detail Table ───
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // blue-500
    doc.text(`DETAIL INVOICE (${item.invoices?.length || 0})`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const invBody = (item.invoices || []).map((inv: any, i: number) => [
      String(i + 1),
      inv.noInvoice || "-",
      inv.siteArea || inv.unitProduksi || "-",
      inv.produk || "-",
      formatRp(inv.nominal || 0),
    ]);

    if (invBody.length === 0) {
      invBody.push(["-", "Tidak ada invoice", "-", "-", "-"]);
    }

    // Invoice total row
    invBody.push([
      "",
      "TOTAL INVOICE",
      "",
      "",
      formatRp(item.totalInvoices || 0),
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "No. Invoice", "Unit Produksi", "Produk", "Nominal"]],
      body: invBody,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fontStyle: "bold",
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 55 },
        2: { cellWidth: 40 },
        3: { cellWidth: 50 },
        4: { halign: "right", cellWidth: 35 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === invBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [219, 234, 254]; // blue-100
        }
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;

    // ─── RTV Detail Table ───
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(244, 63, 94); // rose-500
    doc.text(`DETAIL RTV (${item.rtvs?.length || 0})`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const rtvBody = (item.rtvs || []).map((rtv: any, i: number) => {
      const rtvNo = typeof rtv === "string" ? rtv : rtv.noRtv;
      const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
      const nominal = typeof rtv === "object" ? rtv.nominal : 0;
      const lokasi = typeof rtv === "object" ? (rtv.lokasiBarang || "-") : "-";
      const produk = typeof rtv === "object" ? (rtv.produk || "-") : "-";
      const tujuan = typeof rtv === "object" ? (rtv.tujuan || "-") : "-";
      const rpKg = typeof rtv === "object" ? (rtv.rpKg || 0) : 0;
      const pcs = typeof rtv === "object" ? (rtv.qty || rtv.qtyReturn || 0) : 0;
      
      // Get Unit Produksi from the related invoice's siteArea (to match UI calc/page.tsx)
      const relatedInv = (item.invoices || []).find((inv: any) => inv.noInvoice === refInv);
      const unitProduksi = relatedInv?.siteArea || relatedInv?.unitProduksi || "-";
      
      return [String(i + 1), rtvNo || "-", String(pcs), refInv || "-", unitProduksi, lokasi, tujuan, produk, formatRp(rpKg), formatRp(nominal || 0)];
    });

    if (rtvBody.length === 0) {
      rtvBody.push(["-", "Tidak ada RTV", "-", "-", "-", "-", "-", "-", "-", "-"]);
    }

    rtvBody.push([
      "",
      "TOTAL RTV",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      formatRp(item.totalRtvs || 0),
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "No. RTV", "Pcs", "Ref. Invoice", "Unit Produksi", "Lokasi Barang", "Tujuan", "Produk", "Rp/Kg", "Nominal"]],
      body: rtvBody,
      theme: "striped",
      styles: { fontSize: 6.5, cellPadding: 1.8, overflow: "linebreak" },
      headStyles: {
        fontStyle: "bold",
        fillColor: [244, 63, 94],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 7 },
        1: { cellWidth: 30 },
        2: { halign: "center", cellWidth: 12 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 30 }, // Expanded width slightly to fill gap
        8: { halign: "right", cellWidth: 20 },
        9: { halign: "right", cellWidth: 25 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === rtvBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [254, 226, 226]; // rose-100
        }
      },
    });

    nextY = (doc as any).lastAutoTable.finalY + 10;

    // Cek halaman baru jika sisa ruang sedikit
    if (nextY > pageHeight - 40) {
      doc.addPage();
      nextY = 20;
    }

    // ─── Summary Net Tiap Invoice ───
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(139, 92, 246); // violet-500
    doc.text(`SUMMARY NET TIAP INVOICE`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    // Sort invoices by unitProduksi/siteArea
    const sortedInvoices = [...(item.invoices || [])].sort((a, b) => {
      const ua = (a.siteArea || a.unitProduksi || "").toLowerCase();
      const ub = (b.siteArea || b.unitProduksi || "").toLowerCase();
      return ua.localeCompare(ub);
    });

    let grandNominalInv = 0;
    let grandNominalRetur = 0;
    let grandNetTotal = 0;

    const netInvoiceBody: any[] = [];

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

      const rowSpan = Math.max(1, relatedRtvs.length);
      const spanStyles = { valign: 'middle' as const };

      const firstRow: any[] = [
        { content: String(i + 1), rowSpan, styles: { ...spanStyles, halign: 'center' } },
        { content: unitProduksi, rowSpan, styles: spanStyles },
        { content: noInvoice, rowSpan, styles: spanStyles },
        { content: formatRp(nominalInv), rowSpan, styles: { ...spanStyles, halign: 'right' } }
      ];

      if (relatedRtvs.length > 0) {
        firstRow.push(
          typeof relatedRtvs[0] === "string" ? relatedRtvs[0] : (relatedRtvs[0].noRtv || "-"),
          formatRp(relatedRtvs[0].nominal || 0)
        );
      } else {
        firstRow.push("-", "-");
      }

      firstRow.push(
        { content: formatRp(netNominal), rowSpan, styles: { ...spanStyles, halign: 'right' } }
      );

      netInvoiceBody.push(firstRow);

      for (let j = 1; j < relatedRtvs.length; j++) {
        const rtv = relatedRtvs[j];
        netInvoiceBody.push([
          typeof rtv === "string" ? rtv : (rtv.noRtv || "-"),
          formatRp(rtv.nominal || 0)
        ]);
      }
    });

    if (netInvoiceBody.length === 0) {
      netInvoiceBody.push(["-", "Tidak ada invoice", "-", "-", "-", "-", "-"]);
    } else {
      netInvoiceBody.push([
        "",
        "TOTAL KESELURUHAN",
        "",
        formatRp(grandNominalInv),
        "",
        formatRp(grandNominalRetur),
        formatRp(grandNetTotal),
      ]);
    }

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "Unit Produksi / Site Area", "No. Invoice", "Nominal Invoice", "No. Retur", "Nominal Retur", "Jumlah Total (Net)"]],
      body: netInvoiceBody,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: {
        fontStyle: "bold",
        fillColor: [139, 92, 246], // violet-500
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { halign: "right", cellWidth: 36 },
        4: { cellWidth: 53 },
        5: { halign: "right", cellWidth: 36 },
        6: { halign: "right", cellWidth: 36 },
      },
      didParseCell: (hookData: any) => {
        if (sortedInvoices.length > 0 && hookData.row.index === netInvoiceBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [237, 233, 254]; // violet-100
        }
      },
    });

    // ─── Rekap Transfer Move ───
    if (item.rtvs && item.rtvs.length > 0) {
      // Helper: extract weight (kg) per unit from product name, e.g. "BEFOOD SETRA 5 KG" → 5
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
        nextY = (doc as any).lastAutoTable.finalY + 10;
        
        // Cek halaman baru jika sisa ruang sedikit
        if (nextY > pageHeight - 40) {
          doc.addPage();
          nextY = 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138); // dark blue
        doc.text(`REKAP TRANSFER MOVE`, 14, nextY);
        doc.setTextColor(0, 0, 0);

        // Grand totals
        const grandTotalKg = tmValues.reduce((s, tm) => s + tm.totalKg, 0);
        const grandTotalPcs = tmValues.reduce((s, tm) => s + tm.totalPcs, 0);

        const tmBody: (string)[][] = tmValues.map((tm, i) => [
          String(i + 1),
          tm.sku,
          tm.pengirim,
          tm.penerima,
          tm.totalKg.toLocaleString("id-ID"),
          tm.totalPcs.toLocaleString("id-ID"),
        ]);

        // Grand total row
        tmBody.push([
          "",
          "",
          "",
          "Total",
          grandTotalKg.toLocaleString("id-ID"),
          grandTotalPcs.toLocaleString("id-ID"),
        ]);

        autoTable(doc, {
          startY: nextY + 3,
          head: [["#", "SKU", "Pengirim", "Penerima", "Kuantum (Kg)", "Kuantum (Pack)"]],
          body: tmBody,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fontStyle: "bold",
            fillColor: [30, 58, 138], // dark blue like screenshot
            textColor: [255, 255, 255],
            halign: "center",
          },
          columnStyles: {
            0: { halign: "center", cellWidth: 10 },
            1: { cellWidth: 70 },
            2: { cellWidth: 45 },
            3: { cellWidth: 45 },
            4: { halign: "right", cellWidth: 30 },
            5: { halign: "right", cellWidth: 30 },
          },
          didParseCell: (hookData: any) => {
            // Style grand total row
            if (hookData.row.index === tmBody.length - 1) {
              hookData.cell.styles.fontStyle = "bold";
              hookData.cell.styles.fillColor = [219, 234, 254]; // blue-100
            }
          },
        });
      }
    }

    // ─── Promo Detail Table (only if promos exist) ───
    if (item.promos && item.promos.length > 0) {
      nextY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`DETAIL PROMO (${item.promos.length})`, 14, nextY);
      doc.setTextColor(0, 0, 0);

      const promoBody = item.promos.map((p: any, i: number) => [
        String(i + 1),
        p.nomor || "-",
        p.kegiatan || "-",
        formatRp(p.total || 0),
      ]);
      promoBody.push(["", "TOTAL PROMO", "", formatRp(item.totalPromo || 0)]);

      autoTable(doc, {
        startY: nextY + 3,
        head: [["#", "No. Promo", "Kegiatan", "Nominal"]],
        body: promoBody,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fontStyle: "bold",
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 70 },
          2: { cellWidth: 50 },
          3: { halign: "right", cellWidth: 40 },
        },
        didParseCell: (hookData: any) => {
          if (hookData.row.index === promoBody.length - 1) {
            hookData.cell.styles.fontStyle = "bold";
            hookData.cell.styles.fillColor = [209, 250, 229]; // emerald-100
          }
        },
      });
    }

    // ─── Notes Detail Table (only if notes exist) ───
    const notesArr: Array<{desc: string, nominal: number}> = Array.isArray(item.notes) && item.notes.length > 0
      ? item.notes
      : (item.notesDesc || item.notesNominal ? [{ desc: item.notesDesc || "", nominal: item.notesNominal || 0 }] : []);
    const totalNotesNominal = notesArr.reduce((s, n) => s + (Number(n.nominal) || 0), 0);

    if (notesArr.length > 0) {
      nextY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246); // blue-500
      doc.text(`DETAIL NOTES (${notesArr.length})`, 14, nextY);
      doc.setTextColor(0, 0, 0);

      const notesBody = notesArr.map((n: any, i: number) => [
        String(i + 1),
        n.desc || "-",
        formatRp(n.nominal || 0),
      ]);
      notesBody.push(["", "TOTAL NOTES", formatRp(totalNotesNominal)]);

      autoTable(doc, {
        startY: nextY + 3,
        head: [["#", "Keterangan", "Nominal"]],
        body: notesBody,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fontStyle: "bold",
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 120 },
          2: { halign: "right", cellWidth: 40 },
        },
        didParseCell: (hookData: any) => {
          if (hookData.row.index === notesBody.length - 1) {
            hookData.cell.styles.fontStyle = "bold";
            hookData.cell.styles.fillColor = [219, 234, 254]; // blue-100
          }
        },
      });
    }

    // Calculation Formula at bottom of page
    const calcY = (doc as any).lastAutoTable.finalY + 12;

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, calcY, pageWidth - 28, 28, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FORMULA REKONSILIASI:", 18, calcY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let formulaText = `Bank Statement (${formatRp(item.bankStatement || 0)}) = Invoice (${formatRp(item.totalInvoices || 0)}) - RTV (${formatRp(item.totalRtvs || 0)}) - Promo (${formatRp(item.totalPromo || 0)}) - Admin Fee (${formatRp(item.biayaAdmin || 0)})`;
    if (totalNotesNominal > 0) {
      notesArr.forEach((n: any) => {
        formulaText += ` - ${n.desc || "Notes"} (${formatRp(n.nominal || 0)})`;
      });
    }
    
    doc.text(formulaText, 18, calcY + 12);

    const calcResult = (item.totalInvoices || 0) - (item.totalRtvs || 0) - (item.totalPromo || 0) - (item.biayaAdmin || 0) - totalNotesNominal;

    doc.setFont("helvetica", "bold");
    doc.text(`Kalkulasi: ${formatRp(calcResult)}`, 18, calcY + 18);
  });

  // ─── Footer on all pages ───
  const totalPages = typeof (doc as any).internal !== "undefined" ? (doc as any).internal.getNumberOfPages() : (doc as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Dicetak: ${printTime}`, 14, pageHeight - 8);
    doc.text(`Halaman ${i} / ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: "right" });
    doc.text("Sistem Rekonsiliasi Procurement — Dokumen ini di-generate otomatis", 14, pageHeight - 5);
    doc.setTextColor(0, 0, 0);
  }

  // Output
  if (action === "preview") {
    return doc.output("bloburl");
  } else {
    const fileName = `Rekon_Report_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}.pdf`;
    doc.save(fileName);
  }
};
