import Swal from "sweetalert2";

type Reference = { code: string; requestId: string; endpoint: string; timestamp: string; status?: number; role?: string; deployment?: string };
export class ScheduleSaveError extends Error {
  constructor(message: string, public reference: Reference) { super(message); this.name = "ScheduleSaveError"; }
}
function localReference(code: string, endpoint: string, status?: number): Reference {
  return { code, requestId: "client-" + crypto.randomUUID(), endpoint, timestamp: new Date().toISOString(), status };
}
/** Submit once. A failed/lost mutation response must never be automatically replayed. */
export async function saveScheduleRequest(endpoint: string, payload: unknown): Promise<void> {
  let response: Response;
  try {
    response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch {
    throw new ScheduleSaveError("Koneksi ke server terputus. Muat ulang untuk memeriksa status terbaru sebelum mencoba kembali.", localReference("SCHEDULE_NETWORK_ERROR", endpoint));
  }
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  const fallback = localReference("HTTP_" + response.status, endpoint, response.status);
  const raw = body?.reference;
  const reference: Reference = {
    ...fallback,
    code: typeof raw?.code === "string" ? raw.code : typeof body?.code === "string" ? body.code : fallback.code,
    requestId: typeof raw?.requestId === "string" ? raw.requestId : response.headers.get("X-Error-Reference") || fallback.requestId,
    timestamp: typeof raw?.timestamp === "string" ? raw.timestamp : fallback.timestamp,
    role: typeof raw?.role === "string" ? raw.role : undefined,
    deployment: typeof raw?.deployment === "string" ? raw.deployment : undefined,
  };
  throw new ScheduleSaveError(typeof body?.error === "string" ? body.error : "Gagal menyimpan data (HTTP " + response.status + ").", reference);
}
const escapeHtml = (value: unknown) => String(value ?? "-").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function showScheduleError(error: unknown, title: string, endpoint: string, code = "SCHEDULE_CLIENT_ERROR") {
  const reference = error instanceof ScheduleSaveError ? error.reference : localReference(code, endpoint);
  const message = error instanceof Error ? error.message : "Terjadi gangguan. Silakan coba kembali.";
  const rows = [["Kode", reference.code], ["ID", reference.requestId], ["Proses", reference.endpoint], ["Waktu (UTC)", reference.timestamp],
    ...(reference.status ? [["HTTP", String(reference.status)]] : []),
    ...(reference.role ? [["Role", reference.role]] : []),
    ...(reference.deployment ? [["Build", reference.deployment]] : []),
  ];
  return Swal.fire({ icon: "error", title, confirmButtonText: "Tutup", html:
    '<p style="white-space:pre-wrap;overflow-wrap:anywhere">' + escapeHtml(message) + '</p>' +
    '<section style="margin-top:18px;padding:12px;text-align:left;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;overflow-wrap:anywhere"><strong>Reference</strong>' +
    '<p style="margin:6px 0">Kirim foto bagian ini kepada admin untuk pengecekan.</p>' +
    rows.map(([label, value]) => '<div><b>' + escapeHtml(label) + ':</b> ' + escapeHtml(value) + '</div>').join('') + '</section>',
  });
}
