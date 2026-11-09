import { getSessionWithRole } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { getCreditLimitDataPage } from "@/app/api/po/services/creditLimitDataListService";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    if (!(await hasPermission(auth.role, "cl_data_view"))) return Response.json({ error: "Akses Data Credit Limit ditolak." }, { status: 403, headers });
    const result = await getCreditLimitDataPage(new URL(request.url).searchParams, auth);
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDIT_DATA_QUERY") return Response.json({ error: "Parameter daftar Credit Limit tidak valid." }, { status: 400, headers });
    console.error("GET Credit Limit Data failed:", error);
    return Response.json({ error: "Gagal memuat Data Credit Limit. Silakan coba kembali." }, { status: 503, headers });
  }
}
