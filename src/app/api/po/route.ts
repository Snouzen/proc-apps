import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";

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
  const tzOffsetHours = 7;
  const shifted = new Date(d.getTime() + tzOffsetHours * 3600 * 1000);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      company,
      inisial,
      siteArea,
      tujuan,
      noPo,
      tglPo,
      expiredTgl,
      linkPo,
      noInvoice,
      items, // Expecting array of { namaProduk, pcs, pcsKirim, hargaPcs }
      remarks,
      status,
      regional,
    } = body ?? {};

    if (
      !company ||
      !inisial ||
      !noPo ||
      !tglPo ||
      !expiredTgl ||
      !tujuan ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "company, inisial, noPo, tglPo, expiredTgl, tujuan, dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    const companyTrim = String(company).trim();
    const inisialTrim = String(inisial).trim();
    const tujuanTrim = String(tujuan).trim();
    const noPoTrim = String(noPo).trim();
    const siteAreaTrim = String(siteArea || "").trim();

    const tglPoParsed = parseDate(tglPo);
    const expiredParsed = parseDate(expiredTgl);
    if (!tglPoParsed) {
      return NextResponse.json({ error: "tglPo tidak valid" }, { status: 400 });
    }
    if (!expiredParsed) {
      return NextResponse.json(
        { error: "expiredTgl tidak valid" },
        { status: 400 },
      );
    }

    const ritel =
      (await prisma.ritelModern.findFirst({
        where: {
          namaPt: { equals: companyTrim, mode: "insensitive" },
          inisial: { equals: inisialTrim, mode: "insensitive" },
        },
      })) ??
      (await prisma.ritelModern.create({
        data: {
          id: randomUUID(),
          namaPt: companyTrim,
          inisial: inisialTrim,
          tujuan: tujuanTrim || null,
          updatedAt: new Date(),
        },
      }));

    let unit: any = null;
    if (siteAreaTrim) {
      unit = await prisma.unitProduksi.findFirst({
        where: { siteArea: { equals: siteAreaTrim, mode: "insensitive" } },
      });
      if (!unit) {
        return NextResponse.json(
          { error: "Unit Produksi dengan siteArea tersebut belum terdaftar" },
          { status: 400 },
        );
      }
    } else {
      unit = await prisma.unitProduksi.findFirst({
        where: { idRegional: "UNKNOWN" },
      });
      if (!unit) {
        try {
          unit = await prisma.unitProduksi.create({
            data: {
              idRegional: "UNKNOWN",
              siteArea: "UNKNOWN",
              namaRegional: "Unknown",
              updatedAt: new Date(),
            } as any,
          });
        } catch {
          unit = await prisma.unitProduksi.findFirst({
            where: { idRegional: "UNKNOWN" },
          });
        }
      }
      if (!unit) {
        return NextResponse.json(
          { error: "Unit Produksi belum tersedia" },
          { status: 400 },
        );
      }
    }

    // Upsert PO Header
    const poData = {
      ritelId: ritel.id,
      unitProduksiId: unit.idRegional,
      tglPo: tglPoParsed as Date,
      expiredTgl: expiredParsed,
      linkPo: linkPo || null,
      noInvoice: noInvoice || null,
      tujuanDetail: tujuanTrim || null,
      regional: regional || null,
      statusKirim: !!status?.kirim,
      statusSdif: !!status?.sdif,
      statusPo: !!status?.po,
      statusFp: !!status?.fp,
      statusKwi: !!status?.kwi,
      statusInv: !!status?.inv,
      statusTagih: !!status?.tagih,
      statusBayar: !!status?.bayar,
      remarks: remarks || null,
      updatedAt: new Date(),
    };

    const updatedPO = await prisma.$transaction(async (tx: any) => {
      const po = await tx.purchaseOrder.upsert({
        where: { noPo: noPoTrim },
        create: {
          id: randomUUID(),
          noPo: noPoTrim,
          ...poData,
          createdAt: new Date(),
        },
        update: poData,
      });

      // Handle Items: Delete existing and recreate
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });

      for (const item of items) {
        const { namaProduk, pcs, pcsKirim, hargaPcs } = item;

        const product = await tx.product.upsert({
          where: { name: namaProduk },
          update: { name: namaProduk, updatedAt: new Date() },
          create: { id: randomUUID(), name: namaProduk, updatedAt: new Date() },
        });

        const satuan = Number((product as any).satuanKg ?? 1) || 1;
        const pcsNum = Number(pcs) || 0;
        const pcsKirimNum = Number(pcsKirim) || 0;
        const hargaPcsNum = Number(hargaPcs) || 0;
        const hargaKg = satuan > 0 ? hargaPcsNum / satuan : 0;
        const nominal = hargaPcsNum * pcsNum;
        const rpTagih = hargaPcsNum * pcsKirimNum;

        const itemId = randomUUID();
        try {
          await tx.purchaseOrderItem.create({
            data: {
              id: itemId,
              purchaseOrderId: po.id,
              productId: product.id,
              pcs: Math.round(pcsNum),
              pcsKirim: Math.round(pcsKirimNum),
              hargaKg,
              hargaPcs: hargaPcsNum,
              nominal,
              rpTagih,
            },
          });
        } catch (e: any) {
          // Fallback universal: detect existing columns and insert accordingly
          console.warn(
            "purchaseOrderItem.create failed; applying dynamic fallback:",
            e?.message,
          );
          // Read columns for dynamic insert
          const columns: Array<{ column_name: string; is_nullable: string }> =
            (await tx.$queryRawUnsafe(
              `SELECT column_name, is_nullable
               FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'PurchaseOrderItem'`,
            )) as any;
          const cols = columns.map((c) => c.column_name);
          const insertCols: string[] = [];
          const vals: any[] = [];
          const push = (name: string, value: any) => {
            if (cols.includes(name)) {
              insertCols.push(`"${name}"`);
              vals.push(value);
            }
          };
          push("id", itemId);
          push("purchaseOrderId", po.id);
          push("productId", product.id);
          push("pcs", Math.round(pcsNum));
          push("pcsKirim", Math.round(pcsKirimNum));
          push("hargaKg", hargaKg);
          push("hargaPcs", hargaPcsNum);
          push("nominal", nominal);
          push("rpTagih", rpTagih);
          // createdAt/updatedAt if exist
          const now = new Date();
          if (cols.includes("createdAt")) {
            insertCols.push(`"createdAt"`);
            vals.push(now);
          }
          if (cols.includes("updatedAt")) {
            insertCols.push(`"updatedAt"`);
            vals.push(now);
          }
          const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
          const colList = insertCols.join(", ");
          if (insertCols.length === 0) {
            throw e;
          }
          await tx.$executeRawUnsafe(
            `INSERT INTO "PurchaseOrderItem" (${colList}) VALUES (${placeholders})`,
            ...vals,
          );
        }
      }

      // Return minimal payload to avoid Prisma Client column mismatches
      return { id: po.id, noPo: po.noPo };
    });

    return NextResponse.json(updatedPO, { status: 201 });
  } catch (error) {
    const e: any = error;
    const payload = {
      error: e?.message ?? String(error ?? "Unknown error"),
      code: e?.code ?? null,
      meta: e?.meta ?? null,
      name: e?.name ?? null,
    };
    console.error("POST /api/po error:", payload);
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    const includeUnknown =
      (searchParams.get("includeUnknown") || "false") === "true";
    const regionalParam = searchParams.get("regional") || undefined;
    const noPoListRaw = searchParams.get("noPoList") || undefined;
    let noPoList: string[] | undefined = undefined;
    if (noPoListRaw) {
      try {
        const parsed = JSON.parse(noPoListRaw);
        if (Array.isArray(parsed)) {
          noPoList = parsed.map((s) => String(s));
        }
      } catch {
        const parts = noPoListRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) noPoList = parts;
      }
    }
    try {
      const where: any = {};
      if (noPo) where.noPo = noPo;
      if (noPoList && noPoList.length > 0) where.noPo = { in: noPoList };
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
            return [
              "reg 3",
              "regional 3",
              "reg iii",
              "regional iii",
              "makassar",
            ];
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
      if (!includeUnknown) {
        where.NOT = [
          {
            OR: [
              { unitProduksiId: "UNKNOWN" },
              { unitProduksiId: null },
              { tujuanDetail: null },
              { tujuanDetail: { in: ["", "-", "Unknown"] } },
              {
                RitelModern: {
                  is: { namaPt: { in: ["", "-", "Unknown"] } },
                },
              },
            ],
          },
        ];
      }
      const data = await prisma.purchaseOrder.findMany({
        where,
        include: {
          Items: { include: { Product: true } },
          RitelModern: true,
          UnitProduksi: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(data);
    } catch (e: any) {
      // Fallback raw SQL when Prisma Client has column mismatch
      const params: any[] = [];
      let whereSql = "";
      if (company && company.trim()) {
        params.push(`%${company.trim()}%`);
        whereSql += ` WHERE rm."namaPt" ILIKE $${params.length} `;
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
            return [
              "reg 3",
              "regional 3",
              "reg iii",
              "regional iii",
              "makassar",
            ];
          }
          return [regionalParam.trim()];
        })();
        const conds: string[] = [];
        syn.forEach((s) => {
          params.push(`%${s}%`);
          conds.push(`po."regional" ILIKE $${params.length}`);
        });
        syn.forEach((s) => {
          params.push(`%${s}%`);
          conds.push(`up."namaRegional" ILIKE $${params.length}`);
        });
        const orBlock = conds.length ? `(${conds.join(" OR ")})` : "";
        if (orBlock) {
          whereSql += whereSql ? ` AND ${orBlock} ` : ` WHERE ${orBlock} `;
        }
      }
      if (noPo) {
        params.push(noPo);
        whereSql += whereSql
          ? ` AND po."noPo" = $${params.length} `
          : ` WHERE po."noPo" = $${params.length} `;
      }
      if (noPoList && noPoList.length > 0) {
        params.push(noPoList);
        whereSql += whereSql
          ? ` AND po."noPo" = ANY($${params.length}::text[]) `
          : ` WHERE po."noPo" = ANY($${params.length}::text[]) `;
      }
      if (!includeUnknown) {
        whereSql += whereSql
          ? ` AND po."unitProduksiId" <> 'UNKNOWN'
              AND COALESCE(po."tujuanDetail", '') NOT IN ('', '-', 'Unknown')
              AND COALESCE(rm."namaPt", '') NOT IN ('', '-', 'Unknown') `
          : ` WHERE po."unitProduksiId" <> 'UNKNOWN'
              AND COALESCE(po."tujuanDetail", '') NOT IN ('', '-', 'Unknown')
              AND COALESCE(rm."namaPt", '') NOT IN ('', '-', 'Unknown') `;
      }
      const sql = `
        SELECT
          po.id,
          po."noPo",
          po."createdAt",
          po."updatedAt",
          po."tglPo",
          po."expiredTgl",
          po."linkPo",
          po."noInvoice",
          po."tujuanDetail",
          po."regional",
          po."statusKirim",
          po."statusSdif",
          po."statusPo",
          po."statusFp",
          po."statusKwi",
          po."statusInv",
          po."statusTagih",
          po."statusBayar",
          json_build_object('namaPt', rm."namaPt", 'inisial', rm."inisial") AS "RitelModern",
          json_build_object('siteArea', up."siteArea", 'namaRegional', up."namaRegional") AS "UnitProduksi",
          COALESCE((
            SELECT json_agg(json_build_object(
              'pcs', i."pcs",
              'pcsKirim', i."pcsKirim",
              'hargaKg', i."hargaKg",
              'hargaPcs', i."hargaPcs",
              'nominal', i."nominal",
              'rpTagih', i."rpTagih",
              'Product', json_build_object('name', p."name", 'satuanKg', p."satuanKg")
            ))
            FROM "PurchaseOrderItem" i
            JOIN "Product" p ON p.id = i."productId"
            WHERE i."purchaseOrderId" = po.id
          ), '[]'::json) AS "Items"
        FROM "PurchaseOrder" po
        JOIN "ritel_modern" rm ON rm.id = po."ritelId"
        LEFT JOIN "UnitProduksi" up ON up."idRegional" = po."unitProduksiId"
        ${whereSql}
        ORDER BY po."createdAt" DESC
      `;
      const data = await prisma.$queryRawUnsafe(sql, ...params);
      return NextResponse.json(data);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    const noPo = body?.noPo as string | undefined;
    if (!id && !noPo) {
      return NextResponse.json(
        { error: "id atau noPo wajib disertakan" },
        { status: 400 },
      );
    }
    const po = id
      ? await prisma.purchaseOrder.findUnique({ where: { id } })
      : await prisma.purchaseOrder.findUnique({ where: { noPo: noPo! } });
    if (!po) {
      return NextResponse.json(
        { error: "PO tidak ditemukan" },
        { status: 404 },
      );
    }
    await prisma.$transaction(async (tx: any) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });
      await tx.purchaseOrder.delete({ where: { id: po.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
