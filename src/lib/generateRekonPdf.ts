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
  doc.text("LAPORAN REKONSILIASI PEMBAYARAN", pageWidth / 2, 16, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  // Filter info line
  const filterParts: string[] = [];
  if (filters.startDate) filterParts.push(`Dari: ${formatDate(filters.startDate)}`);
  if (filters.endDate) filterParts.push(`Sampai: ${formatDate(filters.endDate)}`);
  if (filters.search) filterParts.push(`Pencarian: "${filters.search}"`);
  const filterText = filterParts.length > 0 ? filterParts.join(" | ") : "Semua Data";
  
  doc.text(`Filter: ${filterText}`, pageWidth / 2, 22, { align: "center" });
  doc.text(`Dicetak: ${printTime}`, pageWidth / 2, 26, { align: "center" });

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

  const summaryBody = data.map((item, idx) => [
    String(idx + 1),
    item.noRekonsiliasi || "-",
    item.RitelModern?.namaPt || "-",
    formatRp(item.bankStatement || 0),
    formatRp(item.totalInvoices || 0),
    formatRp(item.totalRtvs || 0),
    formatRp(item.totalPromo || 0),
    formatRp(item.biayaAdmin || 0),
    formatRp(item.nominal || 0),
    formatDate(item.createdAt),
  ]);

  // Grand totals
  const grandBS = data.reduce((s, d) => s + (Number(d.bankStatement) || 0), 0);
  const grandInv = data.reduce((s, d) => s + (Number(d.totalInvoices) || 0), 0);
  const grandRtv = data.reduce((s, d) => s + (Number(d.totalRtvs) || 0), 0);
  const grandPromo = data.reduce((s, d) => s + (Number(d.totalPromo) || 0), 0);
  const grandAdmin = data.reduce((s, d) => s + (Number(d.biayaAdmin) || 0), 0);
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
    formatRp(grandNet),
    "",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["#", "No. Rekon", "Ritel", "Bank Statement", "Invoice", "RTV", "Promo", "Admin Fee", "Net Due", "Tanggal"]],
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
      1: { cellWidth: 28 },
      2: { cellWidth: 40 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 24 },
      8: { halign: "right", cellWidth: 28, fontStyle: "bold" },
      9: { halign: "center", cellWidth: 22 },
    },
    didParseCell: (hookData: any) => {
      // Style grand total row
      if (hookData.row.index === summaryBody.length - 1) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [241, 245, 249]; // slate-100
      }
    },
  });

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
    doc.text(`Tanggal: ${formatDate(item.createdAt)}`, 14, 26);

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

    // ─── Invoice Detail Table ───
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // blue-500
    doc.text(`DETAIL INVOICE (${item.invoices?.length || 0})`, 14, nextY);
    doc.setTextColor(0, 0, 0);

    const invBody = (item.invoices || []).map((inv: any, i: number) => [
      String(i + 1),
      inv.noInvoice || "-",
      formatRp(inv.nominal || 0),
    ]);

    if (invBody.length === 0) {
      invBody.push(["-", "Tidak ada invoice", "-"]);
    }

    // Invoice total row
    invBody.push([
      "",
      "TOTAL INVOICE",
      formatRp(item.totalInvoices || 0),
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "No. Invoice", "Nominal"]],
      body: invBody,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fontStyle: "bold",
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 80 },
        2: { halign: "right", cellWidth: 40 },
      },
      tableWidth: 140,
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
      return [String(i + 1), rtvNo || "-", refInv || "-", formatRp(nominal || 0)];
    });

    if (rtvBody.length === 0) {
      rtvBody.push(["-", "Tidak ada RTV", "-", "-"]);
    }

    rtvBody.push([
      "",
      "TOTAL RTV",
      "",
      formatRp(item.totalRtvs || 0),
    ]);

    autoTable(doc, {
      startY: nextY + 3,
      head: [["#", "No. RTV", "Ref. Invoice", "Nominal"]],
      body: rtvBody,
      theme: "striped",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fontStyle: "bold",
        fillColor: [244, 63, 94],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 60 },
        3: { halign: "right", cellWidth: 40 },
      },
      tableWidth: 170,
      didParseCell: (hookData: any) => {
        if (hookData.row.index === rtvBody.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fillColor = [254, 226, 226]; // rose-100
        }
      },
    });

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
    doc.text(
      `Bank Statement (${formatRp(item.bankStatement || 0)}) = Invoice (${formatRp(item.totalInvoices || 0)}) - RTV (${formatRp(item.totalRtvs || 0)}) - Promo (${formatRp(item.totalPromo || 0)}) - Admin Fee (${formatRp(item.biayaAdmin || 0)})`,
      18, calcY + 12,
    );

    const calcResult = (item.totalInvoices || 0) - (item.totalRtvs || 0) - (item.totalPromo || 0) - (item.biayaAdmin || 0);
    const diff = (item.bankStatement || 0) - calcResult;

    doc.setFont("helvetica", "bold");
    doc.text(`Kalkulasi: ${formatRp(calcResult)}`, 18, calcY + 18);
    doc.text(`Selisih: ${formatRp(diff)}`, 18, calcY + 23);

    if (Math.abs(diff) > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text("[!] SELISIH TERDETEKSI", 100, calcY + 23);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setTextColor(22, 163, 74);
      doc.text("[OK] BALANCE", 100, calcY + 23);
      doc.setTextColor(0, 0, 0);
    }
  });

  // ─── Footer on all pages ───
  const totalPages = typeof (doc as any).internal !== "undefined" ? (doc as any).internal.getNumberOfPages() : (doc as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
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
