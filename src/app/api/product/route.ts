import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { canonicalProductName, dedupeKey } from "@/lib/text";
import { ProductCreateSchema, ProductUpdateSchema } from "@/lib/schemas/master-data";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canView =
      (await hasPermission(safeRole, "m_prod_view")) ||
      (await hasPermission(safeRole, "po_create")) ||
      (await hasPermission(safeRole, "po_edit")) ||
      (await hasPermission(safeRole, "po_view")) ||
      (await hasPermission(safeRole, "retur_create")) ||
      (await hasPermission(safeRole, "retur_edit")) ||
      (await hasPermission(safeRole, "retur_view"));

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat data produk." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit =
      limitRaw == null
        ? null
        : Math.max(1, Math.min(5000, Number(limitRaw) || 0));
    const offset =
      offsetRaw == null ? null : Math.max(0, Number(offsetRaw) || 0);
    const paged = limit != null || offset != null;
    const q = (searchParams.get("q") || "").trim();
    const where = q
      ? { name: { contains: q, mode: "insensitive" as const } }
      : undefined;

    if (!paged) {
      const data = await prisma.product.findMany({
        take: 5000,
        where,
        select: {
          id: true,
          name: true,
          satuanKg: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(data || []);
    }

    const take = limit ?? 50;
    const skip = offset ?? 0;
    const [total, data] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          satuanKg: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
    ]);
    return NextResponse.json({ total, data, limit: take, offset: skip });
  } catch (error) {
    console.error("GET /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canCreate = await hasPermission(safeRole, "m_prod_add");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin menambah produk (m_prod_add)." }, { status: 403 });
    }
    const body = await request.json();
    const parsed = ProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const nameRaw = parsed.data.name;
    const satuanKg = parsed.data.satuanKg ?? undefined;
    const name = canonicalProductName(nameRaw);
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama produk wajib diisi" },
        { status: 400 },
      );
    }
    const key = dedupeKey(name);
    const token = name.split(/\s+/).filter(Boolean)[0] || name;
    const candidates = await prisma.product.findMany({
      where: { name: { contains: token, mode: "insensitive" } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const firstDup =
      candidates.find((p) => dedupeKey(canonicalProductName(p.name)) === key) ||
      null;
    if (firstDup && String(firstDup.name) !== name) {
      return NextResponse.json(
        { error: `Produk sudah ada: ${String(firstDup.name)}` },
        { status: 409 },
      );
    }
    const result = await prisma.product.upsert({
      where: { name },
      update: {
        name,
        ...(Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        name,
        ...(Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
export async function PUT(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canEdit = await hasPermission(safeRole, "m_prod_edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin mengubah produk (m_prod_edit)." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const { id, name: nameRaw, satuanKg } = parsed.data;
    const name = nameRaw ? canonicalProductName(nameRaw) : undefined;

    if (name && name.trim()) {
      const key = dedupeKey(name);
      const token = name.split(/\s+/).filter(Boolean)[0] || name;
      const candidates = await prisma.product.findMany({
        where: { name: { contains: token, mode: "insensitive" } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      const firstDup =
        candidates.find(
          (p) => dedupeKey(canonicalProductName(p.name)) === key,
        ) || null;
      if (firstDup && String(firstDup.id) !== String(id || "")) {
        return NextResponse.json(
          { error: `Produk sudah ada: ${String(firstDup.name)}` },
          { status: 409 },
        );
      }
    }
    const where: any = id ? { id } : { name: name as string };
    const updated = await prisma.product.update({
      where,
      data: {
        ...(name ? { name } : {}),
        ...(satuanKg !== undefined && Number.isFinite(satuanKg as number)
          ? { satuanKg: satuanKg as number }
          : {}),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

// [REST] DELETE reads id from URL searchParams, not body
export async function DELETE(request: Request) {
  try {
    const deletionAuth = await getSessionWithRole(request);
    if (!deletionAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((deletionAuth.safeRole || deletionAuth.role) !== "pusat") return NextResponse.json({ error: "Hanya Pusat yang boleh menghapus data" }, { status: 403 });

    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;
    const canDelete = await hasPermission(safeRole, "m_prod_delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin menghapus produk (m_prod_delete)." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || undefined;
    if (!id) {
      return NextResponse.json(
        { error: "ID produk wajib disertakan sebagai query param" },
        { status: 400 },
      );
    }
    const used = await prisma.purchaseOrderItem.count({
      where: { productId: id },
    });
    if (used > 0) {
      return NextResponse.json(
        { error: `Produk dipakai di ${used} item PO` },
        { status: 400 },
      );
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/product error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

