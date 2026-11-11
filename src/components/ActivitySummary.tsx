"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withReadDeadline } from "@/lib/readDeadline";

function useActivityDetail(activityId: string | null, recordId?: string | null) {
  const [retry, setRetry] = useState(0);
  const key = `${activityId || ""}:${recordId || ""}:${retry}`;
  const [result, setResult] = useState<{ key: string; data?: any; error?: string; reference?: any }>({ key: "" });
  useEffect(() => {
    if (!activityId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ activityId });
    if (recordId) params.set("recordId", recordId);
    void withReadDeadline((async () => {
      const response = await fetch(`/api/activities/detail?${params}`, { cache: "no-store", signal: controller.signal });
      const json = await response.json();
      if (response.ok && !json.data) throw new Error("Respons ringkasan tidak valid.");
      if (!controller.signal.aborted) setResult(response.ok ? { key, data: json.data } : { key, error: json.error || "Gagal memuat ringkasan", reference: json.reference });
    })()).catch(error => {
      if (!controller.signal.aborted) {
        setResult({ key, error: error instanceof Error ? error.message : "Gagal memuat ringkasan", reference: { code: "ACTIVITY_CLIENT_READ_FAILED", endpoint: "/api/activities/detail", timestamp: new Date().toISOString() } });
        controller.abort();
      }
    });
    return () => controller.abort();
  }, [activityId, recordId, key]);
  return { ...(result.key === key ? result : {}), loading: result.key !== key, retry: () => setRetry(n => n + 1) };
}

function Fields({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fields.map((f, i) => <div key={f.label + i} className="min-w-0 rounded-xl border border-slate-100 p-3 dark:border-slate-800"><dt className="text-xs text-slate-500">{f.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm font-medium">{f.value}</dd></div>)}</dl>;
}

function Content({ state, full = false }: { state: ReturnType<typeof useActivityDetail>; full?: boolean }) {
  if (state.loading) return <p role="status" className="py-8 text-center text-sm text-slate-500">Memuat informasi...</p>;
  if (state.error) return <div role="alert" className="space-y-3 rounded-xl border border-amber-200 p-4 text-sm">
    <p>{state.error}</p>
    <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200"><strong>Reference</strong>{Object.entries(state.reference || {}).map(([name, v]) => <p key={name} className="break-words [overflow-wrap:anywhere]">{name}: {String(v)}</p>)}</div>
    <button className="rounded-lg bg-slate-900 px-3 py-2 text-white" onClick={state.retry}>Coba Lagi</button>
  </div>;
  const data = state.data;
  if (!data) return null;
  return <div className="space-y-4">
    <Fields fields={data.fields || []} />
    {data.notice && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950">{data.notice}{data.noticeCode && <span className="mt-1 block">Reference: {data.noticeCode}</span>}</p>}
    {data.records?.length > 0 && <div className="max-h-[40dvh] space-y-2 overflow-y-auto" aria-label="Daftar record aktivitas">{data.records.map((r: any) => <div key={r.id} className="rounded-xl border p-3 text-sm"><strong className="break-words">{r.number}</strong><p className="mt-1 text-xs text-slate-500">Role pengaju/pembuat: {r.role}</p><p className="text-xs text-slate-500">Tanggal input: {r.createdAt}</p>{(!full || data.records.length > 1) && <Link className="mt-2 inline-block text-sm font-semibold text-blue-600 underline" href={r.detailHref}>Lihat Detail</Link>}</div>)}</div>}
    {full && data.details?.length > 0 && <Fields fields={data.details} />}
    {!full && data.detailHref && <Link className="inline-block font-semibold text-blue-600 underline" href={data.detailHref}>Lihat Detail</Link>}
  </div>;
}

export function ActivitySummaryDialog({ activityId, onClose, returnFocus }: { activityId: string | null; onClose: () => void; returnFocus?: () => void }) {
  const state = useActivityDetail(activityId);
  return <Dialog open={Boolean(activityId)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85dvh] w-[calc(100vw_-_24px)] max-w-xl overflow-y-auto rounded-2xl" onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus(); } }}>
      <DialogHeader><DialogTitle>{state.data?.title || "Ringkasan Aktivitas"}</DialogTitle><DialogDescription>Kondisi data terbaru. Tanggal dan identitas awal mengikuti riwayat yang tersedia.</DialogDescription></DialogHeader>
      <Content state={state} />
    </DialogContent>
  </Dialog>;
}

export function ActivityDetailPage({ activityId, recordId }: { activityId: string; recordId?: string }) {
  const state = useActivityDetail(activityId, recordId);
  return <main className="mx-auto max-w-4xl space-y-5 rounded-2xl border bg-white p-4 dark:bg-slate-950 sm:p-6">
    <Link href="/" className="text-sm text-blue-600 underline">Kembali ke Home</Link>
    <h1 className="text-xl font-bold">{state.data?.title || "Detail Aktivitas"}</h1>
    <p className="text-xs text-slate-500">Informasi terbaru dari record terkait. Halaman ini hanya untuk membaca data.</p>
    <Content state={state} full />
  </main>;
}
