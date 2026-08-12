import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NdFormData } from "./generateNdWord";

export const generateNdPdf = (formData: NdFormData, pos?: any[], showApprovalTable: boolean = true) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm
  const fontSize = 10;
  const lineHeight = 4.5; // mm per line at fontSize 10

  // Helpers
  const formatRp = (num: number) => num ? num.toLocaleString("id-ID") : "0";

  const cleanSiteArea = (str: string) => {
    if (!str) return "-";
    return str
      .replace(/KANTOR CABANG/i, "KC")
      .replace(/KANTOR WILAYAH/i, "KANWIL")
      .replace(/SUB CABANG/i, "KCP");
  };

  /**
   * Writes wrapped text at (x, yPos) constrained to `width`.
   * Uses maxWidth for proper line wrapping without text overflow.
   * Returns the total height consumed.
   */
  const writeText = (text: string, x: number, yPos: number, width: number): number => {
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, yPos);
    return lines.length * lineHeight;
  };

  /**
   * Check if we need a page break. If so, add page and reset y.
   */
  const checkPageBreak = (currentY: number, requiredSpace: number): number => {
    if (currentY + requiredSpace > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return currentY;
  };

  // ── TITLE ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NOTA DINAS", pageWidth / 2, margin, { align: "center", charSpace: 2 });

  let y = margin + 10;
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");

  // ── HEADER BLOCK (centered on page, like preview paddingLeft 28%) ──
  const headerOffset = pageWidth * 0.28; // ~59mm from left edge
  const labelX = headerOffset;
  const colonX = headerOffset + 28;
  const valueX = headerOffset + 33;
  const valueWidth = pageWidth - valueX - margin;

  const headLines = [
    { label: "Nomor", val: formData.nomor_surat || "[Nomor Surat]", highlight: true },
    { label: "Kepada Yth", val: "Direktur Pemasaran", highlight: false },
    { label: "Dari", val: "GM UB Industri", highlight: false },
    { label: "Perihal", val: formData.det_perihal || "[Perihal]", highlight: true },
  ];

  headLines.forEach((hl) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(hl.label, labelX, y);
    doc.text(":", colonX, y);

    if (hl.highlight) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
    }

    const lines = doc.splitTextToSize(hl.val, valueWidth);
    doc.text(lines, valueX, y);
    y += lines.length * (lineHeight + 0.5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  });

  y += 2;
  // Double line separator
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
  y += 6;

  // ── BODY ───────────────────────────────────────────────────────
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");

  // Intro paragraph
  const intro = `Sehubungan dengan adanya transaksi penjualan Tunda Bayar dengan Ritel Modern di UB Industri, bersama ini kami sampaikan hal-hal sebagai berikut:`;
  y += writeText(intro, margin, y, contentWidth);
  y += 3;

  // Indentation levels
  const indent1 = margin + 7;    // after "1. "
  const width1 = pageWidth - indent1 - margin;
  const indent2 = indent1 + 5;   // sub-items "-"
  const width2 = pageWidth - indent2 - margin;
  const indent3 = indent2 + 5;   // sub-sub-items "a."
  const width3 = pageWidth - indent3 - margin;

  // ── Item 1 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 25);
  doc.text("1.", margin, y);
  const item1 = `Seluruh transaksi penjualan dengan Ritel Modern sebagaimana business as usual di lingkungan tersebut, dilakukan menggunakan mekanisme Tunda Bayar dengan Term of Payment (TOP) maksimal 30 hari kalender atau lebih lanjut diatur dalam PJB, dimana hal tersebut juga berlaku bagi Perusahaan lain yang menjadi supplier Ritel Modern.`;
  y += writeText(item1, indent1, y, width1);
  y += 3;

  // ── Item 2 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 25);
  doc.text("2.", margin, y);
  const item2 = `Sebagaimana Peraturan Direksi (PD) nomor PD-13/DB100/03/2025 tanggal 7 Maret 2025 tentang Penjualan Komoditas Komersial tertuang bahwa:`;
  y += writeText(item2, indent1, y, width1);
  y += 2;

  // Sub-item: Pasal 11 ayat (1)
  y = checkPageBreak(y, 20);
  doc.text("-", indent1, y);
  const item2a = `Pasal 11 ayat (1) : Tunda Bayar dapat diberikan kepada saluran penjualan Distributor yang dilakukan secara kontrak terpusat, Unit Bisnis Perusahaan, Mitra Penjualan Ekspor, jaringan ritel, dan Penjualan Langsung selain Pasar Rakyat dan perorangan.`;
  y += writeText(item2a, indent2, y, width2);
  y += 2;

  // Sub-item: Pasal 11 ayat (14)
  y = checkPageBreak(y, 20);
  doc.text("-", indent1, y);
  const item2b = `Pasal 11 ayat (14) : Perusahaan dapat melayani transaksi penjualan kepada pembeli yang masih memiliki tunggakan pembayaran (hutang penjualan) dengan persetujuan Kantor Pusat dengan ketentuan sebagai berikut:`;
  y += writeText(item2b, indent2, y, width2);
  y += 2;

  // a.
  y = checkPageBreak(y, 15);
  doc.text("a.", indent2, y);
  const item2b1 = `Merupakan transaksi kontrak terpusat dimana pelayanan penjualannya dilakukan di Kanwil/Kanca;`;
  y += writeText(item2b1, indent3, y, width3);
  y += 2;

  // b.
  y = checkPageBreak(y, 20);
  doc.text("b.", indent2, y);
  const item2b2 = `Transaksi dengan saluran penjualan ritel modern/horeka, Kementerian, Lembaga, BUMN/BUMD, Satuan kerja perangkat daerah/instansi lainnya, Unit Bisnis Perusahaan dan Mitra Penjualan Ekspor yang memiliki ketentuan term of payment (TOP) dan diatur dalam PJB/Kontrak/trading term.`;
  y += writeText(item2b2, indent3, y, width3);
  y += 3;

  // ── Item 3 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 20);
  doc.text("3.", margin, y);
  const item3 = `Per tanggal ${formData.tgl_input || "[tgl_input]"} realisasi penjualan UB Industri sebesar ${formData.nominal_teks_1 || "[nominal_teks_1]"}, kontribusi penjualan Ritel Modern sebesar ${formData.nominal_teks || "[nominal_teks]"} ${formData.percentage || "[percentage]"} atau setara ${formData.qty || "[qty]"} Ton Beras Premium.`;
  y += writeText(item3, indent1, y, width1);
  y += 3;

  // ── Item 4 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 25);
  doc.text("4.", margin, y);
  const item4 = `Posisi Piutang ke eksternal (non Perum BULOG) per tanggal ${formData.tgl_input || "[tgl_input]"} adalah sebesar ${formData.nominal_teks_2 || "[nominal_teks_2]"}, jumlah piutang kurang dari 30 Hari sebesar ${formData.nominal_teks_3 || "[nominal_teks_3]"} dan jumlah piutang lebih dari 30 Hari sebesar ${formData.nominal_teks_4 || "[nominal_teks_4]"}. Terdapat pembayaran yang belum dilakukan bank reconcile sebesar ${formData.nominal_teks_5 || "[nominal_teks_5]"}, maka saldo piutang bersih adalah sebesar ${formData.nominal_teks_6 || "[nominal_teks_6]"}. Rincian piutang sebagai berikut (dalam jutaan rupiah):`;
  y += writeText(item4, indent1, y, width1);
  y += 3;

  // ── PIUTANG TABLE ──────────────────────────────────────────────
  y = checkPageBreak(y, 30);

  const piutangBody = formData.list_piutang.map(row => [
    row.tgl_input || "-",
    row.tbl_1_30 || "-",
    row.tbl_2_30 || "-",
    row.total || "-",
    row.tbl_cash_in || "-",
    row.tbl_net_piutang || "-",
    row.tbl_sales || "-",
    row.tbl_ars || "0%"
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: indent1, right: margin },
    head: [
      [
        { content: "TANGGAL", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "AGED RECEIVABLE EKSTERN", colSpan: 3, styles: { halign: "center" } },
        { content: "CASH IN (Rp)", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "NET PIUTANG (INC UNRECONCILE)", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "Sales", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
        { content: "%AR vs\nSALES", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
      ],
      [
        { content: "1-30 HARI\n(Rp)", styles: { halign: "center" } },
        { content: ">30 Hari\n(Rp)", styles: { halign: "center" } },
        { content: "Total\n(Rp)", styles: { halign: "center" } },
      ],
    ],
    body: piutangBody,
    theme: "grid",
    styles: { fontSize: 6.5, textColor: 20, cellPadding: 1.5 },
    headStyles: {
      fillColor: [218, 238, 243],
      textColor: 20,
      lineWidth: 0.15,
      lineColor: 20,
      fontStyle: "bold",
      fontSize: 6,
    },
    bodyStyles: { lineWidth: 0.15, lineColor: 20, halign: "center" },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Continuation paragraph under item 4
  y = checkPageBreak(y, 20);
  const item4cont = `Kondisi Piutang lebih dari 30 Hari dikarenakan beberapa hal yaitu adanya proses rekonsiliasi uang masuk, adanya kekurangan kelengkapan dokumen seperti Faktur Pajak (sentralisasi Kantor Pusat), Manajemen Retur, Invoice, Surat Jalan dan Kwitansi sehingga mengakibatkan keterlambatan penagihan.`;
  y += writeText(item4cont, indent1, y, width1);
  y += 3;

  // ── Item 5 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 15);
  doc.text("5.", margin, y);
  const item5 = `Adapun proses penagihan dan koordinasi terus dilakukan agar proses pembayaran segera terealisasi.`;
  y += writeText(item5, indent1, y, width1);
  y += 3;

  // ── Item 6 ─────────────────────────────────────────────────────
  y = checkPageBreak(y, 15);
  doc.text("6.", margin, y);
  const item6 = `Melanjutkan Purchase Order dari Ritel Modern, terdapat pesanan yang memerlukan persetujuan pembukaan Credit Limit pada ERP BULOG diantaranya:`;
  y += writeText(item6, indent1, y, width1);
  y += 3;

  // ── PO TABLE (Grouped) ────────────────────────────────────────
  if (pos && pos.length > 0) {
    y = checkPageBreak(y, 30);

    const groupedPos = pos.reduce((acc: any, po: any) => {
      const siteArea = cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea || "-");
      if (!acc[siteArea]) acc[siteArea] = [];
      acc[siteArea].push(po);
      return acc;
    }, {});

    const poBody: any[] = [];
    let groupIndex = 1;

    for (const [site, items] of Object.entries(groupedPos)) {
      const itms = items as any[];
      const subtotal = itms.reduce(
        (sum: number, po: any) => sum + Number(po.totalNominal || po.nominal || 0),
        0
      );

      itms.forEach((po: any, idx: number) => {
        const row: any[] = [];
        if (idx === 0) {
          row.push({
            content: String(groupIndex++),
            rowSpan: itms.length,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" },
          });
          row.push({
            content: site.toUpperCase(),
            rowSpan: itms.length,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" },
          });
        }
        row.push({ content: po.kodeVendor || "-", styles: { halign: "center" } });
        row.push(po.RitelModern?.inisial || "-");
        row.push({ content: po.noPo, styles: { halign: "center" } });
        row.push({
          content: formatRp(Number(po.totalNominal || po.nominal || 0)),
          styles: { halign: "right" },
        });
        poBody.push(row);
      });

      // Subtotal row
      poBody.push([
        {
          content: "SUBTOTAL",
          colSpan: 5,
          styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245] },
        },
        {
          content: formatRp(subtotal),
          styles: { halign: "right", fontStyle: "bold", fillColor: [245, 245, 245] },
        },
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: indent1, right: margin },
      head: [["No.", "Infrastruktur", "Id Pelanggan", "Nama Pelanggan", "No PO", "Nilai (Rp)"]],
      body: poBody,
      theme: "grid",
      styles: { fontSize: 7, textColor: 20, cellPadding: 1.5 },
      headStyles: {
        fillColor: [218, 238, 243],
        textColor: 20,
        lineWidth: 0.15,
        lineColor: 20,
        halign: "center",
        fontStyle: "bold",
      },
      bodyStyles: { lineWidth: 0.15, lineColor: 20 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("[Data Batch Credit Limit - akan diintegrasikan]", indent1, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    y += 8;
  }

  // ── CLOSING ────────────────────────────────────────────────────
  y = checkPageBreak(y, 30);

  const closing1 = `Sehubungan dengan hal tersebut di atas, kami mohon persetujuan Bapak untuk pembukaan credit limit PO tersebut pada ERP BULOG.`;
  y += writeText(closing1, margin, y, contentWidth);
  y += 3;

  const closing2 = `Demikian disampaikan, atas persetujuan Bapak kami ucapkan terima kasih.`;
  y += writeText(closing2, margin, y, contentWidth);
  y += 15;

  // ── SIGNATURES (conditional layout) ─────────────
  y = checkPageBreak(y, 65);

  const now = new Date();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const sigStartY = y;

  if (showApprovalTable) {
    // Left side: Approval table (Jabatan | Nama | Paraf) — compact vertical
    autoTable(doc, {
      startY: sigStartY,
      margin: { left: margin },
      tableWidth: 100,
      head: [
        [
          { content: "Jabatan", styles: { halign: "left" } },
          { content: "Nama", styles: { halign: "left" } },
          { content: "Paraf", styles: { halign: "center" } },
        ],
      ],
      body: [
        ["Manager Bisnis", "Muhammad Fakri Firdaus", ""],
        ["Manager Keuangan & Umum", "Fiana Fega Sari", ""],
        ["Asman Akuntansi & Umum", "Rakha Afriansyah Putra", ""],
        ["Asman Adm & Keuangan", "Pepy Suhartini", ""],
        ["Asman Pemasaran", "Gisheila Miftanisa", ""],
        ["Asman Penjualan", "Izath Rytami", ""],
      ],
      theme: "grid",
      styles: { fontSize: 7, textColor: 20, cellPadding: 1.5 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: 20,
        lineWidth: 0.15,
        lineColor: 20,
        fontStyle: "bold",
      },
      bodyStyles: { lineWidth: 0.15, lineColor: 20 },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 40 },
        2: { cellWidth: 18 },
      },
    });

    // Right side: GM signature block (at same Y level as table)
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const sigRightCenter = margin + 100 + ((pageWidth - margin - (margin + 100)) / 2); // center of right area
    doc.text(`Jakarta,       ${monthNames[now.getMonth()]} ${now.getFullYear()}`, sigRightCenter, sigStartY, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("FRIMA AGUNG NITIPRAJA", sigRightCenter, sigStartY + 25, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("GM UB Industri", sigRightCenter, sigStartY + 30, { align: "center" });

    y = Math.max((doc as any).lastAutoTable.finalY + 10, sigStartY + 40);
  } else {
    // Only GM signature, right-aligned
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const sigRightEdge = pageWidth - margin;
    doc.text(`Jakarta,       ${monthNames[now.getMonth()]} ${now.getFullYear()}`, sigRightEdge, sigStartY, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("FRIMA AGUNG NITIPRAJA", sigRightEdge, sigStartY + 25, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text("GM UB Industri", sigRightEdge, sigStartY + 30, { align: "right" });

    y = sigStartY + 40;
  }

  // Tembusan
  y = checkPageBreak(y, 25);
  doc.setFontSize(8);
  doc.text("Tembusan Yth:", margin, y);
  doc.text("1. Ka SPI Wilayah Kapsus", margin + 5, y + 5);
  doc.text("2. Kadiv Penjualan Pasar Umum", margin + 5, y + 10);
  doc.text("3. Kadiv TI", margin + 5, y + 15);

  const dateStr = `${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}`;
  doc.save(`ND Pengajuan Credit Limit ${dateStr}.pdf`);
};
