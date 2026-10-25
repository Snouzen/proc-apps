import { useState, useEffect, useRef } from "react";
import { loadRekonExportRows } from "@/lib/loadRekonExportRows";
import Swal from "sweetalert2";

// Lazy-load PDF generator (~100KB) — only when user clicks Export
const lazyGenerateRekonPdf = (
  ...args: Parameters<typeof import("@/lib/generateRekonPdf").generateRekonPdf>
) => import("@/lib/generateRekonPdf").then((m) => m.generateRekonPdf(...args));

export function useRekonData() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalDraft, setTotalDraft] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [nominalDraft, setNominalDraft] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [allExportLoading, setAllExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const allExportController = useRef<AbortController | null>(null);
  useEffect(() => () => allExportController.current?.abort(), []);
  const handleExportAllExcel = async () => {
    if (allExportController.current) return;
    const controller = new AbortController();
    allExportController.current = controller;
    setAllExportLoading(true); setExportProgress("Mengambil data...");
    const filters = { search, startDate, endDate, status: statusFilter };
    try {
      const rows = await loadRekonExportRows(filters, fetch, (loaded, count) => setExportProgress(`${loaded}/${count} rekonsiliasi`), controller.signal);
      if (controller.signal.aborted) return;
      if (!rows.length) { await Swal.fire({ icon: "info", title: "Tidak ada data", text: "Tidak ada rekonsiliasi sesuai filter dan akses akun." }); return; }
      const { generateAllRekonExcel } = await import("@/lib/generateRekonExcel");
      if (!controller.signal.aborted) generateAllRekonExcel(rows, filters);
    } catch (error: any) {
      if (!controller.signal.aborted) await Swal.fire({ icon: "error", title: "Export dibatalkan", text: error.message });
    } finally {
      allExportController.current = null; setAllExportLoading(false); setExportProgress("");
    }
  };
  const [buktiBayarPreviewUrl, setBuktiBayarPreviewUrl] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchRekonData = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/rekon", window.location.origin);
      if (search) url.searchParams.set("q", search);
      if (startDate) url.searchParams.set("startDate", startDate);
      if (endDate) url.searchParams.set("endDate", endDate);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      url.searchParams.set("page", page.toString());
      url.searchParams.set("limit", limit.toString());

      const res = await fetch(url.toString());
      const json = await res.json();
      
      if (res.ok) {
        setData(json.data || []);
        setTotal(json.total || 0);
        setTotalDraft(json.totalDraft || 0);
        setTotalCompleted(json.totalCompleted || 0);
        setNominalDraft(json.nominalDraft || 0);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRekonData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, page, limit, statusFilter]);

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const handleDelete = async (item: any) => {
    const { isConfirmed } = await Swal.fire({
      title: "Hapus Data?",
      text: `Rekonsiliasi ${item.noRekonsiliasi} akan dihapus permanen!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      customClass: { popup: "rounded-[32px] font-sans", confirmButton: "rounded-xl px-6 py-3", cancelButton: "rounded-xl px-6 py-3" }
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/rekon?id=${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");

      Swal.fire({ icon: "success", title: "Terhapus!", timer: 1500, showConfirmButton: false, customClass: { popup: "rounded-[32px] font-sans" } });
      fetchRekonData();
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error.message, customClass: { popup: "rounded-[32px] font-sans" } });
    }
  };

  const loadExportItem = async (item: any) => {
    const res = await fetch('/api/rekon?id=' + encodeURIComponent(item.id), { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal membaca detail rekonsiliasi');
    return json.data;
  };
  const handleExcelExport = async (item: any) => {
    setExportLoading(true);
    try {
      const fresh = await loadExportItem(item);
      const { generateRekonExcel } = await import('@/lib/generateRekonExcel');
      generateRekonExcel([fresh], {});
    } catch (error: any) { Swal.fire({ icon: 'error', title: 'Export dibatalkan', text: error.message }); }
    finally { setExportLoading(false); }
  };
  const handleRowExport = async (item: any) => {
    setExportLoading(true);
    setPreviewItem(item);
    try {
      const fresh = await loadExportItem(item);
      setPreviewItem(fresh);
      const blobUrl = await lazyGenerateRekonPdf(
        [fresh], // Kirim sebagai array dengan 1 item
        { search: "", startDate: "", endDate: "" }, // Info filter dikosongkan karena spesifik 1 data
        "preview"
      );

      if (blobUrl) {
        setPdfPreviewUrl(blobUrl as string);
      }
    } catch (err: any) {
      console.error("Export PDF Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Preview",
        text: err.message || "Terjadi kesalahan saat memproses PDF.",
        customClass: { popup: "rounded-[32px] font-sans" },
      });
    } finally {
      setExportLoading(false);
    }
  };

  return {
    data, setData,
    loading, setLoading,
    search, setSearch,
    startDate, setStartDate,
    endDate, setEndDate,
    statusFilter, setStatusFilter,
    page, setPage,
    limit, setLimit,
    total, totalDraft, totalCompleted, nominalDraft,
    setTotal,
    expandedRows, setExpandedRows,
    pdfPreviewUrl, setPdfPreviewUrl,
    previewItem, setPreviewItem,
    exportLoading, setExportLoading,
    buktiBayarPreviewUrl, setBuktiBayarPreviewUrl,
    toggleRow,
    fetchRekonData,
    formatRp,
    handleDelete,
    handleRowExport, handleExcelExport,
    handleExportAllExcel, allExportLoading, exportProgress,
    cancelAllExport: () => allExportController.current?.abort(),
  };
}
