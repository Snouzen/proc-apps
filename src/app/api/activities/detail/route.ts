import { getSessionWithRole } from "@/lib/auth";
import { fetchActivityDetail, ActivityDetailError } from "../activityDetailService";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const headers = { "Cache-Control": "private, no-store" };
  const error = (status: number, code: string, message: string) => {
    const reference = { code, requestId, endpoint: "/api/activities/detail", status, timestamp: new Date().toISOString() };
    console.warn("[ActivityDetailError]", JSON.stringify(reference));
    return Response.json({ error: message, reference }, { status, headers });
  };
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return error(401, "ACTIVITY_SESSION_REQUIRED", "Sesi tidak tersedia. Silakan masuk kembali.");
    const params = new URL(request.url).searchParams, id = params.get("activityId"), recordId = params.get("recordId");
    if (!id || id.length > 200 || (recordId && recordId.length > 200)) return error(400, "ACTIVITY_QUERY_INVALID", "Referensi aktivitas tidak valid.");
    return Response.json({ data: await fetchActivityDetail(id, recordId, auth) }, { headers });
  } catch (err) {
    if (err instanceof ActivityDetailError) return error(err.status, err.code, err.message);
    return error(503, "ACTIVITY_DETAIL_UNAVAILABLE", "Ringkasan belum dapat dimuat. Silakan coba lagi.");
  }
}
