import db from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionWithRole, canonicalizeRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import {
  cacheClearPrefix,
  cacheGet,
  cacheSet,
  singleFlight,
} from "@/lib/ttl-cache";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { UnitProduksiCreateSchema, UnitProduksiPatchSchema } from "@/lib/schemas/master-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const safeRole = auth.safeRole || auth.role;
    const canView =
      (await hasPermission(safeRole, "m_unit_view")) ||
      (await hasPermission(safeRole, "po_create")) ||
      (await hasPermission(safeRole, "po_edit")) ||
      (await hasPermission(safeRole, "po_view")) ||
      (await hasPermission(safeRole, "retur_create")) ||
      (await hasPermission(safeRole, "retur_edit")) ||
      (await hasPermission(safeRole, "retur_view")) ||
      (await hasPermission(safeRole, "assign_action")) ||
      (await hasPermission(safeRole, "assign_view"));

    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat data unit produksi." },
        { status: 403 },
      );
    }

    const cacheKey = "unit_produksi:list";
    const cached = cacheGet<any>(cacheKey);
    const data = await singleFlight(cacheKey, () =>
      db.unitProduksi.findMany({
        select: {
          idRegional: true,
          namaRegional: true,
          siteArea: true,
          alamat: true,
          managerOperasional: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          NOT: {
            OR: [
              { idRegional: "UNKNOWN" },
              { namaRegional: { equals: "Unknown", mode: "insensitive" } },
              { siteArea: { equals: "UNKNOWN", mode: "insensitive" } },
              { siteArea: { equals: "site area belum ada unit produksi", mode: "insensitive" } },
              { siteArea: { equals: "belum ada", mode: "insensitive" } },
            ],
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    );
    cacheSet(cacheKey, data, 15000);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/unit-produksi error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;

    const body = await req.json().catch(() => ({}));

    // ── Dedicated Action: Reset Password Akun PIC ──
    const { searchParams } = new URL(req.url);
    const isResetPasswordAction =
      body?.action === "reset_password" || searchParams.get("action") === "reset_password";

    if (isResetPasswordAction) {
      const canEdit =
        (await hasPermission(safeRole, "m_unit_edit")) || safeRole === "pusat";
      if (!canEdit) {
        return NextResponse.json(
          { error: "Forbidden: Anda tidak memiliki izin untuk mereset password akun PIC." },
          { status: 403 },
        );
      }

      const targetEmail = String(body?.email || "").trim().toLowerCase();
      if (!targetEmail) {
        return NextResponse.json(
          { error: "Email akun PIC wajib disertakan." },
          { status: 400 },
        );
      }

      const existingUser = await db.user.findFirst({ where: { email: targetEmail } });
      if (!existingUser) {
        return NextResponse.json(
          { error: `Akun pengguna "${targetEmail}" tidak ditemukan di database.` },
          { status: 404 },
        );
      }

      const targetRole = canonicalizeRole(existingUser.role);
      if (targetRole !== "sitearea") {
        return NextResponse.json(
          {
            error:
              "Forbidden: Hanya akun PIC Cabang (sitearea) yang dapat direset melalui menu Unit Produksi. Akun pusat atau role lainnya tidak diizinkan.",
          },
          { status: 403 },
        );
      }

      if (!existingUser.siteArea) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Akun PIC target tidak memiliki unit produksi (siteArea) yang terdaftar.",
          },
          { status: 403 },
        );
      }

      const linkedUnit = await db.unitProduksi.findFirst({
        where: {
          siteArea: { equals: existingUser.siteArea, mode: "insensitive" },
        },
      });

      if (!linkedUnit) {
        return NextResponse.json(
          {
            error: `Forbidden: Unit produksi "${existingUser.siteArea}" tidak ditemukan di database.`,
          },
          { status: 403 },
        );
      }

      const newPlainPassword =
        body?.newPassword && String(body.newPassword).trim() !== ""
          ? String(body.newPassword).trim()
          : "";

      if (!newPlainPassword || newPlainPassword.length < 6) {
        return NextResponse.json(
          { error: "Password baru wajib diisi dan minimal 6 karakter." },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPlainPassword, 12);

      // Atomic transaction: update password & audit log
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            updatedAt: new Date(),
          } as any,
        });

        await tx.auditLog.create({
          data: {
            entity: "User",
            entityId: existingUser.id,
            action: "RESET_PASSWORD",
            newData: {
              targetEmail: existingUser.email,
              targetRole: existingUser.role,
              siteArea: existingUser.siteArea,
              resetBy: auth.email,
            },
            userId: auth.dbUser?.id || auth.email,
            userName: auth.email,
            userRole: safeRole,
          },
        });
      });

      return NextResponse.json({
        ok: true,
        message: `Password akun PIC "${targetEmail}" berhasil direset.`,
      });
    }

    // ── Regular Action: Tambah Unit Produksi Baru ──
    const canAdd = await hasPermission(safeRole, "m_unit_add");
    if (!canAdd) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menambah unit produksi." },
        { status: 403 },
      );
    }

    const parsed = UnitProduksiCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    let { regional, siteArea } = parsed.data;
    const { alamat, managerOperasional } = parsed.data;

    // Normalisasi regional
    const v = String(regional).trim().toLowerCase();
    if (v.includes("bandung") || v.includes("reg 1") || /\b1\b/.test(v)) {
      regional = "REG 1 BANDUNG";
    } else if (v.includes("surabaya") || v.includes("reg 2") || /\b2\b/.test(v)) {
      regional = "REG 2 SURABAYA";
    } else if (v.includes("makassar") || v.includes("reg 3") || /\b3\b/.test(v)) {
      regional = "REG 3 MAKASSAR";
    } else {
      regional = String(regional).trim();
    }
    siteArea = String(siteArea).trim();

    // 1. Pembuatan Unit Produksi
    const newUnit = await db.unitProduksi.create({
      data: {
        namaRegional: regional,
        siteArea: siteArea,
        alamat: alamat || "",
        managerOperasional: managerOperasional || "",
        updatedAt: new Date(),
      },
    });

    // 2. Provisioning Akun PIC Cabang (Non-Destruktif: tidak menimpa password yang sudah ada)
    try {
      const rawSiteArea = siteArea || "";
      const formattedAlias = rawSiteArea.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (formattedAlias) {
        const picEmail = `${formattedAlias}@bulog.co.id`;
        const existingPic = await db.user.findFirst({ where: { email: picEmail } });

        if (!existingPic) {
          // Akun belum ada: buat baru dengan default password
          const defaultPassword = process.env.DEFAULT_PIC_PASSWORD || "bulog123";
          const hashedPassword = await bcrypt.hash(defaultPassword, 12);

          // Supabase Auth provisioning jika terkonfigurasi
          try {
            await supabaseAdmin.auth.admin.createUser({
              email: picEmail,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: { role: "sitearea", regional, siteArea },
            });
          } catch {}

          await db.user.create({
            data: {
              email: picEmail,
              role: "sitearea",
              regional,
              siteArea,
              password: hashedPassword,
            } as any,
          });
        } else {
          // Akun sudah ada: HANYA perbarui metadata jika memang akun tersebut bertipe sitearea
          const existingRole = canonicalizeRole(existingPic.role);
          if (existingRole === "sitearea") {
            await db.user.update({
              where: { id: existingPic.id },
              data: {
                regional,
                siteArea,
              } as any,
            });
          } else {
            console.warn(
              `[PROVISION] Akun ${picEmail} sudah ada dengan role "${existingPic.role}". Tidak mengubah role akun ke sitearea.`,
            );
          }
        }
      }
    } catch (provisionErr) {
      console.error("PIC Account provisioning error (non-fatal):", provisionErr);
    }

    cacheClearPrefix("unit_produksi:");
    return NextResponse.json(newUnit);
  } catch (error) {
    const code = (error as any)?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { status: "duplicate_ignored" },
        { status: 201 },
      );
    }
    console.error("POST /api/unit-produksi error:", error);
    let msg = "Gagal simpan data";
    if ((error as any)?.message) msg = String((error as any).message);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;

    const canEdit = await hasPermission(safeRole, "m_unit_edit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin mengubah data unit produksi." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = UnitProduksiPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const {
      namaRegional,
      siteArea,
      newRegionalName,
      newSiteArea,
      alamat,
      managerOperasional,
    } = parsed.data;

    const updatedRegional = newRegionalName ? String(newRegionalName).trim() : namaRegional;
    const updatedSiteArea = newSiteArea ? String(newSiteArea).trim() : siteArea;

    await db.unitProduksi.updateMany({
      where: { namaRegional, siteArea },
      data: {
        namaRegional: updatedRegional,
        siteArea: updatedSiteArea,
        alamat: alamat !== undefined ? String(alamat).trim() : undefined,
        managerOperasional: managerOperasional !== undefined ? String(managerOperasional).trim() : undefined,
        updatedAt: new Date(),
      },
    });

    // Update metadata wilayah akun terkait jika siteArea atau regional berubah (tanpa sentuh password)
    try {
      const oldAlias = siteArea.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (oldAlias) {
        const oldEmail = `${oldAlias}@bulog.co.id`;
        const picUser = await db.user.findFirst({ where: { email: oldEmail } });
        if (picUser) {
          await db.user.update({
            where: { id: picUser.id },
            data: {
              regional: updatedRegional,
              siteArea: updatedSiteArea,
            } as any,
          });
        }
      }
    } catch (picErr) {
      console.warn("Sync PIC metadata on unit patch failed (non-fatal):", picErr);
    }

    cacheClearPrefix("unit_produksi:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/unit-produksi error:", error);
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const deletionAuth = await getSessionWithRole(req);
    if (!deletionAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((deletionAuth.safeRole || deletionAuth.role) !== "pusat") return NextResponse.json({ error: "Hanya Pusat yang boleh menghapus data" }, { status: 403 });

    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const safeRole = auth.safeRole || auth.role;

    const canDelete = await hasPermission(safeRole, "m_unit_delete");
    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menghapus data unit produksi." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const namaRegional = searchParams.get("namaRegional") || undefined;
    const siteArea = searchParams.get("siteArea") || undefined;
    if (!namaRegional && !siteArea) {
      return NextResponse.json(
        { error: "Minimal sertakan namaRegional atau siteArea sebagai query param" },
        { status: 400 },
      );
    }

    if (siteArea) {
      await db.unitProduksi.deleteMany({
        where: {
          AND: [namaRegional ? { namaRegional } : {}, { siteArea }] as any,
        },
      });
      cacheClearPrefix("unit_produksi:");
      return NextResponse.json({ ok: true });
    }

    try {
      await db.unitProduksi.deleteMany({
        where: { namaRegional: namaRegional! },
      });
      cacheClearPrefix("unit_produksi:");
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      if (e?.code === "P2003") {
        return NextResponse.json(
          { error: "Tidak bisa hapus: regional ini terpakai pada PO" },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("DELETE /api/unit-produksi error:", error);
    const msg =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
