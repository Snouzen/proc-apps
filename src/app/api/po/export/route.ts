import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import ExcelJS from "exceljs";
import { upperClean } from "@/lib/text";
import { parseYmdOrIsoToUtcNoon } from "@/lib/utils/dates";
import { getRegionalSynonyms } from "@/lib/utils/regional";



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
    const tglFrom = parseYmdOrIsoToUtcNoon(searchParams.get("tglFrom"));
    const tglTo = parseYmdOrIsoToUtcNoon(searchParams.get("tglTo"));
    const submitFrom = parseYmdOrIsoToUtcNoon(searchParams.get("submitFrom"));
    const submitTo = parseYmdOrIsoToUtcNoon(searchParams.get("submitTo"));
    const group = (searchParams.get("group") || "all").trim();
    const sort = (searchParams.get("sort") || "createdAt_desc").trim();

    let colFilters: Record<string, string | string[]> = {};
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
      const syn = getRegionalSynonyms(rp);
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
        let vals: string[] = [];
        if (Array.isArray(val)) {
          vals = val.map(String).map((v) => v.trim()).filter(Boolean);
        } else {
          const strVal = String(val).trim();
          if (strVal) vals.push(strVal);
        }
        if (vals.length === 0) continue;

        const isBool = (v: string) => {
          const norm = v.toLowerCase();
          return ["1", "true", "ya", "yes", "y"].includes(norm)
            ? true
            : ["0", "false", "tidak", "no", "n"].includes(norm)
              ? false
              : null;
        };

        const orConditions = [];

        for (const strVal of vals) {
          if (
            key === "noPo" ||
            key === "tujuan" ||
            key === "tujuanDetail" ||
            key === "noInvoice" ||
            key === "linkPo" ||
            key === "remarks" ||
            key === "buktiTagih" ||
            key === "buktiBayar" ||
            key === "namaSupir" ||
            key === "platNomor"
          ) {
            const dbKey = key === "tujuan" ? "tujuanDetail" : key;
            orConditions.push({ [dbKey]: { contains: strVal, mode: "insensitive" } });
          } else if (key === "company" || key === "inisial") {
            const dbKey = key === "company" ? "namaPt" : "inisial";
            orConditions.push({
              RitelModern: {
                is: { [dbKey]: { contains: strVal, mode: "insensitive" } },
              },
            });
          } else if (key === "siteArea") {
            orConditions.push({
              UnitProduksi: {
                is: { siteArea: { contains: strVal, mode: "insensitive" } },
              },
            });
          } else if (key === "regional") {
            orConditions.push({
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
          } else if (key === "products" || key === "namaProduk") {
            orConditions.push({
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
              orConditions.push({ [key]: bVal });
            }
          }
        }

        if (orConditions.length > 0) {
          if (orConditions.length === 1) {
            AND.push(orConditions[0]);
          } else {
            AND.push({ OR: orConditions });
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
      take: 5000,
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
        tglkirim: true,
        remarks: true,
        buktiTagih: true,
        buktiBayar: true,
        namaSupir: true,
        platNomor: true,
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
            pcsKirim: true,
            hargaPcs: true,
            hargaKg: true,
            nominal: true,
            rpTagih: true,
            discount: true,
            Product: { select: { name: true, satuanKg: true } },
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

    // Find indices of date columns
    const dateColIndices: number[] = [];
    columnsConfig.forEach((c, i) => {
      if (["tglPo", "tglkirim", "expiredTgl", "updatedAt", "createdAt", "submitDate"].includes(c.id)) {
        dateColIndices.push(i + 1);
      }
    });

    for (const po of data) {
      const items = Array.isArray(po.Items) && po.Items.length > 0 ? po.Items : [null];

      for (const it of items) {
        const pcs = Number(it?.pcs) || 0;
        const pcsKirim = Number(it?.pcsKirim) || 0;
        const satuanKg = Number(it?.Product?.satuanKg) || 0;
        const kg = pcs * satuanKg;
        const hargaPcs = Number(it?.hargaPcs) || 0;
        const hargaKg = Number(it?.hargaKg) || 0;
        const nominal = Number(it?.nominal) || (pcs * hargaPcs);
        const discount = Number(it?.discount) || 0;
        const rpTagih = Number(it?.rpTagih) || 0;

        const rowMap: Record<string, any> = {
          no: rowIndex,
          noPo: upperClean(po.noPo || "-"),
          company: upperClean(po.RitelModern?.namaPt || "-"),
          inisial: upperClean(po.RitelModern?.inisial || ""),
          tglPo: po.tglPo ? new Date(po.tglPo) : null,
          tglkirim: po.tglkirim ? new Date(po.tglkirim) : null,
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
          buktiTagih: po.buktiTagih || "-",
          buktiBayar: po.buktiBayar || "-",
          linkPo: po.linkPo || "",
          namaSupir: po.namaSupir || "-",
          platNomor: po.platNomor || "-",
          tujuanDetail: po.tujuanDetail || "-",
          remarks: po.remarks || "-",
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
          // Item-level fields
          namaProduk: it?.Product?.name || "-",
          products: it?.Product?.name || "-",
          pcs,
          pcsKirim,
          satuanKg,
          kg,
          hargaPcs,
          hargaKg,
          nominal,
          discount,
          rpTagih,
        };

        const rowData = columnsConfig.map((c) => rowMap[c.id] ?? "");
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
