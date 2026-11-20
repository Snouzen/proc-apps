import { z } from "zod";
import { getSessionWithRole, getProfileName } from "@/lib/auth";
import { hasPermission } from "@/lib/accessControl";
import { BatchNdError, updateBatchNd } from "@/app/api/po/services/creditBatchNdService";

const schema = z.object({ batchId: z.string().trim().min(1).max(100), noNd: z.string().trim().min(1).max(255),
  policy: z.literal("empty"), mode: z.enum(["check", "save"]), expectedSnapshot: z.string().regex(/^[a-f0-9]{64}$/).optional() })
  .refine(value => value.mode !== "save" || !!value.expectedSnapshot);

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    if (auth.role !== "pusat" || !((await hasPermission(auth.role, "po_edit")) || (await hasPermission(auth.role, "nd_generate")) || (await hasPermission(auth.role, "cl_appr_approve")))) {
      return Response.json({ error: "Akses pengisian ND batch ditolak.", code: "ND_BATCH_FORBIDDEN" }, { status: 403, headers });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Isi No. ND (maksimal 255 karakter), batch, dan pilihan pengisian dengan benar.", code: "ND_BATCH_INVALID_INPUT" }, { status: 400, headers });
    return Response.json(await updateBatchNd(parsed.data, { id: auth.dbUser?.id || auth.session.userId || "unknown", name: getProfileName(auth.session, auth.dbUser), role: auth.role }), { headers });
  } catch (error) {
    if (error instanceof BatchNdError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
    return Response.json({ error: "Penyimpanan ND batch belum dapat dipastikan. Periksa data sebelum mencoba kembali.", code: "ND_BATCH_UNAVAILABLE" }, { status: 503, headers });
  }
}
