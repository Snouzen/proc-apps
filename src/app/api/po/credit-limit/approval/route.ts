import { getSessionWithRole } from "@/lib/auth";
import { getProfileName } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { ApprovalActionError, processApprovalBatch } from "@/app/api/po/services/creditApprovalActionService";
import { z } from "zod";
import { listApprovalBatches, getApprovalBatchDetails } from "@/app/api/po/services/creditApprovalListService";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    // Preserve the existing approval-list role boundary; mutation permissions remain in POST.
    if (auth.role !== "pusat") return Response.json({ error: "Approval Credit Limit hanya untuk Pusat." }, { status: 403, headers });
    const params = new URL(request.url).searchParams, id = params.get("batchId");
    return Response.json(id ? await getApprovalBatchDetails(id) : await listApprovalBatches(params), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_APPROVAL_QUERY") return Response.json({ error: "Parameter halaman Approval tidak valid." }, { status: 400, headers });
    if (message === "APPROVAL_BATCH_NOT_FOUND") return Response.json({ error: "Batch sudah tidak tersedia." }, { status: 404, headers });
    if (message === "APPROVAL_BATCH_INCOMPLETE") return Response.json({ error: "Detail batch belum dapat dimuat lengkap atau melebihi 50 PO. Muat ulang sebelum memproses batch." }, { status: 409, headers });
    console.error("GET Credit Limit Approval failed:", error);
    return Response.json({ error: "Gagal memuat Approval Credit Limit. Silakan coba kembali." }, { status: 503, headers });
  }
}

const ApprovalSchema = z.object({ batchId: z.string().trim().min(1).max(128), stage: z.enum(["pusat", "direksi"]),
  poId: z.string().trim().min(1).max(128).optional(), mode: z.enum(["check", "approve"]), expectedSnapshot: z.string().regex(/^[a-f0-9]{64}$/).optional() })
  .refine(value => value.mode !== "approve" || !!value.expectedSnapshot)
  .refine(value => !value.poId || value.stage === "direksi");

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    if (auth.role !== "pusat" || !(await hasPermission(auth.role, "cl_appr_approve"))) return Response.json({ error: "Akses approval Credit Limit ditolak." }, { status: 403, headers });
    const parsed = ApprovalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Parameter approval batch tidak valid.", code: "INVALID_APPROVAL_ACTION" }, { status: 400, headers });
    const result = await processApprovalBatch(parsed.data, { id: auth.dbUser?.id || (auth.session as any)?.user?.id || "unknown", name: getProfileName(auth.session, auth.dbUser), role: auth.role });
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof ApprovalActionError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
    console.error("Credit Limit batch approval failed:", error);
    return Response.json({ error: "Approval belum dapat dipastikan. Muat ulang untuk memeriksa status sebelum mencoba kembali.", code: "APPROVAL_SERVICE_UNAVAILABLE" }, { status: 503, headers });
  }
}
