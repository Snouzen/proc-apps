import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/me";
import { format } from "date-fns";
import Swal from "sweetalert2";

const lazyGenerateInvoicePdf = (
  ...args: Parameters<typeof import("@/lib/generateInvoice").generateInvoicePdf>
) => import("@/lib/generateInvoice").then((m) => m.generateInvoicePdf(...args));

export function useSchedule() {
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
  const [user, setUser] = useState<any>(null);

  // -- Filter State --
  const [activeFilter, setActiveFilter] = useState<
    "all" | "scheduled" | "unscheduled"
  >("all");

  // -- Pagination State --
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // -- Date & Sort Filter State --
  const [tglFrom, setTglFrom] = useState("");
  const [tglTo, setTglTo] = useState("");
  const [sortField, setSortField] = useState<"tglPo" | "expiredTgl" | "tglkirim" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/po?group=schedule_page&summary=true&includeItems=false&limit=500&offset=0&sort=tglPo_desc",
        { cache: "no-store" },
      );
      const data = await res.json();
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
    getMe().then((u) => {
      setUser(u);
    });
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
          tglKirim: selectedDate
            ? format(new Date(selectedDate), "yyyy-MM-dd")
            : null,
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

        if (user) {
          try {
            const statsRes = await fetch("/api/retur/stats");
            if (statsRes.ok) {
              const stats = await statsRes.json();
              if (stats.belum_diambil > 0) {
                await Swal.fire({
                  title: "📌 Pengingat Retur!",
                  html: `Anda memiliki <b>${stats.belum_diambil}</b> data retur yang <b>Belum Diambil</b>.<br/>Mohon pastikan untuk melakukan pengambilan barang retur segera.`,
                  icon: "info",
                  showCancelButton: true,
                  confirmButtonColor: "#4f46e5",
                  cancelButtonColor: "#94a3b8",
                  confirmButtonText: "Lihat Data Retur",
                  cancelButtonText: "Nanti Saja",
                  background: "#ffffff",
                  customClass: {
                    popup: "rounded-[32px] border border-slate-100 shadow-2xl",
                    confirmButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4",
                    cancelButton: "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4",
                  }
                }).then((result) => {
                  if (result.isConfirmed) {
                    router.push("/retur?status=BELUM DIAMBIL");
                  }
                });
              }
            }
          } catch (err) {
            console.error("Retur check failed", err);
          }
        }

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
        background: "#fff1f2",
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
        background: "#fff1f2",
      });
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
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
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
        setPoData((prev) => prev.filter((item) => item.id !== po.id));

        Toast.fire({
          icon: "success",
          title: "PO Berhasil Direject!",
          text: "Data telah dikembalikan ke antrean pusat.",
          background: "#ecfdf5",
        });

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
        background: "#fff1f2",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadInvoice = async (po: any) => {
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
    setDetailData(po);
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
    let result = poData;
    if (activeFilter === "scheduled") {
      result = poData.filter((po) => po.tglkirim);
    } else if (activeFilter === "unscheduled") {
      result = poData.filter((po) => !po.tglkirim);
    }

    if (tglFrom) {
      result = result.filter((po) => po.tglPo && new Date(po.tglPo) >= new Date(tglFrom));
    }
    if (tglTo) {
      const toDate = new Date(tglTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((po) => po.tglPo && new Date(po.tglPo) <= toDate);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((po) => {
        const siteArea = String(po.UnitProduksi?.siteArea || po.siteArea || "").toLowerCase();
        const company = String(po.RitelModern?.namaPt || po.company || "").toLowerCase();
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
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortField] ? new Date(a[sortField]).getTime() : 0;
        const bVal = b[sortField] ? new Date(b[sortField]).getTime() : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [poData, activeFilter, search, tglFrom, tglTo, sortField, sortOrder]);

  const stats = useMemo(() => {
    const emptyInv = ["", "-", "Unknown"];
    const hasNoInvoice = (po: any) => !po.noInvoice || emptyInv.includes(po.noInvoice);
    const noInvoicePOs = poData.filter(hasNoInvoice);
    const total = noInvoicePOs.length;
    const pending = noInvoicePOs.filter((po) => !po.tglkirim).length;
    const scheduled = poData.filter((po) => po.tglkirim).length;
    return { total, scheduled, pending };
  }, [poData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter, tglFrom, tglTo, sortField, sortOrder]);

  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPo.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPo, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPo.length / itemsPerPage);

  return {
    poData, setPoData,
    loading,
    search, setSearch,
    updatingId, setUpdatingId,
    selectedDate, setSelectedDate,
    modalOpen, setModalOpen,
    selectedPo, setSelectedPo,
    namaSupir, setNamaSupir,
    platNomor, setPlatNomor,
    savingPcsId, setSavingPcsId,
    expandedRows, setExpandedRows,
    isViewOpen, setIsViewOpen,
    loadingDetail, setLoadingDetail,
    detailData, setDetailData,
    pdfPreviewUrl, setPdfPreviewUrl,
    activeFilter, setActiveFilter,
    currentPage, setCurrentPage,
    itemsPerPage,
    fetchData,
    handleUpdateSchedule,
    toggleRow,
    handleUpdateItemPcsKirim,
    handleUpdatePcsKirim,
    handleRejectPo,
    handleDownloadInvoice,
    handlePreviewPdf,
    handleViewRow,
    filteredPo,
    paginatedPOs,
    stats,
    totalPages,
    tglFrom, setTglFrom,
    tglTo, setTglTo,
    sortField, setSortField,
    sortOrder, setSortOrder
  };
}
