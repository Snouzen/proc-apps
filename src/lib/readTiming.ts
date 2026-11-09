// Enable only in development or explicitly for diagnostics. No user identifiers,
// credentials, payloads or database errors are recorded.
export function createReadTiming(route: string) {
  const enabled = process.env.NODE_ENV !== "production" || process.env.READ_TIMING_ENABLED === "1";
  const started = performance.now();
  const stages: Array<{ name: string; ms: number }> = [];
  return {
    async measure<T>(name: string, read: () => Promise<T>): Promise<T> {
      const start = performance.now();
      try { return await read(); }
      finally { stages.push({ name, ms: performance.now() - start }); }
    },
    finish(response: Response) {
      if (enabled) {
        const total = performance.now() - started;
        response.headers.set("Server-Timing", [...stages, { name: "total", ms: total }]
          .map(stage => `${stage.name};dur=${stage.ms.toFixed(1)}`).join(", "));
        console.info("[ReadTiming]", JSON.stringify({ route, status: response.status, stages, totalMs: total }));
      }
      return response;
    },
  };
}
