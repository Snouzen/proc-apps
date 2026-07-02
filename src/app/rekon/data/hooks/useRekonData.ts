import { useState, useEffect } from "react";
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

  const handleRowExport = async (item: any) => {
    setExportLoading(true);
    setPreviewItem(item);
    try {
      const blobUrl = await lazyGenerateRekonPdf(
        [item], // Kirim sebagai array dengan 1 item
        { search: "", startDate: "", endDate: "" }, // Info filter dikosongkan karena spesifik 1 data
        "preview"
      );

      if (blobUrl) {
        setPdfPreviewUrl(blobUrl as string);
      }
    } catch (err) {
      console.error("Export PDF Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Preview",
        text: "Terjadi kesalahan saat memproses PDF.",
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
    handleRowExport
  };
}
