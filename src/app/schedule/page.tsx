"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Search,
  Truck,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  MapPin,
  X,
  FileDown,
  Eye,
  RotateCcw,
  ChevronDown,
  PencilLine,
} from "lucide-react";
import { getMe } from "@/lib/me";
import { format } from "date-fns";
import DateInputHybrid from "@/components/DateInputHybrid";
import PODetailModal from "@/components/po-detail-modal";
// Lazy-loaded: jsPDF is ~100KB, only needed when user clicks download/preview
const lazyGenerateInvoicePdf = (
  ...args: Parameters<typeof import("@/lib/generateInvoice").generateInvoicePdf>
) => import("@/lib/generateInvoice").then((m) => m.generateInvoicePdf(...args));
import Swal from "sweetalert2";

// ── Helper: strip junk site area text ──────────────────────────────────────
function cleanSiteArea(val?: string | null): string {
  if (!val) return "-";
  const lower = val.trim().toLowerCase();
  if (
    lower === "unknown" ||
    lower === "" ||
    lower.includes("unit produksi") ||
    lower.includes("belum ada")
  )
    return "-";
  return val.trim();
}

// ── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      {["w-8", "w-48", "w-16", "w-24", "w-24", "w-24", "w-28", "w-24"].map(
        (w, i) => (
          <td key={i} className="px-5 py-3.5">
            <div className={`h-3.5 bg-slate-100 rounded-md ${w}`} />
          </td>
        ),
      )}
    </tr>
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [namaSupir, setNamaSupir] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [savingPcsId, setSavingPcsId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // -- Action State --
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // -- Filter State --
  const [activeFilter, setActiveFilter] = useState<
    "all" | "scheduled" | "unscheduled"
  >("all");

  // -- Pagination State --
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Limit to 500 active POs to prevent loading thousands of records
      const res = await fetch(
        "/api/po?group=active&summary=true&includeItems=false&limit=500&offset=0&sort=tglPo_desc",
        { cache: "no-store" },
      );
      const data = await res.json();
      // API paged path returns { data, total }; no-limit path returns array
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setPoData(list);
    } catch (err) {
      console.error("Failed to fetch PO data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMe().then(() => {});
    fetchData();
  }, [fetchData]);

  const handleUpdateSchedule = async () => {
    if (!selectedPo || !selectedDate) {
      Swal.fire({
        icon: "warning",
        title: "Form Belum Lengkap",
        text: "Mohon isi tanggal pengiriman terlebih dahulu.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    setUpdatingId(selectedPo.id);

    try {
      const res = await fetch("/api/po/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPo.id,
          // Gunakan format YYYY-MM-DD agar lolos validasi regex di backend
          tglKirim: selectedDate
            ? format(new Date(selectedDate), "yyyy-MM-dd")
            : null,
          // [PENGAMAN] Gunakan ternary operator agar tidak crash saat data undefined
          namaSupir: namaSupir ? String(namaSupir).trim() : null,
          platNomor: platNomor ? String(platNomor).trim() : null,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Jadwal pengiriman telah diperbarui.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || errData.message || "Gagal menyimpan ke server",
        );
      }
    } catch (err: any) {
      console.error("Update Schedule Error:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal Update",
        text: err.message || "Terjadi kesalahan sistem, silakan coba lagi.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdateItemPcsKirim = async (poId: string, itemId: string, value: string) => {
    const pcs = Number(value);
    const targetPo = poData.find((p) => p.id === poId);
    if (!targetPo) return;

    const targetItem = targetPo.Items?.find((it: any) => it.id === itemId);
    if (!targetItem) return;

    const maxPcs = Number(targetItem.pcs || 0);

    if (pcs > maxPcs) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Pcs Kirim melebihi Pcs PO!",
        text: `Item ${targetItem.namaProduk} maks: ${maxPcs}`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#fff1f2", // rose-50
      });
      fetchData();
      return;
    }

    if (isNaN(pcs) || pcs < 0) return;

    setSavingPcsId(itemId);
    try {
      const res = await fetch("/api/po/pcs-kirim", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: poId, itemId, pcsKirim: pcs }),
      });

      if (res.ok) {
        // Refetch to sync aggregate totals (pcsKirimTotal)
        fetchData();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal update Pcs Kirim Item");
      }
    } catch (err) {
      console.error("Update Item Pcs Kirim failed:", err);
    } finally {
      setSavingPcsId(null);
    }
  };

  const handleUpdatePcsKirim = async (id: string, value: string) => {
    const pcs = Number(value);
    const targetPo = poData.find((p) => p.id === id);
    if (!targetPo) return;

    const maxPcs = Number(targetPo.pcsTotal || 0);

    // Strict Rule: PCS Kirim cannot exceed PCS Total
    if (pcs > maxPcs) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Pcs Kirim melebihi Pcs PO!",
        text: `Maksimum yang diizinkan: ${maxPcs}`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#fff1f2", // rose-50
      });
      // Rollback UI state to previous value or max value
      fetchData(); 
      return;
    }

    if (isNaN(pcs) || pcs < 0) return;

    setSavingPcsId(id);
    try {
      const res = await fetch("/api/po/pcs-kirim", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pcsKirim: pcs }),
      });

      if (res.ok) {
        // Refetch to sync aggregate totals (pcsKirimTotal)
        fetchData();
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal update Pcs Kirim");
      }
    } catch (err) {
      console.error("Update Pcs Kirim failed:", err);
    } finally {
      setSavingPcsId(null);
    }
  };

  const handleRejectPo = async (po: any) => {
    const result = await Swal.fire({
      title: "Reject PO?",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-500 italic">PO #${po.noPo} akan dikembalikan ke antrean pusat.</p>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alasan Reject (Remarks)</label>
            <textarea id="reject-remarks" class="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all resize-none h-24" placeholder="Contoh: Salah input unit, revisi qty, dll..."></textarea>
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48", // rose-600
      cancelButtonColor: "#64748b", // slate-500
      confirmButtonText: "Ya, Reject PO",
      cancelButtonText: "Batal",
      reverseButtons: true,
      background: "#ffffff",
      customClass: {
        popup: "rounded-[32px] border border-slate-100 shadow-2xl p-8",
        title: "text-slate-900 font-black uppercase tracking-tight text-xl mb-4",
        confirmButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg shadow-rose-200 transition-all active:scale-95",
        cancelButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all active:scale-95",
      },
      preConfirm: () => {
        const remarks = (document.getElementById("reject-remarks") as HTMLTextAreaElement).value;
        if (!remarks.trim()) {
          Swal.showValidationMessage("Mohon isi alasan reject");
          return false;
        }
        return remarks;
      }
    });

    if (!result.isConfirmed) return;
    const rejectRemarks = result.value;

    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });

    setUpdatingId(po.id);
    try {
      const res = await fetch("/api/po/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: po.id, remarks: rejectRemarks }),
      });

      const data = await res.json();
      if (res.ok) {
        // [UX FIX] Instant UI Removal: Hapus data dari state lokal secara instan
        setPoData((prev) => prev.filter((item) => item.id !== po.id));

        Toast.fire({
          icon: "success",
          title: "PO Berhasil Direject!",
          text: "Data telah dikembalikan ke antrean pusat.",
          background: "#ecfdf5", // emerald-50
        });

        // Trigger Revalidation server-side
        router.refresh();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal Reject",
          text: data.error || "Terjadi kesalahan pada server.",
          confirmButtonColor: "#6366f1",
        });
      }
    } catch (err) {
      console.error("Reject failure:", err);
      Toast.fire({
        icon: "error",
        title: "Kesalahan Network",
        background: "#fff1f2", // rose-50
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadInvoice = async (po: any) => {
    // Memastikan data item lengkap sebelum generate
    if (!po.Items || po.Items.length === 0) {
      try {
        const res = await fetch(
          `/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true&limit=1`,
          { cache: "no-store" },
        );
        const data = await res.json();
        const fullPo = Array.isArray(data?.data)
          ? data.data[0]
          : Array.isArray(data)
            ? data[0]
            : null;
        if (fullPo) {
          await lazyGenerateInvoicePdf(fullPo, "download");
          return;
        }
      } catch (err) {
        console.error("Failed to fetch full PO for invoice:", err);
      }
    }
    await lazyGenerateInvoicePdf(po, "download");
  };

  const handlePreviewPdf = async (po: any) => {
    let targetPo = po;
    if (!po.Items || po.Items.length === 0) {
      try {
        const res = await fetch(
          `/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true&limit=1`,
          { cache: "no-store" },
        );
        const data = await res.json();
        const fullPo = Array.isArray(data?.data)
          ? data.data[0]
          : Array.isArray(data)
            ? data[0]
            : null;
        if (fullPo) targetPo = fullPo;
      } catch (err) {
        console.error("Failed to fetch full PO for preview:", err);
      }
    }
    const blobUrl = await lazyGenerateInvoicePdf(targetPo, "preview");
    if (blobUrl) setPdfPreviewUrl(blobUrl as string);
  };

  const handleViewRow = async (po: any) => {
    setSelectedPo(po);
    setDetailData(po); // base instant fallback
    setIsViewOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true&limit=1`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const first = Array.isArray(data?.data)
        ? data.data[0]
        : Array.isArray(data)
          ? data[0]
          : null;
      if (first) {
        setDetailData(first);
      }
    } catch (err) {
      console.error("Failed to fetch detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredPo = useMemo(() => {
    // Tahap 1: Filter berdasarkan Card yang diklik
    let categoryFiltered = poData;
    if (activeFilter === "scheduled") {
      categoryFiltered = poData.filter((po) => po.tglkirim);
    } else if (activeFilter === "unscheduled") {
      categoryFiltered = poData.filter((po) => !po.tglkirim);
    }

    // Tahap 2: Filter berdasarkan Search Bar
    if (!search.trim()) return categoryFiltered;

    const query = search.toLowerCase();
    return categoryFiltered.filter((po) => {
      const siteArea = String(
        po.UnitProduksi?.siteArea || po.siteArea || "",
      ).toLowerCase();
      const company = String(
        po.RitelModern?.namaPt || po.company || "",
      ).toLowerCase();
      const inisial = String(po.RitelModern?.inisial || "").toLowerCase();
      const noPo = String(po.noPo || "").toLowerCase();
      const noInvoice = String(po.noInvoice || "").toLowerCase();
      return (
        siteArea.includes(query) ||
        company.includes(query) ||
        inisial.includes(query) ||
        noPo.includes(query) ||
        noInvoice.includes(query)
      );
    });
  }, [poData, activeFilter, search]);

  const stats = useMemo(() => {
    // poData sudah difilter ke group=active (noInvoice kosong) dari API
    // Hitung langsung dari seluruh data yang diterima tanpa limit
    const total = poData.length;
    const scheduled = poData.filter((po) => po.tglkirim).length;
    const pending = poData.filter((po) => !po.tglkirim).length;
    return { total, scheduled, pending };
  }, [poData]);

  // Reset pagination to page 1 whenever search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter]);

  // Compute paginated slice from the `filteredPo` array
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPo.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPo, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPo.length / itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-7">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Delivery Scheduling
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage delivery schedules for your purchase orders.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="Search No PO, Site, Company..."
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all w-full md:w-72 shadow-sm text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            id: "all",
            label: "Total PO",
            value: stats.total,
            icon: <Truck size={18} className="text-blue-500" />,
            bg: "bg-blue-50",
            text: "text-blue-600",
            ring: "ring-blue-500",
          },
          {
            id: "scheduled",
            label: "Sudah Dijadwalkan",
            value: stats.scheduled,
            icon: <CalendarCheck size={18} className="text-emerald-500" />,
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            ring: "ring-emerald-500",
          },
          {
            id: "unscheduled",
            label: "Belum Dijadwalkan",
            value: stats.pending,
            icon: <Clock size={18} className="text-amber-500" />,
            bg: "bg-amber-50",
            text: "text-amber-600",
            ring: "ring-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.id}
            onClick={() => setActiveFilter(stat.id as any)}
            className={`cursor-pointer bg-white px-5 py-4 rounded-2xl border border-slate-100 flex items-center gap-4 transition-all duration-200 ${
              activeFilter === stat.id
                ? `ring-2 ${stat.ring} shadow-md scale-[1.02]`
                : "hover:bg-slate-50 shadow-sm"
            }`}
          >
            <div className={`p-2.5 rounded-xl ${stat.bg} shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[50px]">
                  No
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[260px]">
                  Purchase Order
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[90px]">
                  Inisial
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[160px]">
                  Site Area
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[200px]">
                  Tujuan
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[120px]">
                  Tgl PO
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[120px]">
                  Due Date
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-[160px]">
                  Status
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center w-[80px]">
                  Pcs
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center w-[110px]">
                  Pcs Kirim
                </th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right w-[120px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginatedPOs.length > 0 ? (
                paginatedPOs.map((po, index) => {
                  const itemsCount = Number(po.itemsCount || 0);
                  const isMulti = itemsCount > 1;
                  const isExpanded = expandedRows.has(po.id);
                  
                  const site = cleanSiteArea(
                    po.UnitProduksi?.siteArea || po.siteArea,
                  );
                  const isScheduled = !!po.tglkirim;

                  return (
                    <Fragment key={po.id}>
                    <tr
                      onClick={() => handleViewRow(po)}
                      className={`border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-all duration-150 group align-top ${isExpanded ? "bg-indigo-50/30" : ""}`}
                    >
                      {/* No */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400 font-medium">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      {/* PO Info */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-800 text-sm leading-tight">
                          {po.noPo}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[230px]">
                          {po.RitelModern?.namaPt || "-"}
                        </p>
                      </td>

                      {/* Inisial */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[10px] font-black uppercase tracking-widest">
                          {po.RitelModern?.inisial || "-"}
                        </span>
                      </td>

                      {/* Site Area — with junk guard */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {site !== "-" && (
                            <MapPin
                              size={11}
                              className="text-slate-300 shrink-0"
                            />
                          )}
                          <span
                            className={`text-xs font-medium ${site === "-" ? "text-slate-300" : "text-slate-600"}`}
                          >
                            {site}
                          </span>
                        </div>
                      </td>

                      {/* Tujuan */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-xs text-slate-600 font-medium truncate max-w-[200px]" title={po.tujuanDetail || "-"}>
                          {po.tujuanDetail || "-"}
                        </p>
                      </td>

                      {/* Tgl PO */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                        {po.tglPo
                          ? format(new Date(po.tglPo), "dd MMM yyyy")
                          : "-"}
                      </td>

                      {/* Due Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs tabular-nums">
                        <span
                          className={`font-bold ${
                            po.expiredTgl &&
                            new Date(po.expiredTgl).getTime() - Date.now() <=
                              3 * 24 * 60 * 60 * 1000
                              ? "text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {po.expiredTgl
                            ? format(new Date(po.expiredTgl), "dd MMM yyyy")
                            : "-"}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {isScheduled ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-bold">
                            <AlertCircle size={11} />
                            {format(new Date(po.tglkirim), "dd/MM/yy")}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg text-[10px] font-medium">
                            <Clock size={11} />
                            Belum Dijadwalkan
                          </div>
                        )}
                      </td>

                      {/* Kolom Pcs (Read-only) */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-center font-bold text-slate-600 text-xs">
                        {Number(po.pcsTotal || 0).toLocaleString("id-ID")}
                      </td>

                      <td
                        className="px-5 py-3.5 whitespace-nowrap text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isMulti ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="inline-flex items-center justify-center w-24 px-2 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold tabular-nums">
                              {Number(po.pcsKirimTotal || 0).toLocaleString("id-ID")}
                            </span>
                            <button 
                              onClick={() => toggleRow(po.id)}
                              className={`p-1.5 rounded-lg transition-all active:scale-95 shadow-sm border ${
                                isExpanded 
                                ? "bg-rose-500 text-white border-rose-600 shadow-rose-100" 
                                : "bg-white text-indigo-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-slate-100"
                              }`}
                              title={isExpanded ? "Tutup" : "Breakdown PO"}
                            >
                              {isExpanded ? <X size={10} strokeWidth={4} /> : <PencilLine size={10} strokeWidth={3} />}
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block group/input">
                            <input
                              type="number"
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              min="0"
                              max={po.pcsTotal || 0}
                              value={po.pcsKirimTotal ?? 0}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value.toString()) || 0;
                                handleUpdatePcsKirim(po.id, val.toString());
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              disabled={savingPcsId === po.id}
                              className={`w-24 px-2 py-1.5 text-xs font-bold text-center bg-slate-50 border rounded-lg outline-none transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                Number(po.pcsKirimTotal) > Number(po.pcsTotal)
                                  ? "border-rose-500 text-rose-600 bg-rose-50 shadow-[0_0_8px_rgba(225,29,72,0.2)]"
                                  : savingPcsId === po.id
                                  ? "border-amber-400 bg-amber-50 text-amber-700 animate-pulse"
                                  : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white text-slate-700"
                              }`}
                              onChange={(e) => {
                                const val = e.target.value;
                                const numVal = Number(val);
                                const max = Number(po.pcsTotal || 0);
                                const finalVal = numVal > max ? max.toString() : val;

                                setPoData((prev) => prev.map((p) => p.id === po.id ? { ...p, pcsKirimTotal: finalVal } : p));
                              }}
                            />
                            {savingPcsId !== po.id && Number(po.pcsKirimTotal) > 0 && (
                              <div
                                className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm"
                                title="Tersimpan"
                              />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td
                        className="px-5 py-3.5 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPo(po);
                              setSelectedDate(
                                po.tglkirim ? po.tglkirim.split("T")[0] : "",
                              );
                              setNamaSupir(po.namaSupir || "");
                              setPlatNomor(po.platNomor || "");
                              setModalOpen(true);
                            }}
                            disabled={updatingId === po.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 shadow-sm active:scale-95 ${
                              isScheduled
                                ? "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-600 hover:text-white hover:border-slate-600"
                                : "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                            }`}
                          >
                            <Calendar size={12} />
                            {isScheduled ? "Update" : "Set Schedule"}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectPo(po);
                            }}
                            disabled={updatingId === po.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all text-[11px] font-bold shadow-sm active:scale-95 whitespace-nowrap"
                            title="Reject / Unassign PO"
                          >
                            {updatingId === po.id ? (
                              <div className="w-3 h-3 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
                            ) : (
                              <RotateCcw size={12} />
                            )}
                            Reject
                          </button>

                          {isScheduled && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewPdf(po);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all text-[10px] border border-slate-200 shadow-sm active:scale-95 whitespace-nowrap"
                                title="Preview Invoice"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadInvoice(po);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-all text-[10px] border border-indigo-200 shadow-sm active:scale-95 whitespace-nowrap"
                                title="Download Invoice"
                              >
                                <FileDown size={12} />
                                Faktur Penjualan
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && po.Items && (
                      <tr className="bg-slate-50/10" onClick={(e) => e.stopPropagation()}>
                        <td colSpan={14} className="px-5 py-6">
                          <div className="bg-white border-2 border-indigo-100 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-200/10 mx-4">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-12">Product Breakdown</th>
                                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Order</th>
                                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Kirim</th>
                                  <th className="px-12 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.Items.map((item: any, idx: number) => (
                                  <tr key={item.id} className={idx !== po.Items.length - 1 ? "border-b border-slate-50" : ""}>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-700 pl-12">
                                      {item.namaProduk}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs font-black text-slate-300">
                                      {item.pcs}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="relative inline-block">
                                        <input
                                          type="number"
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                          min={0}
                                          max={item.pcs}
                                          value={item.pcsKirim}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const numVal = Number(val);
                                            const finalVal = numVal > item.pcs ? item.pcs : numVal;
                                            setPoData(prev => prev.map(p => 
                                              p.id === po.id 
                                              ? { ...p, Items: p.Items.map((it: any) => it.id === item.id ? { ...it, pcsKirim: finalVal } : it) } 
                                              : p
                                            ));
                                          }}
                                          onBlur={(e) => handleUpdateItemPcsKirim(po.id, item.id, e.target.value)}
                                          className="w-24 px-3 py-1.5 text-center text-xs font-black bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-12 py-4 text-right">
                                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${item.pcsKirim >= item.pcs ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                        {item.pcsKirim >= item.pcs ? "Full" : "Partial"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <CalendarDays size={28} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          Tidak ada data
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Semua PO sudah dijadwalkan atau tidak ada yang cocok.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* -- Pagination Controls -- */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan{" "}
              <span className="font-bold text-slate-700">
                {paginatedPOs.length}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-700">
                {filteredPo.length}
              </span>{" "}
              data
            </span>
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-slate-600"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Halaman Pertama"
              >
                «
              </button>

              {/* Previous Page */}
              <button
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Sebelumnya"
              >
                ‹
              </button>

              {/* Info Page */}
              <div className="flex items-center justify-center px-4 py-1.5 min-w-[80px] text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg mx-1 tabular-nums">
                {currentPage} / {totalPages}
              </div>

              {/* Next Page */}
              <button
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-600"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                title="Selanjutnya"
              >
                ›
              </button>

              {/* Last Page */}
              <button
                className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-slate-600"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Halaman Terakhir"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[28px] w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Calendar className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Set Delivery Schedule
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    PO{" "}
                    <span className="font-semibold text-slate-600">
                      #{selectedPo?.noPo}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Tanggal Kirim
                </label>
                <DateInputHybrid
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="Pilih tanggal kirim..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Nama Supir{" "}
                  <span className="text-[10px] text-slate-300 normal-case font-normal">
                    (Opsional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama supir..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-800 placeholder:text-slate-300"
                  value={namaSupir}
                  onChange={(e) => setNamaSupir(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Plat Nomor{" "}
                  <span className="text-[10px] text-slate-300 normal-case font-normal">
                    (Opsional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: B 1234 ABC"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-800 placeholder:text-slate-300"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-7 pb-7">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-5 py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                disabled={!selectedDate || !!updatingId}
                onClick={handleUpdateSchedule}
                className="flex-1 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {updatingId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Simpan Jadwal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal (Component) ────────────────────────────────── */}
      <PODetailModal
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setDetailData(null);
        }}
        data={
          detailData
            ? {
                ...detailData,
                buktiKirim: detailData.buktiKirim,
                buktiFp: detailData.buktiFp,
                status: {
                  kirim: !!detailData.statusKirim,
                  sdif: !!detailData.statusSdif,
                  po: !!detailData.statusPo,
                  fp: !!detailData.statusFp,
                  kwi: !!detailData.statusKwi,
                  inv: !!detailData.statusInv,
                  tagih: !!detailData.statusTagih,
                  bayar: !!detailData.statusBayar,
                },
              }
            : null
        }
      />

      {/* ── Live Preview Modal ─────────────────────────────────────────── */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200">
          <div className="bg-slate-100 w-full max-w-5xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Eye className="text-indigo-600" size={18} />
                </div>
                <h3 className="font-bold text-slate-800">
                  Live Preview Invoice
                </h3>
              </div>
              <button
                onClick={() => setPdfPreviewUrl(null)}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* PDF Viewer (Iframe) */}
            <div className="flex-1 w-full h-full bg-slate-200">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
