export function createScheduleResponder(request: Request, context: () => { role?: string; action?: string } = () => ({})) {
  return (body: Record<string, unknown>, init?: ResponseInit): Response => {
    const status = init?.status || 200;
    if (status < 400) return Response.json(body, init);
    const code = typeof body.code === "string" ? body.code : ({
      400: "SCHEDULE_VALIDATION_FAILED", 401: "SESSION_INVALID", 403: "SCHEDULE_PERMISSION_DENIED",
      404: "SCHEDULE_DATA_NOT_FOUND", 409: "SCHEDULE_CONFLICT", 415: "REQUEST_CONTENT_TYPE_INVALID",
      500: "SCHEDULE_INTERNAL_ERROR", 503: "PERMISSIONS_UNAVAILABLE",
    } as Record<number, string>)[status] || "SCHEDULE_REQUEST_FAILED";
    const reference = {
      code, requestId: crypto.randomUUID(), endpoint: new URL(request.url).pathname,
      timestamp: new Date().toISOString(), status, ...context(),
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
    };
    // Never log cookies, credentials, request payloads or raw database messages here.
    console.warn("[ScheduleRequestError]", JSON.stringify(reference));
    const headers = new Headers(init?.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Error-Reference", reference.requestId);
    return Response.json({ ...body, code, reference }, { ...init, headers });
  };
}
