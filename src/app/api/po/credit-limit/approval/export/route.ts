import { getSessionWithRole } from "@/lib/auth";
import { exportApprovalBatches } from "@/app/api/po/services/creditApprovalExportService";

export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    if (auth.role !== "pusat") return Response.json({ error: "Export Approval Credit Limit hanya untuk Pusat." }, { status: 403, headers });
    const result = await exportApprovalBatches(new URL(request.url).searchParams);
    return new Response(result.file, { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${result.filename}"` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_APPROVAL_QUERY") return Response.json({ error: "Filter export tidak valid." }, { status: 400, headers });
    if (message === "APPROVAL_EXPORT_EMPTY" || message === "APPROVAL_BATCH_NOT_FOUND") return Response.json({ error: "Tidak ada data untuk diexport." }, { status: 404, headers });
    if (message === "APPROVAL_BATCH_INCOMPLETE") return Response.json({ error: "Isi batch tidak lengkap atau melebihi 50 PO. Export dibatalkan agar data tidak terpotong." }, { status: 409, headers });
    console.error("Approval export failed:", error);
    return Response.json({ error: "Export belum berhasil diselesaikan. Coba kembali atau persempit filter.", code: "APPROVAL_EXPORT_FAILED" }, { status: 503, headers });
  }
}
