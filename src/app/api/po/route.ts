import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { cacheClearPrefix, cacheGet, cacheSet, invalidatePoCache } from "@/lib/ttl-cache";
import { POBodySchema } from "@/lib/schemas/po";
import { hasPermission } from "@/lib/accessControl";
import { resolvePoScope } from "@/lib/resolvePoScope";
import { buildPOQueryParams } from "./services/poQueryBuilder";
import { attachSummary } from "./services/poSummaryHelper";
import { createOrUpdatePurchaseOrder, isPoEditIntent } from "./services/poTransactionService";

const DEFAULT_MAX_UNPAGED_LIMIT = 1000;

const summarySelect = {
  id: true,
  noPo: true,
  createdAt: true,
  tglPo: true,
  expiredTgl: true,
  linkPo: true,
  noInvoice: true,
  noFaktur: true,
  tujuanDetail: true,
  regional: true,
  statusCreditLimit: true,
  remarksCreditLimit: true,
  isNotaDinas: true,
  noNd: true,
  linkNd: true,
  kodeVendor: true,
  remarks: true,
  buktiTagih: true,
  buktiBayar: true,
  buktiKirim: true,
  buktiFp: true,
  tglkirim: true,
  namaSupir: true,
  platNomor: true,
  RitelModern: { select: { namaPt: true, inisial: true } },
  UnitProduksi: {
    select: { siteArea: true, namaRegional: true, managerOperasional: true },
  },
  CreditLimitBatch: {
    select: { batchCode: true, status: true, seqNumber: true },
  },
};

const getDetailSelect = (includeItems: boolean) => ({
  id: true,
  noPo: true,
  createdAt: true,
  updatedAt: true,
  tglPo: true,
  expiredTgl: true,
  linkPo: true,
  noInvoice: true,
  noFaktur: true,
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
  statusCreditLimit: true,
  remarksCreditLimit: true,
  isNotaDinas: true,
  noNd: true,
  linkNd: true,
  kodeVendor: true,
  tglkirim: true,
  remarks: true,
  buktiTagih: true,
  buktiBayar: true,
  buktiKirim: true,
  buktiFp: true,
  namaSupir: true,
  platNomor: true,
  ...(includeItems
    ? {
        Items: {
          select: {
            id: true,
            pcs: true,
            pcsKirim: true,
            hargaKg: true,
            hargaPcs: true,
            nominal: true,
            rpTagih: true,
            discount: true,
            Product: { select: { id: true, name: true, satuanKg: true } },
          },
        },
      }
    : {}),
  RitelModern: {
    select: { id: true, namaPt: true, inisial: true, tujuan: true },
  },
  UnitProduksi: {
    select: {
      idRegional: true,
      namaRegional: true,
      siteArea: true,
      alamat: true,
      managerOperasional: true,
    },
  },
  CreditLimitBatch: {
    select: { batchCode: true, status: true, seqNumber: true },
  },
});

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;
    const raw = await request.json();
    const parsed = POBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Payload tidak valid: " +
            parsed.error.issues
              .map((i) => i.path.join(".") + " " + i.message)
              .join(", "),
        },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const isEdit = isPoEditIntent(body);
    const requiredPermission = isEdit ? "po_edit" : "po_create";
    const allowed = await hasPermission(safeRole, requiredPermission);
    if (!allowed) {
      return NextResponse.json(
        { error: `Forbidden: Akun Anda tidak memiliki izin ${isEdit ? "mengubah" : "membuat"} PO (${requiredPermission})` },
        { status: 403 }
      );
    }
    const { company, noPo, tglPo, expiredTgl, tujuan, items } = body ?? {};

    if (
      !company ||
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
            "company, noPo, tglPo, expiredTgl, tujuan, dan items wajib diisi",
        },
        { status: 400 },
      );
    }

    const updatedPO = await createOrUpdatePurchaseOrder(body as any, auth);

    invalidatePoCache();
    return NextResponse.json(updatedPO, { status: 201 });
  } catch (error: any) {
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    const status =
      error?.statusCode === 404 || msg.includes("tidak ditemukan")
        ? 404
        : error?.statusCode === 409 ||
          msg.includes("telah diubah oleh pengguna lain") ||
          msg.includes("sudah terdaftar") ||
          msg.includes("Versi data")
          ? 409
          : error?.statusCode === 403 || msg.includes("Forbidden")
            ? 403
            : 500;
    return NextResponse.json({ error: msg || "Server error" }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const {
      where,
      orderBy,
      take,
      skip,
      paged,
      summary,
      includeItems,
      cacheKey,
      totalCacheKey,
      approxTotal,
    } = buildPOQueryParams(searchParams, { ...auth, resolvedPoScope: await resolvePoScope(auth) });

    const cached = cacheGet<any>(cacheKey);
    const cachedTotal = cacheGet<number>(totalCacheKey);

    const select = summary ? summarySelect : getDetailSelect(includeItems);

    if (!paged) {
      if (cached) return NextResponse.json(cached);
      const data = await prisma.purchaseOrder.findMany({
        where,
        select: select as any,
        orderBy,
        take: DEFAULT_MAX_UNPAGED_LIMIT,
      });
      const payload = summary ? await attachSummary(data as any) : data;
      cacheSet(cacheKey, payload, 15000);
      return NextResponse.json(payload);
    }

    if (cached) return NextResponse.json(cached);

    const total =
      cachedTotal ??
      (typeof approxTotal === "number" ? approxTotal : undefined) ??
      (await prisma.purchaseOrder.count({ where }));

    const data = await prisma.purchaseOrder.findMany({
      where,
      select: select as any,
      orderBy,
      take,
      skip,
    });

    const payload = {
      total,
      data: summary ? await attachSummary(data as any) : data,
      limit: take,
      offset: skip,
    };

    cacheSet(totalCacheKey, total, 30000);
    cacheSet(cacheKey, payload, 15000);
    return NextResponse.json(payload);
  } catch (error) {
    const cached = cacheGet<any>(
      `po:${new URL(request.url).searchParams.toString()}`,
    );
    if (cached) return NextResponse.json(cached);
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const deletionAuth = await getSessionWithRole(request);
    if (!deletionAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((deletionAuth.safeRole || deletionAuth.role) !== "pusat") return NextResponse.json({ error: "Hanya Pusat yang boleh menghapus data" }, { status: 403 });

    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;

    const allowed = await hasPermission(safeRole, "po_delete");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin menghapus PO (po_delete)" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || undefined;
    const noPo = searchParams.get("noPo") || undefined;
    if (!id && !noPo) {
      return NextResponse.json(
        { error: "id atau noPo wajib disertakan sebagai query param" },
        { status: 400 },
      );
    }

    const po = id
      ? await prisma.purchaseOrder.findUnique({
          where: { id },
          select: { id: true },
        })
      : await prisma.purchaseOrder.findUnique({
          where: { noPo: noPo! },
          select: { id: true },
        });

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

    invalidatePoCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
