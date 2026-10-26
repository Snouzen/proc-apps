import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePoCache } from "@/lib/ttl-cache";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { auditUpdatePO } from "@/lib/audit";
import { checkPOOwnership, getRegionalSynonyms } from "@/lib/utils/regional";
import { isInvoiceEmpty } from "@/lib/utils/invoice";

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session, role: rawRole, dbUser } = auth;
    const safeRole = String(rawRole).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const userRegional = dbUser?.regional || (session as any)?.regional || null;
    const userSiteArea = dbUser?.siteArea || (session as any)?.siteArea || null;

    if (safeRole !== "pusat" && safeRole !== "rm" && safeRole !== "sitearea") {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki wewenang untuk menetapkan unit PO" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const noPo: string | undefined = body?.noPo?.trim();
    const regionalPayload: string | null | undefined = body?.regional?.trim();
    const siteArea: string | null | undefined = body?.siteArea?.trim();

    if (!noPo) {
      return NextResponse.json({ error: "noPo wajib diisi" }, { status: 400 });
    }

    // Only Pusat can delegate the remaining unit assignment to a regional.
    if (!siteArea && (safeRole !== "pusat" || !regionalPayload)) {
      return NextResponse.json(
        { error: "Unit tujuan (Site Area) wajib dipilih untuk menetapkan PO" },
        { status: 400 }
      );
    }

    const po = await prisma.$transaction(async (tx) => {
      // 0. Kunci baris PO dengan FOR UPDATE agar race condition / mutasi bersamaan tertahan
      await tx.$executeRaw`SELECT id FROM "PurchaseOrder" WHERE "noPo" = ${noPo} FOR UPDATE`;

      const existingPo = await tx.purchaseOrder.findUnique({
        where: { noPo },
        include: { UnitProduksi: true },
      });
      if (!existingPo) {
        const err: any = new Error("PO tidak ditemukan");
        err.statusCode = 404;
        throw err;
      }

      // 1. Validasi Status PO: PO yang sudah memiliki invoice aktif tidak dapat dialokasikan ulang
      if (!isInvoiceEmpty(existingPo.noInvoice)) {
        const err: any = new Error("PO yang sudah memiliki invoice tidak dapat dialokasikan ulang");
        err.statusCode = 400;
        throw err;
      }

      // 2. Perketat Jalur PO UNKNOWN & Scope Kepemilikan Asal
      if (safeRole !== "pusat") {
        if (safeRole === "rm") {
          if (!userRegional || !userRegional.trim()) {
            const err: any = new Error("Akun Regional Manager tidak memiliki konfigurasi wilayah regional.");
            err.statusCode = 403;
            throw err;
          }

          // Jika PO sudah memiliki UnitProduksi yang valid (bukan UNKNOWN)
          if (
            existingPo.unitProduksiId &&
            existingPo.unitProduksiId !== "UNKNOWN" &&
            existingPo.UnitProduksi
          ) {
            const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
            if (!check.allowed) {
              const err: any = new Error(check.reason || "Forbidden");
              err.statusCode = 403;
              throw err;
            }
          } else {
            // Jika unit masih UNKNOWN / belum di-assign: periksa apakah regional asal PO cocok
            const poReg = existingPo.regional?.trim().toLowerCase();
            if (!poReg || ["unknown", "-", ""].includes(poReg)) {
              const err: any = new Error(
                "PO tanpa identitas unit produksi dan regional asal hanya dapat ditetapkan oleh Pusat"
              );
              err.statusCode = 403;
              throw err;
            }

            const userSynonyms = getRegionalSynonyms(userRegional).map((s) => s.toLowerCase().trim());
            const poSynonyms = getRegionalSynonyms(poReg).map((s) => s.toLowerCase().trim());
            const match = userSynonyms.some((us) => poSynonyms.includes(us));
            if (!match) {
              const err: any = new Error(`PO ini berada di luar wewenang regional Anda (${userRegional}).`);
              err.statusCode = 403;
              throw err;
            }
          }
        } else if (safeRole === "sitearea") {
          // Cabang tidak boleh menetapkan PO yang masih UNKNOWN atau di luar wewenangnya
          const check = checkPOOwnership(existingPo, safeRole, userRegional, userSiteArea);
          if (!check.allowed) {
            const err: any = new Error(check.reason || "Cabang tidak berwenang menetapkan unit untuk PO ini.");
            err.statusCode = 403;
            throw err;
          }
        }
      }

      // Pusat may delegate to a regional before a production unit is selected.
      if (!siteArea && safeRole === "pusat" && regionalPayload) {
        const regionalUnits = await tx.unitProduksi.findMany({
          where: { NOT: { idRegional: "UNKNOWN" } },
          select: { idRegional: true, namaRegional: true },
          orderBy: [{ namaRegional: "asc" }, { idRegional: "asc" }],
        });
        const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
        const candidates = regionalUnits.filter(unit => unit.idRegional !== "UNKNOWN" && !["", "-", "unknown"].includes(normalized(unit.namaRegional)));
        const requested = new Set(getRegionalSynonyms(regionalPayload).map(normalized));
        // Compare the full master label first, then canonical synonyms on BOTH
        // sides. Short aliases alone do not equal "REGIONAL 2 SURABAYA" in SQL.
        const regionalUnit = candidates.find(unit => normalized(unit.namaRegional) === normalized(regionalPayload))
          || candidates.find(unit => getRegionalSynonyms(unit.namaRegional).some(name => requested.has(normalized(name))));
        if (!regionalUnit) throw Object.assign(new Error("Regional tujuan tidak terdaftar"), { statusCode: 400 });
        return auditUpdatePO(tx as any, { noPo }, {
          regional: regionalUnit.namaRegional, unitProduksiId: "UNKNOWN",
          statusPo: false, tglkirim: null, namaSupir: null, platNomor: null,
          remarks: null, updatedAt: new Date(),
        }, { id: dbUser?.id || session.userId || "unknown", name: getProfileName(session, dbUser), role: safeRole });
      }

      if (!siteArea) throw Object.assign(new Error("Site area wajib dipilih"), { statusCode: 400 });
      // 3. Cari detail UnitProduksi tujuan
      const unit = await tx.unitProduksi.findFirst({
        where: { siteArea: { equals: siteArea, mode: "insensitive" } },
      });
      if (!unit) {
        const err: any = new Error(`UnitProduksi dengan Site Area '${siteArea}' tidak ditemukan`);
        err.statusCode = 404;
        throw err;
      }

      const unitProduksiId = unit.idRegional;
      const finalRegional = unit.namaRegional;

      // Jika regionalPayload disertakan, pastikan tidak kontradiksi dengan unit tujuan
      if (regionalPayload) {
        const pSyn = getRegionalSynonyms(regionalPayload).map((s) => s.toLowerCase().trim());
        const uSyn = getRegionalSynonyms(finalRegional || "").map((s) => s.toLowerCase().trim());
        if (!pSyn.some((ps) => uSyn.includes(ps))) {
          const err: any = new Error(
            `Regional '${regionalPayload}' tidak sesuai dengan wilayah UnitProduksi '${finalRegional}'`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // 4. Validasi Target Assignment Scope
      if (safeRole === "rm") {
        const targetSynonyms = getRegionalSynonyms(finalRegional || "").map((s) => s.toLowerCase().trim());
        const userSynonyms = getRegionalSynonyms(userRegional || "").map((s) => s.toLowerCase().trim());
        if (!targetSynonyms.some((ts: string) => userSynonyms.includes(ts))) {
          const err: any = new Error(
            `RM tidak dapat menetapkan PO ke wilayah di luar wewenangnya (${userRegional})`
          );
          err.statusCode = 403;
          throw err;
        }
      }

      if (safeRole === "sitearea") {
        const allowedAreas = String(userSiteArea || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        if (
          unitProduksiId &&
          !allowedAreas.includes(unitProduksiId.toLowerCase()) &&
          !allowedAreas.includes(siteArea.toLowerCase())
        ) {
          const err: any = new Error(
            `Cabang tidak dapat menetapkan PO ke unit di luar wewenangnya (${userSiteArea})`
          );
          err.statusCode = 403;
          throw err;
        }
      }

      // 5. Update PO dan Log Audit di dalam transaksi yang sama
      return await auditUpdatePO(
        tx as any,
        { noPo },
        {
          unitProduksiId: unitProduksiId || undefined,
          regional: finalRegional || undefined,
          remarks: null, // Bersihkan reject remarks saat re-assigned
          updatedAt: new Date(),
        },
        {
          id: dbUser?.id || (session as any)?.user?.id || "unknown",
          name: getProfileName(session, dbUser),
          role: safeRole,
        }
      );
    });

    // Invalidation seluruh lapisan cache dashboard dan list
    invalidatePoCache();

    return NextResponse.json({ ok: true, po });
  } catch (e: any) {
    console.error("Assign API Error:", e);
    const status = typeof e?.statusCode === "number" ? e.statusCode : 500;
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status }
    );
  }
}
