import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Utilitas untuk men-generate Invoice PDF dengan standar korporat (Format Bulog Style)
 */
export const generateInvoicePdf = (
  data: any,
  action: "download" | "preview" = "download",
) => {
  // --- 0. HARD COMPRESSION INITIALIZATION ---
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // --- 1. DYNAMIC HELPERS & VARIABLES ---
  const formatRp = (num: number) =>
    num ? `Rp ${num.toLocaleString("id-ID")}` : "Rp 0";
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const printTime = `${String(today.getDate()).padStart(2, "0")}-${mm}-${yyyy} | ${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;

  // Perhitungan Nominal, Discount, dan Total Tagihan
  const totalNominal =
    data?.Items?.reduce(
      (sum: number, item: any) => sum + (item.nominal || 0),
      0,
    ) || 0;
  const totalDiscount =
    data?.Items?.reduce(
      (sum: number, item: any) => sum + (item.discount || 0),
      0,
    ) || 0;
  const totalTagihan =
    data?.Items?.reduce(
      (sum: number, item: any) => sum + (item.rpTagih || 0),
      0,
    ) || 0;

  const rawRegional = data?.UnitProduksi?.namaRegional || "KANTOR WILAYAH BULOG"; 
  const regionalName = rawRegional.toUpperCase();
  const siteArea = data?.UnitProduksi?.siteArea
    ? `27100 - ${data.UnitProduksi.siteArea}`
    : "27100 - SPB DKI";
  const invNumber = data?.noInvoice || `001/${mm}/${yyyy}/27100`;

  // --- 2. HEADER & LOGO ---
  try {
    const logoUrl = "/logo-bulog.png";
    doc.addImage(logoUrl, "PNG", 15, 10, 30, 10, "logo", "FAST");
  } catch (e) {
    console.error("Gagal memuat logo di PDF:", e);
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(regionalName.toUpperCase(), 105, 16, { align: "center" });

  // --- 3. ALAMAT INVOICE & INFO BANK ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const startYAddress = 28;

  doc.text(siteArea.toUpperCase(), 15, startYAddress);

  const startYInvoice = startYAddress + 15;
  doc.setFont("helvetica", "bold");
  doc.text("Alamat Invoice:", 15, startYInvoice);
  doc.setFont("helvetica", "normal");
  doc.text(
    data?.RitelModern?.namaPt || "IDM_PT. INDOMARCO PRISMATAMA",
    15,
    startYInvoice + 5,
  );
  doc.text(
    data?.tujuanDetail || "JL. BY PASS BANDARA INTERNATIONAL LOMBOK, NTB",
    15,
    startYInvoice + 10,
  );

  const startYBank = startYInvoice + 18;
  doc.setFont("helvetica", "bold");
  doc.text("Bank BRI - 180501000026304", 15, startYBank);
  doc.text("a.n Manajemen UB Industri Perum BULOG", 15, startYBank + 5);

  // --- 4. TITLE & NOMOR INVOICE ---
  const startYTitle = startYBank + 16;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FAKTUR PENJUALAN", 105, startYTitle, { align: "center" });
  doc.setFontSize(9);
  doc.text(invNumber, 105, startYTitle + 6, { align: "center" });

  // --- 5. TABEL ITEM UTAMA ---
  // Jarak langsung dilompatin ke tabel (Grid Info dihapus permanen)
  const itemsStartY = startYTitle + 12;
  const tableBody =
    data?.Items?.length > 0
      ? data.Items.map((item: any) => {
          const namaProduk = item?.Product?.name || "Produk";
          const satuanKg = item?.Product?.satuanKg || 1;
          const kuantitas = `${item.pcs?.toLocaleString("id-ID")} \nPack ${satuanKg} KG`;
          const kuantum = `${(item.pcs * satuanKg).toLocaleString("id-ID")} \nKg`;
          return [
            namaProduk,
            kuantitas,
            kuantum,
            formatRp(item.hargaPcs),
            "PPN 12%\n(dibebaskan)",
            formatRp(item.nominal), // 👈 "Jumlah" sekarang nembak ke item.nominal
          ];
        })
      : [["-", "-", "-", "-", "-", "-"]];

  autoTable(doc, {
    startY: itemsStartY,
    head: [
      [
        "Description",
        "Kuantitas",
        "Kuantum",
        "Harga\nSatuan",
        "Pajak",
        "Jumlah",
      ],
    ],
    body: tableBody,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fontStyle: "bold",
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    bodyStyles: { lineWidth: 0 },
  });

  // --- 6. SUBTOTAL, DISCOUNT & PAJAK CALCULATIONS ---
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  doc.setLineWidth(0.3);
  doc.line(115, finalY, 195, finalY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Jumlah Sebelum Pajak", 115, finalY + 5);
  doc.text(formatRp(totalNominal), 195, finalY + 5, { align: "right" }); // 👈 Total Nominal

  doc.setFont("helvetica", "normal");
  doc.text("Discount", 115, finalY + 10);
  doc.text(formatRp(totalDiscount), 195, finalY + 10, { align: "right" }); // 👈 Row Discount Baru

  doc.text("Pajak", 115, finalY + 15);
  doc.text("Rp 0,00", 195, finalY + 15, { align: "right" });

  doc.line(115, finalY + 18, 195, finalY + 18);

  doc.setFont("helvetica", "bold");
  doc.text("Total", 115, finalY + 23);
  doc.text(formatRp(totalTagihan), 195, finalY + 23, { align: "right" }); // 👈 Total Tagihan

  // --- 7. FOOTER CETAKAN BAWAH (DINAMIS Y) ---
  const footerY = finalY + 35; // Jarak agak digedein dikit dari Total
  doc.setLineWidth(0.3);
  doc.line(15, footerY, 195, footerY);
  doc.setFontSize(8);
  doc.text(
    `Dicetak oleh   : ${regionalName} - Keuangan & Akuntansi`,
    15,
    footerY + 5,
  );
  doc.text(`Pada waktu     : ${printTime}`, 15, footerY + 9);

  // Save or Preview
  if (action === "preview") {
    return doc.output("bloburl");
  } else {
    // Nama file diganti dari Invoice_ jadi Faktur_Penjualan_
    doc.save(`Faktur_Penjualan_${invNumber.replace(/\//g, "-")}.pdf`);
  }
};
