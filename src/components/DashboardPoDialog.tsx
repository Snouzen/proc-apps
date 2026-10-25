"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PODetailModal from "@/components/po-detail-modal";
import { usePoDetailModal } from "@/hooks/usePoDetailModal";

export default function DashboardPoDialog() {
  const [selection, setSelection] = useState<{ filters: Record<string, string>; title: string } | null>(null);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const detail = usePoDetailModal();
  useEffect(() => {
    const open = (e: Event) => { setSelection((e as CustomEvent).detail); setPage(0); };
    window.addEventListener("proc-po-drilldown", open);
    return () => window.removeEventListener("proc-po-drilldown", open);
  }, []);
  useEffect(() => {
    if (!selection) return;
    const ctrl = new AbortController();
    setLoading(true); setError(""); setRows([]);
    const params = new URLSearchParams({ ...selection.filters, summary: "true", limit: "20", offset: String(page * 20) });
    void fetch("/api/po?" + params, { signal: ctrl.signal, cache: "no-store" }).then(async res => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat PO");
      if (!ctrl.signal.aborted) { setRows(json.data || []); setTotal(json.total || 0); }
    }).catch(e => { if (!ctrl.signal.aborted) setError(e.message); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [selection, page, retry]);
  return <>
    <Dialog open={Boolean(selection) && !detail.openDetail} onOpenChange={open => { if (!open) setSelection(null); }}>
      <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{selection?.title}</DialogTitle></DialogHeader>
        {loading ? <p>Memuat PO...</p> : error ? <div role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Coba Lagi</button></div> : <>
          <p className="text-sm">{total} PO sesuai filter dan akses akun.</p>
          <div className="space-y-2">{rows.map(po => <button key={po.id} className="w-full rounded-xl border p-3 text-left hover:bg-slate-50" onClick={() => void detail.openModal(po)}>
            <strong>{po.noPo}</strong><p className="text-sm">{po.RitelModern?.namaPt || "-"} · {po.UnitProduksi?.siteArea || "Belum ditetapkan"}</p>
          </button>)}{!rows.length && <p>Tidak ada PO pada filter ini.</p>}</div>
          <div className="flex justify-between"><button disabled={!page} onClick={() => setPage(p => p - 1)}>Sebelumnya</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>Berikutnya</button></div>
        </>}
      </DialogContent>
    </Dialog>
    <PODetailModal open={detail.openDetail} onClose={() => detail.setOpenDetail(false)} data={detail.detailData} />
  </>;
}
