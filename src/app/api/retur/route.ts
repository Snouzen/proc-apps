import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { 
  buildReturFilter, 
  fetchReturGrouped, 
  fetchReturDetail 
} from "./services/returQueryService";
import { 
  bulkInsertRetur, 
  singleInsertRetur, 
  updateRetur, 
  deleteRetur 
} from "./services/returMutationService";

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const safeRole = auth.safeRole || auth.role;
    const canView = await hasPermission(safeRole, "retur_view");
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin melihat data retur." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    const drFilter = buildReturFilter(searchParams);

    // SCENARIO A: Grouped Mode (Accordion)
    if (!retailerId) {
      const grouped = await fetchReturGrouped(drFilter);
      return NextResponse.json(grouped);
    }

    // SCENARIO B: Detail Mode
    const detail = await fetchReturDetail(retailerId, drFilter, page, limit, offset);
    return NextResponse.json(detail);
  } catch (error: any) {
    console.error("GET Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const safeRole = auth.safeRole || auth.role;
    const canCreate = await hasPermission(safeRole, "retur_create");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin menambah data retur (retur_create)." }, { status: 403 });
    }

    const bodyRaw = await request.json();
    const isArray = Array.isArray(bodyRaw);
    const body = isArray ? bodyRaw : (bodyRaw.data || bodyRaw);
    const replaceDuplicates = bodyRaw.replaceDuplicates === true;

    if (replaceDuplicates) {
      const canEdit = await hasPermission(safeRole, "retur_edit");
      const canDelete = await hasPermission(safeRole, "retur_delete");
      if (!canEdit && !canDelete) {
        return NextResponse.json(
          { error: "Forbidden: Mengganti data retur yang sudah ada (replace) memerlukan izin retur_edit atau retur_delete." },
          { status: 403 }
        );
      }
    }

    if (Array.isArray(body)) {
      const res = await bulkInsertRetur(body, replaceDuplicates, auth);
      if ("error" in res) {
        return NextResponse.json({ error: res.error }, { status: res.status || 400 });
      }
      if (res.skipped) {
        return NextResponse.json({ success: true, count: 0, message: "Semua data sudah ada (skipped)" });
      }
      return NextResponse.json({ success: true, count: res.count });
    }

    const res = await singleInsertRetur(body, auth);
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (error: any) {
    console.error("POST Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const safeRole = auth.safeRole || auth.role;
    const canEdit = await hasPermission(safeRole, "retur_edit");
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin mengubah data retur (retur_edit)." }, { status: 403 });
    }

    const body = await request.json();
    const res = await updateRetur(body, auth);
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    console.error("PUT Retur Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
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

    const safeRole = auth.safeRole || auth.role;
    const canDelete = await hasPermission(safeRole, "retur_delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: Akun Anda tidak memiliki izin menghapus data retur (retur_delete)." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ritelId = searchParams.get("ritelId");

    const res = await deleteRetur(id, ritelId, auth);
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: "Data retur tidak ditemukan di database" }, { status: 404 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan internal server" }, { status: 500 });
  }
}
