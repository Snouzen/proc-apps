import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NdFormData } from "./generateNdWord";

export const generateNdPdf = (formData: NdFormData, pos?: any[]) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Helpers
  const formatRp = (num: number) => num ? num.toLocaleString("id-ID") : "0";

  const cleanSiteArea = (str: string) => {
    if (!str) return "-";
    return str
      .replace(/KANTOR CABANG/i, "KC")
      .replace(/KANTOR WILAYAH/i, "KANWIL")
      .replace(/SUB CABANG/i, "KCP");
  };

  // TITLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("NOTA DINAS", pageWidth / 2, margin, { align: "center", charSpace: 2 });

  let y = margin + 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // HEADER BLOCK
  const headLines = [
    { label: "Nomor", val: formData.nomor_surat || "" },
    { label: "Kepada Yth", val: "Direktur Pemasaran" },
    { label: "Dari", val: "GM UB Industri" },
    { label: "Perihal", val: formData.det_perihal || "" },
  ];

  headLines.forEach((hl) => {
    doc.text(hl.label, margin, y);
    doc.text(":", margin + 30, y);
    
    // Perihal might be long, handle wrapping
    const textLines = doc.splitTextToSize(hl.val, pageWidth - margin - 35 - margin);
    
    // Make bold for dynamic fields
    if (hl.label === "Nomor" || hl.label === "Perihal") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 200); // Blueish
    } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
    }
    
    doc.text(textLines, margin + 35, y);
    y += 6 * textLines.length;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  });

  y += 3;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const writeText = (text: string, x: number, yPos: number, width: number) => {
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, x, yPos, { align: "justify" });
    return lines.length * 5.5; // return height taken
  };

  // FIRST PARAGRAPH
  const p1 = `Menunjuk Nota Dinas GM UB Industri Nomor : /UBIND/05/2026 Tanggal ${formData.tgl_input} perihal permohonan pembukaan credit limit pada ERP Bulog atas Purchase Order yang diterbitkan oleh Ritel Modern.`;
  y += writeText(p1, margin, y, pageWidth - margin * 2);

  // SECOND PARAGRAPH
  const p2 = `Sehubungan dengan hal tersebut di atas, bersama ini kami sampaikan hal - hal sebagai berikut :`;
  y += writeText(p2, margin, y, pageWidth - margin * 2);
  y += 2;

  // NUMBERED LIST
  const numListMargin = margin + 6;
  const numListTextWidth = pageWidth - numListMargin - margin;

  const listItem1 = `Menyampaikan permohonan maaf atas keterlambatan permohonan pembukaan credit limit atas Purchase Order Ritel Modern pada ERP BULOG yang disebabkan sistem ERP BULOG telah di open clossing per tanggal 29 Mei 2026 dan baru kembali beroperasi secara normal tanggal 4 Juni 2026, sehingga baru dapat diajukan proses pembukaan credit limit nya saat ini.`;
  
  const listItem2 = `Posisi Piutang Ritel Modern per tanggal ${formData.tgl_input} tercatat total piutang sebesar ${formData.nominal_teks_1 || "[nominal_teks_1]"} atau sejumlah Rp. ${formData.nominal_teks || "[nominal_teks]"} atau sebesar ${formData.percentage || "0"}% dari rata-rata penjualan senilai Rp. ${formData.qty || "[qty]"}, dengan rincian sebagai berikut:`;

  doc.text("1.", margin, y);
  y += writeText(listItem1, numListMargin, y, numListTextWidth);
  y += 2;

  doc.text("2.", margin, y);
  y += writeText(listItem2, numListMargin, y, numListTextWidth);
  y += 2;

  // PIUTANG TABLE
  const piutangBody = formData.list_piutang.map(row => [
    row.tgl_input,
    formatRp(Number(row.tbl_1_30) || 0),
    formatRp(Number(row.tbl_2_30) || 0),
    formatRp(Number(row.total) || 0),
    formatRp(Number(row.tbl_cash_in) || 0),
    formatRp(Number(row.tbl_net_piutang) || 0),
    formatRp(Number(row.tbl_sales) || 0),
    row.tbl_ars || "0%"
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: numListMargin, right: margin },
    head: [
      [
        { content: "TANGGAL", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "AGED RECEIVABLE EKSTERN", colSpan: 3, styles: { halign: 'center' } },
        { content: "CASH IN (Rp)", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "NET PIUTANG (INC UNRECONCILE)", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "Sales", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: "%AR vs SALES", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
      ],
      [
        { content: "1 - 30 HARI (Rp)", styles: { halign: 'center' } },
        { content: ">30 Hari (Rp)", styles: { halign: 'center' } },
        { content: "Total (Rp)", styles: { halign: 'center' } }
      ]
    ],
    body: piutangBody,
    theme: "grid",
    styles: { fontSize: 7, textColor: 20 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, lineWidth: 0.1, lineColor: 20 },
    bodyStyles: { lineWidth: 0.1, lineColor: 20 }
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  const listItem3 = `Dari total piutang sebesar ${formData.nominal_teks_1 || "[nominal_teks_1]"} tersebut, sejumlah ${formData.nominal_teks_2 || "[nominal_teks_2]"} atau Rp. ${formData.nominal_teks_3 || "[nominal_teks_3]"} merupakan piutang belum jatuh tempo dan sejumlah ${formData.nominal_teks_4 || "[nominal_teks_4]"} atau Rp. ${formData.nominal_teks_5 || "[nominal_teks_5]"} merupakan piutang di atas 30 hari.`;
  doc.text("3.", margin, y);
  y += writeText(listItem3, numListMargin, y, numListTextWidth);
  y += 2;

  const listItem4 = `Kondisi Piutang lebih dari 30 Hari dikarenakan beberapa hal yaitu adanya proses rekonsiliasi uang masuk, adanya kekurangan kelengkapan dokumen seperti Faktur Pajak (sentralisasi Kantor Pusat), Manajemen Retur, Invoice, Surat Jalan dan Kwitansi sehingga mengakibatkan keterlambatan penagihan.`;
  doc.text("4.", margin, y);
  y += writeText(listItem4, numListMargin, y, numListTextWidth);
  y += 2;

  const listItem5 = `Adapun proses penagihan dan koordinasi terus dilakukan agar proses pembayaran segera terealisasi.`;
  doc.text("5.", margin, y);
  y += writeText(listItem5, numListMargin, y, numListTextWidth);
  y += 2;

  const listItem6 = `Melanjutkan Purchase Order dari Ritel Modern, terdapat pesanan yang memerlukan persetujuan pembukaan Credit Limit pada ERP BULOG diantaranya:`;
  doc.text("6.", margin, y);
  y += writeText(listItem6, numListMargin, y, numListTextWidth);
  y += 2;

  // PO TABLE (Grouped)
  if (pos && pos.length > 0) {
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
      const subtotal = itms.reduce((sum: number, po: any) => sum + Number(po.totalNominal || po.nominal || 0), 0);

      itms.forEach((po: any, idx: number) => {
        const row = [];
        if (idx === 0) {
          row.push({ content: String(groupIndex++), rowSpan: itms.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } });
          row.push({ content: site.toUpperCase(), rowSpan: itms.length, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } });
        }
        row.push({ content: po.kodeVendor || "-", styles: { halign: 'center' } });
        row.push(po.RitelModern?.inisial || "-");
        row.push({ content: po.noPo, styles: { halign: 'center' } });
        row.push({ content: formatRp(Number(po.totalNominal || po.nominal || 0)), styles: { halign: 'right' } });
        poBody.push(row);
      });

      // Subtotal row
      poBody.push([
        { content: "SUBTOTAL", colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fillColor: [248, 249, 250] } },
        { content: formatRp(subtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 249, 250] } }
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: numListMargin, right: margin },
      head: [
        ["No.", "Infrastruktur", "Id Pelanggan", "Nama Pelanggan", "No PO", "Nilai (Rp)"]
      ],
      body: poBody,
      theme: "grid",
      styles: { fontSize: 7, textColor: 20 },
      headStyles: { fillColor: [218, 238, 243], textColor: 20, lineWidth: 0.1, lineColor: 20, halign: 'center' },
      bodyStyles: { lineWidth: 0.1, lineColor: 20 }
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("[Data Batch Credit Limit - akan diintegrasikan]", numListMargin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    y += 8;
  }

  // CLOSING PARAGRAPHS
  const closing1 = `Sehubungan dengan hal tersebut di atas, kami mohon persetujuan Bapak untuk pembukaan credit limit PO tersebut pada ERP BULOG.`;
  y += writeText(closing1, margin, y, pageWidth - margin * 2);
  y += 2;

  const closing2 = `Demikian disampaikan, atas persetujuan Bapak kami ucapkan terima kasih.`;
  y += writeText(closing2, margin, y, pageWidth - margin * 2);
  y += 15;

  // SIGNATURES
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  // Signatures on the right
  const sigX = pageWidth - margin - 40;
  doc.text("Jakarta,       Juni 2026", sigX, y, { align: "center" });
  
  y += 25;
  doc.setFont("helvetica", "bold");
  doc.text("FRIMA AGUNG NITIPRAJA", sigX, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("GM UB Industri", sigX, y + 5, { align: "center" });

  // Signatures Grid (Approvals)
  const appY = y - 25;
  autoTable(doc, {
    startY: appY,
    margin: { left: margin },
    tableWidth: 120,
    head: [
      [
        { content: "Manajer Bisnis", styles: { halign: 'center' } },
        { content: "Manajer Keuangan &\nUmum", styles: { halign: 'center' } },
        { content: "Asman Akuntansi &\nUmum", styles: { halign: 'center' } },
        { content: "Asman Adm &\nKeuangan", styles: { halign: 'center' } },
        { content: "Asman Pemasaran", styles: { halign: 'center' } },
        { content: "Asman Penjualan", styles: { halign: 'center' } }
      ]
    ],
    body: [
      [
        { content: "Muhammad Fakri Firdaus", styles: { halign: 'center' } },
        { content: "Fiana Fega Sari", styles: { halign: 'center' } },
        { content: "Rakha Afriansyah P", styles: { halign: 'center' } },
        { content: "Pepy Suhartini", styles: { halign: 'center' } },
        { content: "Gisheila Miftanisa", styles: { halign: 'center' } },
        { content: "Izath Rytami", styles: { halign: 'center' } }
      ],
      ["", "", "", "", "", ""] // empty row for signature space
    ],
    theme: "grid",
    styles: { fontSize: 4, textColor: 20 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, lineWidth: 0.1, lineColor: 20 },
    bodyStyles: { lineWidth: 0.1, lineColor: 20 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    }
  });

  y = Math.max(y + 15, (doc as any).lastAutoTable.finalY + 10);

  doc.setFontSize(8);
  doc.text("Tembusan Yth:", margin, y);
  doc.text("1. Ka SPI Wilayah Kapsus", margin + 5, y + 5);
  doc.text("2. Kadiv Penjualan Pasar Umum", margin + 5, y + 10);
  doc.text("3. Kadiv TI", margin + 5, y + 15);

  const now = new Date();
  const dateStr = `${now.getDate()}${now.getMonth() + 1}${now.getFullYear()}`;
  doc.save(`ND Pengajuan Credit Limit ${dateStr}.pdf`);
};
