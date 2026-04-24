import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId");
    const q = searchParams.get("q") || "";
    const inisial = searchParams.get("inisial");
    const toko = searchParams.get("toko");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");

    // [RBAC] Verify Session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const user = verifySession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Identifikasi Ritel
    if (!retailerId) {
      return NextResponse.json({ error: "Retailer ID is required" }, { status: 400 });
    }

    const selectedRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
    if (!selectedRitel) {
      return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
    }

    // Build common filter (SAME as in /api/retur/route.ts but without pagination)
    const drFilter: Prisma.DataReturWhereInput[] = [];
    
    // DETAIL MODE FILTER: By Name (ensure all branches are included)
    const filtersB: Prisma.DataReturWhereInput[] = [
      { RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } }
    ];

    if (inisial) drFilter.push({ inisial: inisial });
    if (toko) drFilter.push({ namaCompany: toko });
    
    if (status) {
      if (status.toUpperCase() === "BELUM DIAMBIL") {
        drFilter.push({
          OR: [
            { statusBarang: { equals: "BELUM DIAMBIL", mode: "insensitive" } },
            { statusBarang: null },
            { statusBarang: { equals: "" } }
          ]
        });
      } else {
        drFilter.push({ statusBarang: { equals: status, mode: "insensitive" } });
      }
    }

    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        dateRange.lte = d;
      }
      drFilter.push({ tanggalRtv: dateRange });
    }

    if (q) {
      drFilter.push({
        OR: [
          { rtvCn: { contains: q, mode: "insensitive" } },
          { namaCompany: { contains: q, mode: "insensitive" } },
          { produk: { contains: q, mode: "insensitive" } },
        ]
      });
    }

    if (drFilter.length > 0) {
      filtersB.push(...drFilter);
    }

    const where: Prisma.DataReturWhereInput = { AND: filtersB };

    // Fetch all records matching filters (NO LIMIT)
    const data = await prisma.dataRetur.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        RitelModern: true,
        LokasiBarang: true,
        PembebananReturn: true,
        Product: true,
      },
    });

    // Generate Excel using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Retur");

    // Define Columns
    worksheet.columns = [
      { header: "NO", key: "no", width: 5 },
      { header: "RTV/CN", key: "rtvCn", width: 15 },
      { header: "TANGGAL RTV", key: "tanggalRtv", width: 15 },
      { header: "MAX PICKUP", key: "maxPickup", width: 15 },
      { header: "KODE TOKO", key: "kodeToko", width: 12 },
      { header: "TOKO", key: "namaCompany", width: 30 },
      { header: "INISIAL", key: "inisial", width: 10 },
      { header: "LINK", key: "link", width: 25 },
      { header: "PRODUK", key: "produk", width: 30 },
      { header: "QTY RETUR", key: "qtyReturn", width: 12 },
      { header: "NOMINAL", key: "nominal", width: 15 },
      { header: "RP/KG", key: "rpKg", width: 15 },
      { header: "STATUS BARANG", key: "statusBarang", width: 15 },
      { header: "REFERENSI/KET STATUS", key: "refKetStatus", width: 30 },
      { header: "LOKASI BARANG", key: "lokasiBarang", width: 25 },
      { header: "PEMBEBANAN RETUR", key: "pembebananReturn", width: 25 },
      { header: "INVOICE REKON", key: "invoiceRekon", width: 20 },
      { header: "REFERENSI PEMBAYARAN", key: "referensiPembayaran", width: 25 },
      { header: "TANGGAL PEMBAYARAN", key: "tanggalPembayaran", width: 15 },
      { header: "REMARKS", key: "remarks", width: 40 },
    ];

    // Styling Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Helper to convert to Date object safely
    const toExcelDate = (date: Date | string | null) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    };

    // Add Rows
    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        rtvCn: item.rtvCn || "-",
        tanggalRtv: toExcelDate(item.tanggalRtv),
        maxPickup: toExcelDate(item.maxPickup),
        kodeToko: item.kodeToko || "-",
        namaCompany: item.namaCompany || "-",
        inisial: item.inisial || "-",
        link: item.link || "-",
        produk: item.produk || "-",
        qtyReturn: Number(item.qtyReturn || 0),
        nominal: Number(item.nominal || 0),
        rpKg: Number(item.rpKg || 0),
        statusBarang: item.statusBarang || "BELUM DIAMBIL",
        refKetStatus: item.refKetStatus || "-",
        lokasiBarang: item.LokasiBarang?.siteArea || "-",
        pembebananReturn: item.PembebananReturn?.siteArea || "-",
        invoiceRekon: item.invoiceRekon || "-",
        referensiPembayaran: item.referensiPembayaran || "-",
        tanggalPembayaran: toExcelDate(item.tanggalPembayaran),
        remarks: item.remarks || "-",
      });
    });

    // Formatting date columns
    worksheet.getColumn('tanggalRtv').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('maxPickup').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('tanggalPembayaran').numFmt = 'dd/mm/yyyy';

    // Formatting money columns (IDR format)
    const idrFmt = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"??_);_(@_)';
    worksheet.getColumn('nominal').numFmt = idrFmt;
    worksheet.getColumn('rpKg').numFmt = idrFmt;

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `Data_Retur_${selectedRitel.namaPt.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("GET Retur Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
