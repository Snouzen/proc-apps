import { applySavedShipment } from "@/lib/scheduleShipmentState";
import { saveScheduleRequest, showScheduleError } from "@/lib/scheduleErrorPopup";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  const [savingBatchPoId, setSavingBatchPoId] = useState<string | null>(null);
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
  const [fetchError, setFetchError] = useState<string | null>(null);

  const dataRevision = useRef(0);
  const latestFetch = useRef(0);
  const applyConfirmedPcs = (poId: string, changes: Array<{ itemId: string; pcsKirim: number }>) => {
    dataRevision.current++;
    setPoData(prev => prev.map(po => po.id === poId ? applySavedShipment(po, changes) : po));
  };

  const fetchData = useCallback(async (silent = false) => {
    const requestId = ++latestFetch.current;
    const revision = dataRevision.current;
    if (!silent) setLoading(true);
    setFetchError(null);
    try {
      const pageSize = 1000;
      let offset = 0;
      let allItems: any[] = [];
      let total = 0;

      do {
        const res = await fetch(
          `/api/po?group=schedule_page&summary=true&includeItems=false&limit=${pageSize}&offset=${offset}&sort=tglPo_desc`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const msg = errData?.error || `Gagal memuat data jadwal (HTTP ${res.status})`;
          throw new Error(msg);
        }
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        allItems = allItems.concat(list);
        total = typeof data?.total === "number" ? data.total : list.length;
        offset += list.length;

        if (list.length < pageSize || allItems.length >= total) {
          break;
        }
      } while (offset < total);

      if (requestId === latestFetch.current && revision === dataRevision.current) setPoData(allItems);
    } catch (err: any) {
      console.error("Failed to fetch PO data:", err);
      const msg = err instanceof Error ? err.message : "Gagal mengambil data jadwal PO";
      if (requestId === latestFetch.current && revision === dataRevision.current) {
        setFetchError(msg);
        if (!silent) setPoData([]);
      }
    } finally {
      if (!silent && requestId === latestFetch.current) setLoading(false);
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
      await showScheduleError(new Error("Mohon isi tanggal pengiriman terlebih dahulu."), "Form Belum Lengkap", "/api/po/schedule", "SCHEDULE_DATE_REQUIRED");
      return;
    }

    setUpdatingId(selectedPo.id);

    try {
      await saveScheduleRequest("/api/po/schedule", {
        id: selectedPo.id,
        tglKirim: selectedDate ? format(new Date(selectedDate), "yyyy-MM-dd") : null,
        namaSupir, platNomor,
      });
      {
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
      }
    } catch (err: any) {
      console.error("Update Schedule Error:", err);
      await showScheduleError(err, "Gagal Update", "/api/po/schedule");
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
      await showScheduleError(new Error(`Item ${targetItem.namaProduk} maks: ${maxPcs}`), "Pcs Kirim Melebihi Pesanan", "/api/po/pcs-kirim", "PCS_EXCEEDS_ORDER");
      fetchData();
      return;
    }

    if (!Number.isInteger(pcs) || pcs < 0) {
      await showScheduleError(new Error("PCS kirim wajib bilangan bulat minimal 0."), "Input Tidak Valid", "/api/po/pcs-kirim", "PCS_INVALID");
      return;
    }

    setSavingPcsId(itemId);
    try {
      await saveScheduleRequest("/api/po/pcs-kirim", { id: poId, itemId, pcsKirim: pcs });
      {
        applyConfirmedPcs(poId, [{ itemId, pcsKirim: pcs }]);
      }
    } catch (err) {
      console.error("Update Item Pcs Kirim failed:", err);
      await showScheduleError(err, "Gagal Menyimpan PCS Kirim", "/api/po/pcs-kirim");
    } finally {
      setSavingPcsId(null);
    }
  };

  const handleUpdatePcsKirim = async (id: string, value: string) => {
    const pcs = Number(value);
    const targetPo = poData.find((p) => p.id === id);
    if (!targetPo) return false;

    const maxPcs = Number(targetPo.pcsTotal || 0);

    if (pcs > maxPcs) {
      await showScheduleError(new Error(`Maksimum yang diizinkan: ${maxPcs}`), "Pcs Kirim Melebihi Pesanan", "/api/po/pcs-kirim", "PCS_EXCEEDS_ORDER");
      fetchData(true); 
      return false;
    }

    if (!value.trim() || !Number.isInteger(pcs) || pcs < 0) {
      await showScheduleError(new Error("PCS kirim wajib bilangan bulat minimal 0."), "Input Tidak Valid", "/api/po/pcs-kirim", "PCS_INVALID");
      return false;
    }

    setSavingPcsId(id);
    try {
      await saveScheduleRequest("/api/po/pcs-kirim", { id, pcsKirim: pcs });
      {
        applyConfirmedPcs(id, (targetPo.Items || []).map((item: any) => ({ itemId: item.id, pcsKirim: pcs })));
        return true;
      }
    } catch (err) {
      console.error("Update Pcs Kirim failed:", err);
      await showScheduleError(err, "Gagal Menyimpan PCS Kirim", "/api/po/pcs-kirim");
    } finally {
      setSavingPcsId(null);
    }
    return false;
  };

  const handleBatchUpdateItemPcsKirim = async (
    poId: string,
    itemsToUpdate: Array<{ itemId: string; pcsKirim: number }>
  ) => {
    const targetPo = poData.find((p) => p.id === poId);
    if (!targetPo) return;

    // 1. Validasi batas pesanan per item
    for (const item of itemsToUpdate) {
      const origItem = targetPo.Items?.find((it: any) => it.id === item.itemId);
      const maxPcs = Number(origItem?.pcs || 0);
      if (item.pcsKirim > maxPcs) {
        await showScheduleError(new Error(`Item ${origItem?.namaProduk || "produk"} maksimum: ${maxPcs}`), "Pcs Kirim Melebihi Pesanan", "/api/po/pcs-kirim", "PCS_EXCEEDS_ORDER");
        return;
      }
    }

    setSavingBatchPoId(poId);

    // 3. Simpan ke database via Batch API
    try {
      await saveScheduleRequest("/api/po/pcs-kirim", { id: poId, items: itemsToUpdate });
      applyConfirmedPcs(poId, itemsToUpdate);
      {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Pcs Kirim Berhasil Disimpan",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        // Saved row is already synchronized; do not reload the entire PO list.
      }
    } catch (err: any) {
      console.error("Batch update Pcs Kirim failed:", err);
      await showScheduleError(err, "Gagal Menyimpan PCS Kirim", "/api/po/pcs-kirim");
    } finally {
      setSavingBatchPoId(null);
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
    fetchError,
    search, setSearch,
    updatingId, setUpdatingId,
    selectedDate, setSelectedDate,
    modalOpen, setModalOpen,
    selectedPo, setSelectedPo,
    namaSupir, setNamaSupir,
    platNomor, setPlatNomor,
    savingPcsId, setSavingPcsId,
    savingBatchPoId, setSavingBatchPoId,
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
    handleBatchUpdateItemPcsKirim,
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
