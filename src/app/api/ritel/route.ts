import { NextResponse } from "next/server";
import { getSession, getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { randomUUID } from "crypto";
import { RitelCreateSchema, RitelPatchSchema } from "@/lib/schemas/master-data";
import {
  cacheGet,
  cacheSet,
  cacheClearPrefix,
  singleFlight,
  invalidatePoCache,
} from "@/lib/ttl-cache";
import { getErrorMessage } from "@/lib/utils/error";



export async function GET(request: Request) {
  const cacheKey = `ritel:${request.url}`;
  const cached = cacheGet<any>(cacheKey);
  try {
    const payload = await singleFlight(cacheKey, async () => {
      const { default: prisma } = await import("@/lib/db");
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
        ? {
            OR: [
              { namaPt: { contains: q, mode: "insensitive" as const } },
              { inisial: { contains: q, mode: "insensitive" as const } },
              { tujuan: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined;

      const [total, data] = paged
        ? await prisma.$transaction([
            prisma.ritelModern.count({ where }),
            prisma.ritelModern.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: limit ?? 50,
              skip: offset ?? 0,
            }),
          ])
        : [
            null,
            await prisma.ritelModern.findMany({
              take: 5000,
              where,
              orderBy: { createdAt: "desc" },
            }),
          ];

      const out = paged
        ? {
            total: total ?? (Array.isArray(data) ? data.length : 0),
            data,
            limit: limit ?? 50,
            offset: offset ?? 0,
          }
        : data;
      cacheSet(cacheKey, out, 15000);
      return out;
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (cached) return NextResponse.json(cached);
    console.error("GET /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeInisial(val?: string | null): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "" || s === "—" || s === "-") return null;
  return s;
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await hasPermission(auth.role, "m_ritel_add");
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menambah ritel modern (m_ritel_add)" },
        { status: 403 }
      );
    }
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const parsed = RitelCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { namaPt, inisial, tujuan, provinsi, logoPt, logoInisial } = parsed.data;
    const cleanNamaPt = namaPt.trim();
    const normInisial = normalizeInisial(inisial);

    const result = await prisma.$transaction(async (tx) => {
      // Advisory lock pada database level untuk mencegah race condition concurrent POST
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || lower(trim(${cleanNamaPt}))))`;

      const existing = await tx.ritelModern.findFirst({
        where: {
          namaPt: { equals: cleanNamaPt, mode: "insensitive" },
          inisial: normInisial
            ? { equals: normInisial, mode: "insensitive" }
            : null,
        },
      });
      if (existing) {
        throw new Error(`DUPLICATE: Ritel Modern dengan PT "${cleanNamaPt}" dan inisial "${normInisial || "-"}" sudah ada`);
      }

      return await tx.ritelModern.create({
        data: {
          id: randomUUID(),
          namaPt: cleanNamaPt,
          inisial: normInisial,
          tujuan: tujuan ?? null,
          provinsi: provinsi ?? null,
          logoPt: logoPt ?? null,
          logoInisial: logoInisial ?? null,
          updatedAt: new Date(),
        },
      });
    });

    cacheClearPrefix("ritel:");
    invalidatePoCache();
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/ritel error:", error);
    const message = getErrorMessage(error);
    const status = message.includes("DUPLICATE:") ? 409 : 500;
    return NextResponse.json(
      { error: message.replace(/^DUPLICATE:\s*/, "") },
      { status }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await hasPermission(auth.role, "m_ritel_edit");
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengubah ritel modern (m_ritel_edit)" },
        { status: 403 }
      );
    }
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const parsed = RitelPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const { id, namaPt, newNamaPt, inisial, newInisial, provinsi, logoPt, logoInisial } = parsed.data;
    let originalNamaPt = namaPt;

    // Fallback: If originalNamaPt is missing but id is provided, lookup namaPt from database
    if (!originalNamaPt && id) {
      const existing = await prisma.ritelModern.findUnique({ where: { id } });
      if (existing) {
        originalNamaPt = existing.namaPt;
      }
    }

    if (!originalNamaPt) {
      return NextResponse.json({ error: "namaPt wajib diisi" }, { status: 400 });
    }

    const cleanOriginalPt = originalNamaPt.trim();
    const finalNamaPt = (newNamaPt && newNamaPt.trim() ? newNamaPt.trim() : cleanOriginalPt);

    // Wajibkan identitas target (id atau inisial asal) saat memperbarui inisial/detail
    if ((newInisial !== undefined || logoInisial !== undefined || provinsi !== undefined) && !id && inisial === undefined) {
      return NextResponse.json(
        { error: "id atau inisial asal wajib disertakan saat mengubah inisial/detail" },
        { status: 400 }
      );
    }

    // Atomic transaction with advisory lock & comprehensive collision validation
    await prisma.$transaction(async (tx) => {
      // 1. Database-level advisory lock on affected companies in consistent alphabetical order to prevent deadlock
      const lockKeys = Array.from(
        new Set([cleanOriginalPt.toLowerCase(), finalNamaPt.toLowerCase()])
      ).sort();
      for (const k of lockKeys) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ritel:' || ${k}))`;
      }

      // 2. Fetch all current records for original company
      const currentRows = await tx.ritelModern.findMany({
        where: { namaPt: { equals: cleanOriginalPt, mode: "insensitive" } },
      });

      if (currentRows.length === 0) {
        throw new Error("Ritel Modern tidak ditemukan untuk diperbarui");
      }

      // Tentukan target rows dan source inisial
      let sourceInisial: string | null | undefined = inisial !== undefined ? normalizeInisial(inisial) : undefined;
      const targetRowIds = new Set<string>();

      if (sourceInisial !== undefined) {
        for (const r of currentRows) {
          if (normalizeInisial(r.inisial)?.toLowerCase() === (sourceInisial?.toLowerCase() ?? null)) {
            targetRowIds.add(r.id);
          }
        }
        if (targetRowIds.size === 0 && !id) {
          throw new Error(`MISMATCH: Inisial asal "${sourceInisial || "-"}" tidak ditemukan pada "${cleanOriginalPt}"`);
        }
      }

      if (id) {
        const found = currentRows.find((r) => r.id === id);
        if (!found) {
          throw new Error(`MISMATCH: ID "${id}" tidak terdaftar sebagai bagian dari "${cleanOriginalPt}"`);
        }
        if (sourceInisial === undefined) {
          sourceInisial = normalizeInisial(found.inisial);
          for (const r of currentRows) {
            if (normalizeInisial(r.inisial)?.toLowerCase() === (sourceInisial?.toLowerCase() ?? null)) {
              targetRowIds.add(r.id);
            }
          }
        }
        targetRowIds.add(id);
      }

      // Cek apakah ada perubahan identitas sesungguhnya
      const isPtRenamed = newNamaPt !== undefined && newNamaPt.trim().toLowerCase() !== cleanOriginalPt.toLowerCase();
      const normNewInisial = newInisial !== undefined ? normalizeInisial(newInisial) : undefined;
      const isInisialRenamed = normNewInisial !== undefined && 
        (normNewInisial?.toLowerCase() ?? null) !== (sourceInisial?.toLowerCase() ?? null);

      // 3. Validasi benturan identitas HANYA jika ada rename identitas
      if (isInisialRenamed) {
        const internalCollision = currentRows.some((r) => {
          if (targetRowIds.has(r.id)) return false;
          return normalizeInisial(r.inisial)?.toLowerCase() === (normNewInisial?.toLowerCase() ?? null);
        });
        if (internalCollision) {
          throw new Error(`DUPLICATE: Ritel Modern "${finalNamaPt}" dengan inisial "${normNewInisial || "-"}" sudah ada`);
        }
      }

      if (isPtRenamed) {
        const otherTargetRows = await tx.ritelModern.findMany({
          where: {
            namaPt: { equals: finalNamaPt, mode: "insensitive" },
            id: { notIn: currentRows.map((r) => r.id) },
          },
        });

        if (otherTargetRows.length > 0) {
          const otherInisialSet = new Set(
            otherTargetRows.map((r) => normalizeInisial(r.inisial)?.toLowerCase() ?? "__NULL__")
          );

          for (const r of currentRows) {
            const isTarget = targetRowIds.has(r.id);
            const resIni = isTarget && isInisialRenamed ? normNewInisial : normalizeInisial(r.inisial);
            const key = resIni ? resIni.toLowerCase() : "__NULL__";
            if (otherInisialSet.has(key)) {
              throw new Error(`DUPLICATE: Rename/penggabungan ke "${finalNamaPt}" dengan inisial "${resIni || "-"}" bentrok dengan data yang sudah ada`);
            }
          }
        }
      }

      // 4. Update Level Perusahaan: namaPt & logoPt (berlaku ke seluruh baris perusahaan)
      const shouldUpdatePt = (newNamaPt !== undefined && newNamaPt.trim() !== cleanOriginalPt) || logoPt !== undefined;
      if (shouldUpdatePt) {
        const updateData: any = { updatedAt: new Date() };
        if (newNamaPt !== undefined && newNamaPt.trim() !== cleanOriginalPt) {
          updateData.namaPt = finalNamaPt;
        }
        if (logoPt !== undefined) {
          updateData.logoPt = logoPt ? logoPt.trim() : null;
        }

        await tx.ritelModern.updateMany({
          where: { namaPt: { equals: cleanOriginalPt, mode: "insensitive" } },
          data: updateData,
        });
      }

      // 5. Update Level Inisial: inisial, logoInisial & provinsi untuk targetRowIds
      const shouldUpdateInisial = targetRowIds.size > 0 && (
        isInisialRenamed ||
        logoInisial !== undefined ||
        provinsi !== undefined
      );

      if (shouldUpdateInisial) {
        const updateData: any = { updatedAt: new Date() };
        if (isInisialRenamed) {
          updateData.inisial = normNewInisial;
        }
        if (logoInisial !== undefined) {
          updateData.logoInisial = logoInisial ? logoInisial.trim() : null;
        }
        if (provinsi !== undefined) {
          updateData.provinsi = provinsi ? provinsi.trim() : null;
        }

        await tx.ritelModern.updateMany({
          where: { id: { in: Array.from(targetRowIds) } },
          data: updateData,
        });
      }
    });

    cacheClearPrefix("ritel:");
    invalidatePoCache();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("PATCH /api/ritel error:", error);
    const message = getErrorMessage(error);
    const status = message.includes("DUPLICATE:") ? 409 : message.includes("MISMATCH:") ? 400 : 500;
    return NextResponse.json(
      { error: message.replace(/^(DUPLICATE|MISMATCH):\s*/, "") },
      { status }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await hasPermission(auth.role, "m_ritel_edit");
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengubah ritel modern (m_ritel_edit)" },
        { status: 403 }
      );
    }
    const { default: prisma } = await import("@/lib/db");
    const body = await request.json();
    const { id, tujuan } = body as { id?: string; tujuan?: string };
    if (!id || !tujuan) {
      return NextResponse.json(
        { error: "id dan tujuan wajib diisi" },
        { status: 400 },
      );
    }
    await prisma.ritelModern.update({
      where: { id },
      data: { tujuan: String(tujuan).trim(), updatedAt: new Date() },
    });
    cacheClearPrefix("ritel:");
    invalidatePoCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// [REST] DELETE extracts identifiers from URL searchParams, not request body
export async function DELETE(request: Request) {
  try {
    const deletionAuth = await getSessionWithRole(request);
    if (!deletionAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((deletionAuth.safeRole || deletionAuth.role) !== "pusat") return NextResponse.json({ error: "Hanya Pusat yang boleh menghapus data" }, { status: 403 });

    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await hasPermission(auth.role, "m_ritel_delete");
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menghapus ritel modern (m_ritel_delete)" },
        { status: 403 }
      );
    }
    const { default: prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const namaPt = searchParams.get("namaPt") || undefined;
    const id = searchParams.get("id") || undefined;
    const inisial = searchParams.get("inisial");
    if (!namaPt && !id) {
      return NextResponse.json(
        { error: "namaPt atau id wajib disertakan sebagai query param" },
        { status: 400 },
      );
    }
    if (id) {
      await prisma.ritelModern.delete({ where: { id } });
      cacheClearPrefix("ritel:");
      invalidatePoCache();
      return NextResponse.json({ ok: true });
    }
    
    const whereClause: any = { namaPt: { equals: namaPt!, mode: "insensitive" } };
    if (inisial !== null) {
      const normInisial = normalizeInisial(inisial);
      whereClause.inisial = normInisial ? { equals: normInisial, mode: "insensitive" } : null;
    }
    
    await prisma.ritelModern.deleteMany({
      where: whereClause,
    });
    cacheClearPrefix("ritel:");
    invalidatePoCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ritel error:", error);
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
