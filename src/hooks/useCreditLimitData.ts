"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import { getDueDateZone, needsRemarks } from "@/lib/credit-limit";

export function useCreditLimitData({
  search,
  activeFilter,
  selectedNamaPt,
  selectedInisial,
  selectedTujuan,
  selectedStatus,
  tglFrom,
  tglTo,
}: {
  search: string;
  activeFilter: "all" | "pending" | "outdate";
  selectedNamaPt: string;
  selectedInisial: string;
  selectedTujuan: string;
  selectedStatus?: string;
  tglFrom: string;
  tglTo: string;
}) {
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detect user role & siteArea
  useEffect(() => {
    import("@/lib/me").then(({ getMe }) => {
      getMe().then((me) => {
        setUserRole(me?.role || null);
        setUserSiteArea(me?.siteArea || null);
      });
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/po?group=schedule_page&summary=true&includeItems=false&limit=5000&offset=0&sort=tglPo_desc",
        { cache: "no-store" },
      );
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Filter: Hanya yang sudah dijadwalkan (tglkirim ada)
      const eligible = list.filter((po: any) => !!po.tglkirim);

      setPoData(eligible);
    } catch (err) {
      console.error("Failed to fetch PO data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateKodeVendor = useCallback((id: string, val: string) => {
    setPoData((prev) =>
      prev.map((po) => (po.id === id ? { ...po, kodeVendor: val } : po)),
    );
  }, []);

  const handleAjukanCreditLimit = async (po: any) => {
    if (!po.kodeVendor || !po.kodeVendor.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Kode Vendor Kosong",
        text: "Silakan isi Kode Vendor terlebih dahulu sebelum mengajukan Credit Limit.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const zone = getDueDateZone(po.expiredTgl);
    const remarksRequired = needsRemarks(zone);

    const remarksLabel =
      zone === "early_extended"
        ? "Alasan terlambat mengajukan Credit Limit"
        : "Alasan baru mengajukan Credit Limit";

    const remarksHint =
      zone === "early_extended"
        ? "Pengajuan lebih awal dari jadwal normal (8–14 hari sebelum due date)."
        : "Pengajuan melewati batas normal (8–14 hari setelah due date).";

    const result = await Swal.fire({
      title: "Ajukan Credit Limit?",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-500">PO <b class="text-slate-700">#${po.noPo}</b> akan diajukan untuk proses Credit Limit.</p>
          
          ${
            remarksRequired
              ? `
            <div class="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500 shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <span class="text-xs text-amber-700 font-medium">${remarksHint}</span>
            </div>`
              : ''
          }
          <div class="space-y-1.5 mt-3">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan / Remarks <span class="text-rose-500">*</span></label>
            <textarea id="cl-remarks" class="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none h-24" placeholder="Ketik alasan / catatan pengajuan di sini..."></textarea>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Ajukan!",
      cancelButtonText: "Batal",
      reverseButtons: true,
      background: "#ffffff",
      customClass: {
        popup: "rounded-[32px] border border-slate-100 shadow-2xl p-8",
        title:
          "text-slate-900 font-black uppercase tracking-tight text-xl mb-4",
        confirmButton:
          "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg shadow-indigo-200 transition-all active:scale-95",
        cancelButton:
          "rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 py-4 transition-all active:scale-95",
      },
      preConfirm: () => {
        const remarks = (
          document.getElementById("cl-remarks") as HTMLTextAreaElement
        )?.value;
        if (!remarks || !remarks.trim()) {
          Swal.showValidationMessage("Mohon isi catatan / remarks pengajuan");
          return false;
        }
        return { remarks: remarks.trim() };
      },
    });

    if (!result.isConfirmed) return;

    const { remarks } = result.value as { remarks: string | null };

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id, action: "request", remarks }),
      });

      if (!res.ok) {
        throw new Error("Gagal mengajukan credit limit");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil Diajukan!",
        text: "PO telah dikirim ke halaman Approval Credit Limit.",
        timer: 2000,
        showConfirmButton: false,
        background: "#ffffff",
        customClass: {
          popup: "rounded-[32px] border border-slate-100 shadow-2xl",
        },
      });

      // Hapus PO yang barusan diajukan dari list state
      setPoData((prev) => prev.filter((item) => item.id !== po.id));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Terjadi kesalahan sistem",
      });
    }
  };

  const filteredPo = useMemo(() => {
    // Tahap 1: Filter berdasarkan Card yang diklik
    let categoryFiltered = poData;
    if (activeFilter === "pending") {
      categoryFiltered = poData.filter(
        (po) =>
          (!po.statusCreditLimit || po.statusCreditLimit === "REJECTED") &&
          getDueDateZone(po.expiredTgl) === "normal",
      );
    } else if (activeFilter === "outdate") {
      categoryFiltered = poData.filter(
        (po) =>
          (!po.statusCreditLimit || po.statusCreditLimit === "REJECTED") &&
          needsRemarks(getDueDateZone(po.expiredTgl)),
      );
    } else {
      // activeFilter === "all" (Total Credit Limit): Menampilkan SEMUA PO (baik diajukan maupun belum diajukan)
      categoryFiltered = poData;
    }

    // Tahap 1.5: Filter berdasarkan Status Dropdown (jika dipilih)
    if (selectedStatus) {
      if (selectedStatus === "PENDING") {
        categoryFiltered = categoryFiltered.filter(
          (po) => !po.statusCreditLimit || po.statusCreditLimit === "REJECTED",
        );
      } else if (selectedStatus === "WAITING_PUSAT") {
        categoryFiltered = categoryFiltered.filter(
          (po) => po.statusCreditLimit === "REQUESTED",
        );
      } else if (selectedStatus === "WAITING_DIREKSI") {
        categoryFiltered = categoryFiltered.filter(
          (po) => po.statusCreditLimit === "APPROVED",
        );
      } else if (selectedStatus === "COMPLETED") {
        categoryFiltered = categoryFiltered.filter(
          (po) => po.statusCreditLimit === "APPROVED_DIREKSI",
        );
      }
    }

    // Tahap 2: Filter berdasarkan Combobox (Ritel, Inisial, Tujuan)
    if (selectedNamaPt) {
      categoryFiltered = categoryFiltered.filter((po) => po.RitelModern?.namaPt === selectedNamaPt);
    }
    if (selectedInisial) {
      categoryFiltered = categoryFiltered.filter((po) => po.RitelModern?.inisial === selectedInisial);
    }
    if (selectedTujuan) {
      categoryFiltered = categoryFiltered.filter((po) => po.tujuanDetail === selectedTujuan);
    }

    // Tahap 3: Filter berdasarkan Periode (tglPo)
    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      categoryFiltered = categoryFiltered.filter((po) => new Date(po.tglPo) >= fromDate);
    }
    if (tglTo) {
      const toDate = new Date(tglTo);
      toDate.setHours(23, 59, 59, 999);
      categoryFiltered = categoryFiltered.filter((po) => new Date(po.tglPo) <= toDate);
    }

    // Tahap 4: Filter berdasarkan Search Bar
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
  }, [poData, activeFilter, selectedStatus, search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  // Reset pagination to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilter, selectedStatus, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  // Compute paginated slice
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPo.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPo, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPo.length / itemsPerPage);

  // Stats for 3 info cards
  const stats = useMemo(() => {
    const unsubmitted = poData.filter(
      (po) => !po.statusCreditLimit || po.statusCreditLimit === "REJECTED",
    );
    const normal = unsubmitted.filter(
      (po) => getDueDateZone(po.expiredTgl) === "normal",
    ).length;
    const remarksNeeded = unsubmitted.filter((po) =>
      needsRemarks(getDueDateZone(po.expiredTgl)),
    ).length;
    return {
      total: poData.length, // Menampilkan total SEMUA PO (diajukan + belum diajukan)
      normal,
      remarksNeeded,
    };
  }, [poData]);

  return {
    loading,
    userRole,
    userSiteArea,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    paginatedPOs,
    filteredPo,
    stats,
    handleUpdateKodeVendor,
    handleAjukanCreditLimit,
  };
}
