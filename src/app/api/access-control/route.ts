import { applyCreditLimitAccessRules } from "@/lib/roleAccessPolicy";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { auditActivity } from "@/lib/audit";
import { DEFAULT_ROLE_CONFIGS } from "@/app/access-control/constants/accessControlData";
import { 
  readPermissionsConfig, 
  readPermissionsConfigWithVersion,
  writePermissionsConfig, 
  updateMemoryPermissionsCache,
  getValidatedBootstrapConfig,
  hasPermission,
  validatePermissionsStructure 
} from "@/lib/accessControl";

export async function GET(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { config, version } = await readPermissionsConfigWithVersion();
    if (!config) return NextResponse.json({ error: "Konfigurasi akses tidak tersedia" }, { status: 503 });
    const role = auth.safeRole || auth.role;
    const data = role === "pusat" ? config : { [role]: config[role] || { enabledMenus: [], enabledActions: [] } };
    return NextResponse.json({ ok: true, data, version });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Konfigurasi akses tidak tersedia" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const safeRole = auth.safeRole || auth.role;
    // Only pusat can update permissions
    if (safeRole !== "pusat") {
      return NextResponse.json(
        { error: "Hanya akun dengan peran Pusat yang dapat mengubah hak akses sistem." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Wajibkan expectedVersion (angka >= 0) dari klien untuk kontrol konkurensi (optimistic locking)
    if (body.expectedVersion === undefined || typeof body.expectedVersion !== "number" || isNaN(body.expectedVersion) || body.expectedVersion < 0) {
      return NextResponse.json(
        { error: "Parameter expectedVersion (angka >= 0) wajib disertakan untuk kontrol konkurensi (optimistic locking)." },
        { status: 400 }
      );
    }

    let txRes: { nextVersion: number; nextConfig: Record<string, { enabledMenus: string[]; enabledActions: string[] }>; successMessage: string };
    try {
      txRes = await prisma.$transaction(async (tx) => {
        // 1. Kunci transaksi eksklusif menggunakan PostgreSQL transaction advisory lock
        // Menyerialkan seluruh mutasi hak akses sehingga tidak ada race condition pembacaan/penulisan bersamaan
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(84729103);`;

        // 2. Baca snapshot audit terkini langsung di dalam transaksi terkunci
        const latestAudit = await tx.auditLog.findFirst({
          where: {
            entity: "AccessControl",
            entityId: "role-permissions",
            action: { in: ["UPDATE", "RESET"] },
          },
          orderBy: { createdAt: "desc" },
        });
        let currentConfig: Record<string, { enabledMenus: string[]; enabledActions: string[] }>;
        let dbVersion: number;

        if (latestAudit) {
          const rawConfig = (latestAudit.newData as any)?.config;
          dbVersion = ((latestAudit.newData as any)?.version as number) || 0;

          // Snapshot DB ada tapi korup secara struktural: GAGAL TERTUTUP (fail-closed, jangan diam-diam reset ke default!)
          if (!rawConfig || !validatePermissionsStructure(rawConfig)) {
            const err: any = new Error(
              "Data snapshot konfigurasi hak akses di database tidak valid atau rusak (fail-closed). Mutasi ditolak untuk mencegah kerusakan data."
            );
            err.statusCode = 500;
            throw err;
          }
          currentConfig = rawConfig;
        } else {
          // DB belum memiliki snapshot: inisialisasi dari bootstrap config tervalidasi di bawah lock yang sama
          const bootstrap = await getValidatedBootstrapConfig();
          if (!bootstrap || !validatePermissionsStructure(bootstrap)) {
            const err: any = new Error(
              "Konfigurasi bootstrap hak akses tidak ditemukan atau rusak (fail-closed)."
            );
            err.statusCode = 500;
            throw err;
          }
          dbVersion = 0;
          currentConfig = bootstrap;
        }

        // 3. Verifikasi nomor versi untuk optimistic concurrency control
        if (body.expectedVersion !== dbVersion) {
          const err: any = new Error(
            `Konflik Konkurensi: Konfigurasi hak akses telah diubah oleh sesi lain (versi DB: ${dbVersion}, versi Anda: ${body.expectedVersion}). Silakan muat ulang halaman.`
          );
          err.statusCode = 409;
          throw err;
        }

        // 5. Hitung nextConfig dan diffDetails DI DALAM TRANSAKSI agar tidak menimpa mutasi paralel
        let nextConfig: Record<string, { enabledMenus: string[]; enabledActions: string[] }>;
        const diffDetails: any = {};
        let mutationType: string;
        let targetRole: string | undefined;
        let successMessage: string;

        if (body.action === "reset") {
          const resetRole = body.roleCode;
          nextConfig = { ...currentConfig };
          mutationType = "reset";
          targetRole = resetRole || "all";
          successMessage = "Konfigurasi berhasil direset ke standar.";

          if (resetRole && DEFAULT_ROLE_CONFIGS[resetRole]) {
            const before = currentConfig[resetRole] || { enabledMenus: [], enabledActions: [] };
            const after = { ...DEFAULT_ROLE_CONFIGS[resetRole] };
            nextConfig[resetRole] = after;
            diffDetails[resetRole] = {
              addedMenus: after.enabledMenus.filter((m) => !before.enabledMenus.includes(m)),
              removedMenus: before.enabledMenus.filter((m) => !after.enabledMenus.includes(m)),
              addedActions: after.enabledActions.filter((a) => !before.enabledActions.includes(a)),
              removedActions: before.enabledActions.filter((a) => !after.enabledActions.includes(a)),
              before,
              after,
            };
          } else {
            // Reset all roles
            for (const [k, v] of Object.entries(DEFAULT_ROLE_CONFIGS)) {
              const before = currentConfig[k] || { enabledMenus: [], enabledActions: [] };
              const after = { ...v };
              nextConfig[k] = after;
              diffDetails[k] = {
                addedMenus: after.enabledMenus.filter((m) => !before.enabledMenus.includes(m)),
                removedMenus: before.enabledMenus.filter((m) => !after.enabledMenus.includes(m)),
                addedActions: after.enabledActions.filter((a) => !before.enabledActions.includes(a)),
                removedActions: before.enabledActions.filter((a) => !after.enabledActions.includes(a)),
                before,
                after,
              };
            }
          }
        } else if (body.allConfigs) {
          nextConfig = { ...currentConfig, ...body.allConfigs };
          mutationType = "updateAll";
          targetRole = "all";
          successMessage = "Seluruh konfigurasi berhasil disimpan.";

          for (const [rCode, newCfg] of Object.entries(body.allConfigs as Record<string, any>)) {
            const before = currentConfig[rCode] || { enabledMenus: [], enabledActions: [] };
            const after = newCfg || { enabledMenus: [], enabledActions: [] };
            diffDetails[rCode] = {
              addedMenus: (after.enabledMenus || []).filter((m: string) => !before.enabledMenus.includes(m)),
              removedMenus: before.enabledMenus.filter((m: string) => !(after.enabledMenus || []).includes(m)),
              addedActions: (after.enabledActions || []).filter((a: string) => !before.enabledActions.includes(a)),
              removedActions: before.enabledActions.filter((a: string) => !(after.enabledActions || []).includes(a)),
              before,
              after,
            };
          }
        } else if (body.roleCode && body.config) {
          const oldRoleConfig = currentConfig[body.roleCode] || { enabledMenus: [], enabledActions: [] };
          const newMenus: string[] = Array.isArray(body.config.enabledMenus) ? body.config.enabledMenus : [];
          const newActions: string[] = Array.isArray(body.config.enabledActions) ? body.config.enabledActions : [];

          const addedMenus = newMenus.filter((m) => !oldRoleConfig.enabledMenus.includes(m));
          const removedMenus = oldRoleConfig.enabledMenus.filter((m) => !newMenus.includes(m));
          const addedActions = newActions.filter((a) => !oldRoleConfig.enabledActions.includes(a));
          const removedActions = oldRoleConfig.enabledActions.filter((a) => !newActions.includes(a));

          nextConfig = {
            ...currentConfig,
            [body.roleCode]: {
              enabledMenus: newMenus,
              enabledActions: newActions,
            },
          };
          mutationType = "updateRole";
          targetRole = body.roleCode;
          successMessage = `Hak akses untuk peran ${body.roleCode} berhasil diperbarui.`;
          diffDetails[body.roleCode] = {
            addedMenus,
            removedMenus,
            addedActions,
            removedActions,
            before: oldRoleConfig,
            after: { enabledMenus: newMenus, enabledActions: newActions },
          };
        } else {
          const err: any = new Error("Payload tidak valid.");
          err.statusCode = 400;
          throw err;
        }

        if (!validatePermissionsStructure(nextConfig)) {
          const err: any = new Error("Struktur konfigurasi hak akses tidak valid (fail-closed).");
          err.statusCode = 400;
          throw err;
        }

        nextConfig = applyCreditLimitAccessRules(nextConfig);
        const newVersion = dbVersion + 1;

        await tx.auditLog.create({
          data: {
            entity: "AccessControl",
            entityId: "role-permissions",
            action: body.action === "reset" ? "RESET" : "UPDATE",
            oldData: {
              version: dbVersion,
              config: currentConfig,
            },
            newData: {
              version: newVersion,
              config: nextConfig,
              diff: diffDetails,
              mutationType,
              targetRole,
            },
            userId: auth.dbUser?.id || (auth.session as any)?.id || "unknown",
            userName: getProfileName(auth.session, auth.dbUser),
            userRole: safeRole,
          },
        });

        return { nextVersion: newVersion, nextConfig, successMessage };
      });
    } catch (txErr: any) {
      if (txErr?.statusCode === 409) {
        return NextResponse.json({ error: txErr.message }, { status: 409 });
      }
      if (txErr?.statusCode === 400) {
        return NextResponse.json({ error: txErr.message }, { status: 400 });
      }
      if (txErr?.statusCode === 500) {
        return NextResponse.json({ error: txErr.message }, { status: 500 });
      }
      console.error("Gagal menyimpan transaksi hak akses di database:", txErr);
      return NextResponse.json({ error: "Gagal menyimpan konfigurasi hak akses ke database." }, { status: 500 });
    }

    const { nextVersion, nextConfig, successMessage } = txRes;

    // Perbarui cache otorisasi langsung dari transaksi DB yang telah commit (dilindungi monotonic version guard)
    updateMemoryPermissionsCache(nextConfig, nextVersion);

    try {
      await writePermissionsConfig(nextConfig, nextVersion);
    } catch (fileErr: any) {
      console.error("Gagal sinkronisasi file permission setelah transaksi DB:", fileErr);
      await prisma.auditLog.create({
        data: {
          entity: "AccessControl",
          entityId: "role-permissions",
          action: "FILE_SYNC_FAILED",
          oldData: { version: nextVersion },
          newData: {
            error: fileErr?.message || String(fileErr),
            attemptedVersion: nextVersion,
          },
          userId: auth.dbUser?.id || (auth.session as any)?.id || "unknown",
          userName: getProfileName(auth.session, auth.dbUser),
          userRole: safeRole,
        },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        message: successMessage,
        warning: "Konfigurasi sudah tersimpan di database. Salinan file lokal belum tersinkron.",
        version: nextVersion,
        data: nextConfig,
      });
    }

    return NextResponse.json({
      ok: true,
      data: nextConfig,
      version: nextVersion,
      message: successMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
