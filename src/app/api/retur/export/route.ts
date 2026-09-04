import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId");
    const namaPt = searchParams.get("namaPt");
    const q = searchParams.get("q") || "";
    const inisial = searchParams.get("inisial");
    const toko = searchParams.get("toko");
    const tujuan = searchParams.get("tujuan");
    const lokasi = searchParams.get("lokasi") || searchParams.get("unitProduksi");
    const regional = searchParams.get("regional");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const isPreview = searchParams.get("preview") === "true";

    // [RBAC] Verify Session via getSession helper (supports cookies() and headers fallback)
    const user = await getSession(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Identifikasi Ritel (Optional - multi-pick supported via comma, namaPts, or multiple namaPt params)
    const namaPtParams = searchParams.getAll("namaPt");
    const namaPtSingle = searchParams.get("namaPt");
    const namaPtsParam = searchParams.get("namaPts");
    
    let selectedRitelNames: string[] = [];
    if (namaPtParams.length > 1) {
      namaPtParams.forEach((p) => {
        if (p.trim()) selectedRitelNames.push(p.trim());
      });
    } else if (namaPtsParam) {
      selectedRitelNames = namaPtsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (namaPtSingle) {
      selectedRitelNames = namaPtSingle.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (retailerId) {
      const foundRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
      if (foundRitel) {
        selectedRitelNames = [foundRitel.namaPt];
      }
    }

    // Deduplicate selected names
    selectedRitelNames = Array.from(new Set(selectedRitelNames));

    // Build common filter criteria
    const drFilter: any[] = [];
    const filtersB: any[] = [];
    
    if (selectedRitelNames.length === 1) {
      filtersB.push({ RitelModern: { namaPt: { equals: selectedRitelNames[0], mode: "insensitive" } } });
    } else if (selectedRitelNames.length > 1) {
      filtersB.push({
        OR: selectedRitelNames.map((name) => ({
          RitelModern: { namaPt: { equals: name, mode: "insensitive" } },
        })),
      });
    }

    if (inisial) {
      drFilter.push({ inisial: { equals: inisial.trim(), mode: "insensitive" } });
    }

    if (toko) {
      drFilter.push({ namaCompany: { contains: toko.trim(), mode: "insensitive" } });
    }

    if (tujuan) {
      drFilter.push({
        OR: [
          { namaCompany: { contains: tujuan.trim(), mode: "insensitive" } },
          { RitelModern: { tujuan: { contains: tujuan.trim(), mode: "insensitive" } } },
        ],
      });
    }

    if (lokasi) {
      if (lokasi.toUpperCase() === "BELUM ADA LOKASI") {
        drFilter.push({
          OR: [
            { lokasiBarangId: null },
            { LokasiBarang: { is: null } },
          ],
        });
      } else {
        drFilter.push({
          OR: [
            { LokasiBarang: { siteArea: { equals: lokasi.trim(), mode: "insensitive" } } },
            { PembebananReturn: { siteArea: { equals: lokasi.trim(), mode: "insensitive" } } },
          ],
        });
      }
    }

    if (regional) {
      drFilter.push({
        OR: [
          { LokasiBarang: { namaRegional: { equals: regional.trim(), mode: "insensitive" } } },
          { PembebananReturn: { namaRegional: { equals: regional.trim(), mode: "insensitive" } } },
        ],
      });
    }
    
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
        drFilter.push({ statusBarang: { equals: status.trim(), mode: "insensitive" } });
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
          { rtvCn: { contains: q.trim(), mode: "insensitive" } },
          { namaCompany: { contains: q.trim(), mode: "insensitive" } },
          { produk: { contains: q.trim(), mode: "insensitive" } },
          { inisial: { contains: q.trim(), mode: "insensitive" } },
        ]
      });
    }

    if (drFilter.length > 0) {
      filtersB.push(...drFilter);
    }

    const where: any = filtersB.length > 0 ? { AND: filtersB } : {};

    // ── PREVIEW MODE: Return total count and top 7 records for Modal Preview ──
    if (isPreview) {
      const [totalCount, preview] = await Promise.all([
        prisma.dataRetur.count({ where }),
        prisma.dataRetur.findMany({
          where,
          take: 7,
          orderBy: { createdAt: "desc" },
          include: {
            RitelModern: true,
            LokasiBarang: true,
            PembebananReturn: true,
            Product: true,
          },
        }),
      ]);

      return NextResponse.json({
        totalCount,
        preview,
      });
    }

    // ── EXPORT EXCEL MODE: Fetch all records without limit ──
    const columnsParam = searchParams.get("columns");
    const selectedKeys = columnsParam
      ? columnsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

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

    // Helper to convert to Date object safely
    const toExcelDate = (date: Date | string | null) => {
      if (!date) return null;
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    };

    const ALL_COLUMNS = [
      { key: "no", header: "NO", width: 8, getValue: (_item: any, idx: number) => idx + 1 },
      { key: "rtvCn", header: "RTV/CN", width: 18, getValue: (item: any) => item.rtvCn || "-" },
      { key: "tanggalRtv", header: "TANGGAL RTV", width: 16, numFmt: "dd/mm/yyyy", getValue: (item: any) => toExcelDate(item.tanggalRtv) },
      { key: "maxPickup", header: "MAX PICKUP", width: 16, numFmt: "dd/mm/yyyy", getValue: (item: any) => toExcelDate(item.maxPickup) },
      { key: "kodeToko", header: "KODE TOKO", width: 14, getValue: (item: any) => item.kodeToko || "-" },
      { key: "toko", header: "TOKO", width: 32, getValue: (item: any) => item.namaCompany || "-" },
      { key: "namaCompany", header: "NAMA COMPANY", width: 32, getValue: (item: any) => item.RitelModern?.namaPt || "-" },
      { key: "inisial", header: "INISIAL", width: 14, getValue: (item: any) => item.inisial || "-" },
      { key: "link", header: "LINK", width: 25, getValue: (item: any) => item.link || "-" },
      { key: "produk", header: "PRODUK", width: 35, getValue: (item: any) => item.produk || "-" },
      { key: "qtyReturn", header: "QTY RETUR", width: 14, numFmt: "#,##0", getValue: (item: any) => Number(item.qtyReturn || 0) },
      { key: "kg", header: "KG", width: 14, numFmt: "#,##0.00", getValue: (item: any) => Number(item.qtyReturn || 0) * (item.Product?.satuanKg || 1) },
      { key: "nominal", header: "NOMINAL", width: 18, numFmt: '"Rp" #,##0', getValue: (item: any) => Number(item.nominal || 0) },
      { key: "rpKg", header: "RP/KG", width: 18, numFmt: '"Rp" #,##0', getValue: (item: any) => Number(item.rpKg || 0) },
      { key: "statusBarang", header: "STATUS BARANG", width: 18, getValue: (item: any) => item.statusBarang || "BELUM DIAMBIL" },
      { key: "refKetStatus", header: "REFERENSI/KET STATUS", width: 30, getValue: (item: any) => item.refKetStatus || "-" },
      { key: "lokasiBarang", header: "LOKASI BARANG", width: 25, getValue: (item: any) => item.LokasiBarang?.siteArea || "-" },
      { key: "pembebananReturn", header: "PEMBEBANAN RETUR", width: 25, getValue: (item: any) => item.PembebananReturn?.siteArea || "-" },
      { key: "invoiceRekon", header: "INVOICE REKON", width: 22, getValue: (item: any) => item.invoiceRekon || "-" },
      { key: "referensiPembayaran", header: "REFERENSI PEMBAYARAN", width: 25, getValue: (item: any) => item.referensiPembayaran || "-" },
      { key: "tanggalPembayaran", header: "TANGGAL PEMBAYARAN", width: 18, numFmt: "dd/mm/yyyy", getValue: (item: any) => toExcelDate(item.tanggalPembayaran) },
      { key: "remarks", header: "REMARKS", width: 40, getValue: (item: any) => item.remarks || "-" },
    ];

    const activeCols = selectedKeys && selectedKeys.length > 0
      ? ALL_COLUMNS.filter((col) => selectedKeys.includes(col.key))
      : ALL_COLUMNS;

    // Generate Excel using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Retur");

    // Define Columns
    worksheet.columns = activeCols.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    // Styling Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Add Rows
    data.forEach((item, index) => {
      const rowData: Record<string, any> = {};
      activeCols.forEach((col) => {
        rowData[col.key] = col.getValue(item, index);
      });
      worksheet.addRow(rowData);
    });

    // Formatting columns
    activeCols.forEach((col) => {
      if (col.numFmt) {
        worksheet.getColumn(col.key).numFmt = col.numFmt;
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    let ritelLabel = "ALL_RETAILERS";
    if (selectedRitelNames.length === 1) {
      ritelLabel = selectedRitelNames[0].replace(/[^a-zA-Z0-9_-]/g, "_");
    } else if (selectedRitelNames.length > 1) {
      ritelLabel = `${selectedRitelNames.length}_RITEL_TERPILIH`;
    }
    const filename = `Data_Retur_${ritelLabel}_${new Date().toISOString().split("T")[0]}.xlsx`;

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
