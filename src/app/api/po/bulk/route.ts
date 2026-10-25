import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { invalidatePoCache } from "@/lib/ttl-cache";
import { processBulkPO } from "./services/poBulkProcessor";

export async function POST(req: Request) {
  try {
    const auth = await getSessionWithRole(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;

    const raw = await req.json();
    const payload = Array.isArray(raw)
      ? { data: raw, replaceDuplicates: false }
      : raw;
    const body = payload?.data;
    const replaceDuplicates: boolean = !!payload?.replaceDuplicates;

    const allowed = await hasPermission(safeRole, "po_create");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin import bulk PO (po_create)" }, { status: 403 });
    }

    if (replaceDuplicates) {
      const allowedEdit = await hasPermission(safeRole, "po_edit");
      if (!allowedEdit) {
        return NextResponse.json({ error: "Forbidden: Opsi replace duplicates memerlukan izin mengubah PO (po_edit)" }, { status: 403 });
      }
    }
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid data format. Expected an array." },
        { status: 400 },
      );
    }

    const result = await processBulkPO({
      body,
      replaceDuplicates,
      signal: req.signal,
      auth,
    });

    if (result && (result.count > 0 || result.addedPoCount > 0 || result.replacedPoCount > 0)) {
      invalidatePoCache();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
