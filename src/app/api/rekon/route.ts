import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { fetchSingleRekon } from "./services/rekonSingleService";
import { fetchRekonList } from "./services/rekonListService";
import { saveRekon, ValidationError } from "./services/rekonSaveService";
import { deleteRekon } from "./services/rekonDeleteService";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;
    const canView =
      (await hasPermission(safeRole, "rekon_view")) ||
      (await hasPermission(safeRole, "rekon_detail")) ||
      (await hasPermission(safeRole, "rekon_calc_save"));
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin melihat data rekonsiliasi (rekon_view)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    // CASE 1: Fetch Single Reconcile by ID (For Edit/Draft)
    if (idParam) {
      const data = await fetchSingleRekon(idParam, auth);
      if (!data) return NextResponse.json({ error: "Data not found" }, { status: 404 });
      if (data === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Forbidden: Data rekonsiliasi ini berada di luar wewenang regional Anda" },
          { status: 403 }
        );
      }
      return NextResponse.json({ data });
    }

    // CASE 2: List Data with Filtering & Backfills
    const listData = await fetchRekonList(searchParams, auth);
    return NextResponse.json(listData);
  } catch (error: any) {
    console.error("GET Rekon Data Error:", error);
    if (error instanceof ValidationError || error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role: safeRole } = auth;
    const body = await request.json();
    const isEdit = Boolean(body?.id);

    const allowed =
      (await hasPermission(safeRole, "rekon_calc_save")) ||
      (await hasPermission(safeRole, isEdit ? "rekon_edit" : "rekon_create"));
    if (!allowed) {
      return NextResponse.json(
        { error: `Forbidden: Akun Anda tidak memiliki izin ${isEdit ? "mengubah" : "membuat"} rekonsiliasi` },
        { status: 403 }
      );
    }

    const newRekon = await saveRekon(body, auth);

    return NextResponse.json({ success: true, data: newRekon });
  } catch (error: any) {
    console.error("POST Rekon Error:", error);
    if (error instanceof ValidationError || error.name === "ValidationError") {
      const isForbidden = error.message.toLowerCase().includes("forbidden");
      return NextResponse.json({ error: error.message }, { status: isForbidden ? 403 : 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const allowed = await hasPermission(safeRole, "rekon_delete");
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: Akun Anda tidak memiliki izin menghapus rekonsiliasi (rekon_delete)" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const result = await deleteRekon(id, auth);
    if (result.notFound) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (result.forbidden) {
      return NextResponse.json(
        { error: result.reason || "Forbidden: Anda tidak memiliki wewenang atas data rekonsiliasi ini" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Rekon Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
