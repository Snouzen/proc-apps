import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import ExcelJS from "exceljs";
import { upperClean } from "@/lib/text";

// [ENV] Timezone offset from env, not hardcoded
const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS) || 7;

function parseDate(v?: string | null) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
      return null;
    }
    return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

const formatDateId = (d: any) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export async function GET(request: Request) {
  try {
    const bag = await cookies();
    let token = bag.get("session")?.value;
    if (!token) {
      const hdr = request.headers.get("cookie") || "";
      const m = hdr.match(/(?:^|;\s*)session=([^;]+)/);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const company = searchParams.get("company") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    const includeUnknown =
      (searchParams.get("includeUnknown") || "true") === "true";
    const regionalParam =
      session.role === "rm"
        ? session.regional || undefined
        : searchParams.get("regional") || undefined;
    const siteAreaParam = searchParams.get("siteArea") || undefined;
    const q = (searchParams.get("q") || "").trim();
    const tglFrom = parseDate(searchParams.get("tglFrom"));
    const tglTo = parseDate(searchParams.get("tglTo"));
    const submitFrom = parseDate(searchParams.get("submitFrom"));
    const submitTo = parseDate(searchParams.get("submitTo"));
    const group = (searchParams.get("group") || "all").trim();
    const sort = (searchParams.get("sort") || "createdAt_desc").trim();

    let colFilters: Record<string, string> = {};
    const colFiltersRaw = searchParams.get("colFilters");
    if (colFiltersRaw) {
      try {
        colFilters = JSON.parse(colFiltersRaw);
      } catch (e) {
        console.error("Failed to parse colFilters", e);
      }
    }

    // Build where clause exactly like the main GET route
    const where: any = {};
    if (noPo) where.noPo = noPo;
    if (tglFrom || tglTo) {
      where.tglPo = {
        ...(tglFrom ? { gte: tglFrom } : {}),
        ...(tglTo ? { lte: tglTo } : {}),
      };
    }
    if (submitFrom || submitTo) {
      where.createdAt = {
        ...(submitFrom ? { gte: submitFrom } : {}),
        ...(submitTo ? { lte: submitTo } : {}),
      };
    }
    if (regionalParam && regionalParam.trim()) {
      const rp = regionalParam.trim().toLowerCase();
      const syn = (() => {
        if (
          rp.includes("bandung") ||
          rp.includes("reg 1") ||
          rp.includes("regional 1") ||
          rp.includes(" i")
        ) {
          return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
        }
        if (
          rp.includes("surabaya") ||
          rp.includes("reg 2") ||
          rp.includes("regional 2") ||
          rp.includes(" ii")
        ) {
          return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
        }
        if (
          rp.includes("makassar") ||
          rp.includes("reg 3") ||
          rp.includes("regional 3") ||
          rp.includes(" iii")
        ) {
          return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
        }
        return [regionalParam.trim()];
      })();
      where.OR = [
        ...syn.map((s) => ({
          regional: { contains: s, mode: "insensitive" as const },
        })),
        {
          UnitProduksi: {
            is: {
              OR: syn.map((s) => ({
                namaRegional: { contains: s, mode: "insensitive" as const },
              })),
            },
          },
        },
      ];
    }
    if (session.role === "rm" && session.regional) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              regional: {
                equals: session.regional,
                mode: "insensitive" as const,
              },
            },
            {
              UnitProduksi: {
                is: {
                  namaRegional: {
                    equals: session.regional,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        },
      ];
    }
    if (siteAreaParam && siteAreaParam.trim()) {
      const sa = siteAreaParam.trim();
      const saFilter =
        session.role === "rm" && session.regional
          ? {
              AND: [
                {
                  UnitProduksi: {
                    is: {
                      siteArea: { contains: sa, mode: "insensitive" as const },
                      namaRegional: {
                        equals: session.regional,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              ],
            }
          : {
              UnitProduksi: {
                is: {
                  siteArea: { contains: sa, mode: "insensitive" as const },
                },
              },
            };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), saFilter];
    }
    if (company && company.trim()) {
      where.RitelModern = {
        is: {
          namaPt: {
            equals: company.trim(),
            mode: "insensitive",
          },
        },
      };
    }
    if (q) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { noPo: { contains: q, mode: "insensitive" as const } },
            { noInvoice: { contains: q, mode: "insensitive" as const } },
            { tujuanDetail: { contains: q, mode: "insensitive" as const } },
            { regional: { contains: q, mode: "insensitive" as const } },
            { remarks: { contains: q, mode: "insensitive" as const } },
            {
              RitelModern: {
                is: {
                  OR: [
                    { namaPt: { contains: q, mode: "insensitive" as const } },
                    { inisial: { contains: q, mode: "insensitive" as const } },
                    { tujuan: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            },
            {
              UnitProduksi: {
                is: {
                  OR: [
                    { siteArea: { contains: q, mode: "insensitive" as const } },
                    {
                      namaRegional: {
                        contains: q,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              },
            },
            {
              Items: {
                some: {
                  Product: {
                    is: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }

    if (colFilters && Object.keys(colFilters).length > 0) {
      const AND = Array.isArray(where.AND) ? where.AND : [];
      for (const [key, val] of Object.entries(colFilters)) {
        const strVal = String(val).trim();
        if (!strVal) continue;

        const isBool = (v: string) => {
          const norm = v.toLowerCase();
          return ["1", "true", "ya", "yes", "y"].includes(norm)
            ? true
            : ["0", "false", "tidak", "no", "n"].includes(norm)
              ? false
              : null;
        };

        if (
          key === "noPo" ||
          key === "tujuan" ||
          key === "noInvoice" ||
          key === "linkPo" ||
          key === "remarks"
        ) {
          const dbKey = key === "tujuan" ? "tujuanDetail" : key;
          AND.push({ [dbKey]: { contains: strVal, mode: "insensitive" } });
        } else if (key === "company" || key === "inisial") {
          const dbKey = key === "company" ? "namaPt" : "inisial";
          AND.push({
            RitelModern: {
              is: { [dbKey]: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "siteArea") {
          AND.push({
            UnitProduksi: {
              is: { siteArea: { contains: strVal, mode: "insensitive" } },
            },
          });
        } else if (key === "regional") {
          AND.push({
            OR: [
              { regional: { contains: strVal, mode: "insensitive" } },
              {
                UnitProduksi: {
                  is: {
                    namaRegional: { contains: strVal, mode: "insensitive" },
                  },
                },
              },
            ],
          });
        } else if (key === "products") {
          AND.push({
            Items: {
              some: {
                Product: {
                  is: { name: { contains: strVal, mode: "insensitive" } },
                },
              },
            },
          });
        } else if (key.startsWith("status")) {
          const bVal = isBool(strVal);
          if (bVal !== null) {
            AND.push({ [key]: bVal });
          }
        }
      }
      if (AND.length > 0) {
        where.AND = AND;
      }
    }

    const orderBy =
      sort === "createdAt_asc"
        ? ({ createdAt: "asc" } as const)
        : sort === "company_asc"
          ? ({ RitelModern: { namaPt: "asc" } } as const)
          : sort === "company_desc"
            ? ({ RitelModern: { namaPt: "desc" } } as const)
            : sort === "tglPo_desc"
              ? ({ tglPo: "desc" } as const)
              : sort === "tglPo_asc"
                ? ({ tglPo: "asc" } as const)
                : ({ createdAt: "desc" } as const);

    const columnsRaw = searchParams.get("cols");
    let columnsConfig: any[] = [];
    if (columnsRaw) {
      try {
        columnsConfig = JSON.parse(columnsRaw);
      } catch (e) {
        // ignore
      }
    }

    // [PERF] Use select instead of include — only fetch fields used in Excel generation
    const data = await prisma.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        noPo: true,
        tglPo: true,
        expiredTgl: true,
        linkPo: true,
        noInvoice: true,
        tujuanDetail: true,
        regional: true,
        statusKirim: true,
        statusSdif: true,
        statusPo: true,
        statusFp: true,
        statusKwi: true,
        statusInv: true,
        statusTagih: true,
        statusBayar: true,
        createdAt: true,
        updatedAt: true,
        Items: {
          select: {
            pcs: true,
            nominal: true,
            rpTagih: true,
            Product: { select: { name: true } },
          },
        },
        RitelModern: { select: { namaPt: true, inisial: true } },
        UnitProduksi: { select: { siteArea: true, namaRegional: true } },
      },
      orderBy,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report PO");

    const headerRow = worksheet.addRow(columnsConfig.map((c) => c.label));
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };

    let rowIndex = 1;

    for (const po of data) {
      const items = Array.isArray(po.Items) ? po.Items : [];
      const productList = items
        .map((it: any) => upperClean(it.Product?.name || ""))
        .filter((s: string) => s.trim().length > 0);

      const totalTagihan =
        Number((po as any).totalTagihan) ||
        items.reduce(
          (acc: number, it: any) => acc + (Number(it.rpTagih) || 0),
          0,
        );
      const totalNominal =
        Number((po as any).totalNominal) ||
        items.reduce(
          (acc: number, it: any) => acc + (Number(it.nominal) || 0),
          0,
        );

      const rowBase = {
        id: po.id,
        noPo: upperClean(po.noPo || "-"),
        company: upperClean(po.RitelModern?.namaPt || "-"),
        inisial: upperClean(po.RitelModern?.inisial || ""),
        tujuan: upperClean(po.tujuanDetail || ""),
        tglPo: po.tglPo ? new Date(po.tglPo) : null,
        expiredTgl: po.expiredTgl ? new Date(po.expiredTgl) : null,
        siteArea: upperClean(
          po.UnitProduksi?.siteArea && po.UnitProduksi.siteArea !== "UNKNOWN"
            ? po.UnitProduksi.siteArea
            : "",
        ),
        regional: upperClean(
          po.regional || po.UnitProduksi?.namaRegional || "",
        ),
        noInvoice: upperClean(po.noInvoice || ""),
        linkPo: po.linkPo || "",
        totalNominal,
        totalTagihan,
        statusKirim: !!po.statusKirim ? "Ya" : "Tidak",
        statusSdif: !!po.statusSdif ? "Ya" : "Tidak",
        statusPo: !!po.statusPo ? "Ya" : "Tidak",
        statusFp: !!po.statusFp ? "Ya" : "Tidak",
        statusKwi: !!po.statusKwi ? "Ya" : "Tidak",
        statusInv: !!po.statusInv ? "Ya" : "Tidak",
        statusTagih: !!po.statusTagih ? "Ya" : "Tidak",
        statusBayar: !!po.statusBayar ? "Ya" : "Tidak",
        updatedAt: po.updatedAt ? new Date(po.updatedAt) : null,
        createdAt: po.createdAt ? new Date(po.createdAt) : null,
        submitDate: po.createdAt ? new Date(po.createdAt) : null,
      };

      const products = productList.length > 0 ? productList : [""];

      // Find indices of date columns
      const dateColIndices: number[] = [];
      columnsConfig.forEach((c, i) => {
        if (["tglPo", "expiredTgl", "updatedAt", "createdAt", "submitDate"].includes(c.id)) {
          dateColIndices.push(i + 1);
        }
      });

      for (const p of products) {
        const rowData = columnsConfig.map((c) => {
          if (c.id === "no") return rowIndex;
          if (c.id === "products") return p;
          return (rowBase as any)[c.id] ?? "";
        });
        const addedRow = worksheet.addRow(rowData);
        
        // Apply date format to relevant cells in this row
        dateColIndices.forEach((idx) => {
          const cell = addedRow.getCell(idx);
          if (cell.value instanceof Date) {
            cell.numFmt = "dd/mm/yyyy";
          }
        });
        
        rowIndex++;
      }
    }

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnsConfig.length },
    };
    worksheet.views = [
      { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" },
    ];

    columnsConfig.forEach((c, i) => {
      worksheet.getColumn(i + 1).width = c.id === "no" ? 5 : 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-po-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json(
      { error: "Server error during export" },
      { status: 500 },
    );
  }
}
