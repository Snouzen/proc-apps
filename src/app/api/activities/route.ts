import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { fetchScopedActivities } from "./activityService";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const auth = await getSessionWithRole(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    return NextResponse.json(await fetchScopedActivities(auth), { headers });
  } catch {
    return NextResponse.json({ error: "Aktivitas belum dapat dimuat. Silakan coba lagi.", code: "ACTIVITIES_UNAVAILABLE" }, { status: 503, headers });
  }
}
