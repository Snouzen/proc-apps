"use client";

import { useApprovalBatchPages } from "./useApprovalBatchPages";
import Swal from "sweetalert2";
import { useRef, useState } from "react";

export function useCreditLimitApproval({
  search,
  selectedNamaPt,
  selectedInisial,
  selectedTujuan,
  tglFrom,
  tglTo,
}: {
  search: string;
  selectedNamaPt: string;
  selectedInisial: string;
  selectedTujuan: string;
  tglFrom: string;
  tglTo: string;
}) {
  const pages = useApprovalBatchPages({ search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo });
  const { poData, setPoData, loading, role, expandedBatches, currentPage, setCurrentPage, fetchData, batchGroups, paginatedBatches, totalPages, toggleBatch } = pages;
  const filteredPo = poData;
  const [batchBusy, setBatchBusy] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const activeActions = useRef(new Set<string>());
  const exportActive = useRef(false);

  const approveFromServer = async (batchId: string, batchCode: string, stage: "pusat" | "direksi", poId?: string) => {
    if (activeActions.current.size || exportActive.current) return;
    activeActions.current.add(batchCode);
    setBatchBusy(prev => ({ ...prev, [batchCode]: true }));
    const post = async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/po/credit-limit/approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId, stage, poId, ...payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memproses approval batch.");
      return result;
    };
    try {
      void Swal.fire({ title: stage === "direksi" ? "Memeriksa Nomor ND..." : "Memeriksa Batch...", text: "Memeriksa data PO terbaru di server.", allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
      const checked = await post({ mode: "check" });
      Swal.close();
      if (!checked.ready) {
        await Swal.fire({ icon: "warning", title: "Nomor ND Belum Lengkap", text: `${checked.missingNdCount} PO belum memiliki No. ND: ${checked.missingNd.slice(0, 5).join(", ")}${checked.missingNdCount > 5 ? ", ..." : ""}. Lengkapi No. ND sebelum persetujuan Direksi.` });
        return;
      }
      const confirmed = await Swal.fire({ icon: "warning", title: stage === "pusat" ? "Approve Semua PO (Pusat)?" : poId ? "Setujui Credit Limit (Direksi)?" : "Approve Semua PO (Direksi)?", text: `${checked.targetCount} PO pada batch ${checked.batchCode} akan disetujui.`, showCancelButton: true, confirmButtonText: "Ya, Setujui", cancelButtonText: "Batal", confirmButtonColor: stage === "pusat" ? "#10b981" : "#4f46e5" });
      if (!confirmed.isConfirmed) return;
      void Swal.fire({ title: "Memproses Approval...", allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
      const result = await post({ mode: "approve", expectedSnapshot: checked.snapshot });
      Swal.close();
      pages.refreshBatches([batchCode]);
      await Swal.fire({ icon: "success", title: "Berhasil Disetujui!", text: `${result.count} PO telah disetujui.`, timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.close();
      pages.refreshBatches([batchCode]);
      await Swal.fire({ icon: "error", title: "Approval Belum Berhasil", text: error instanceof Error ? error.message : "Muat ulang status sebelum mencoba kembali." });
    } finally {
      activeActions.current.delete(batchCode);
      setBatchBusy(prev => ({ ...prev, [batchCode]: false }));
    }
  };

  // Non-approval actions such as Create ND still need complete detail.

  const requireBatchDetails = async (batchCode: string) => {
    try { return await pages.loadBatch(batchCode, true); }
    catch (error) { await Swal.fire({ icon: "error", title: "Detail Batch Belum Siap", text: error instanceof Error ? error.message : "Muat ulang detail sebelum memproses batch." }); return null; }
  };
  const withBatchDetails = async (batchCode: string, action: (pos: any[]) => void) => {
    const pos = await requireBatchDetails(batchCode);
    if (pos) action(pos);
  };

  const handleAction = async (po: any, action: "approve" | "approveDireksi" | "reject" | "reRequest") => {
    if (action === "approveDireksi") {
      const batchCode = po.CreditLimitBatch?.batchCode;
      if (!po.creditLimitBatchId || !batchCode) { await Swal.fire({ icon: "warning", title: "Muat Ulang Batch", text: "Identitas batch belum tersedia. Muat ulang detail PO." }); return; }
      await approveFromServer(po.creditLimitBatchId, batchCode, "direksi", po.id);
      return;
    }
    const isApprove = action === "approve";
    const isReRequest = action === "reRequest";
    
    let confirmText = "Setujui Credit Limit?";
    let successText = "Berhasil Disetujui!";
    let iconColor = "#10b981";
    let confirmBtnText = "Ya, Setujui!";
    
    if (isReRequest) {
      confirmText = "Ajukan Ulang Credit Limit?";
      successText = "Berhasil Diajukan Ulang!";
      iconColor = "#3b82f6";
      confirmBtnText = "Ya, Ajukan Ulang!";
    } else if (action === "reject") {
      confirmText = "Tolak Credit Limit?";
      successText = "Berhasil Ditolak!";
      iconColor = "#f43f5e";
      confirmBtnText = "Ya, Tolak!";
    }

    const result = await Swal.fire({
      title: confirmText,
      text: `PO #${po.noPo} akan di-${isApprove ? 'setujui' : isReRequest ? 'ajukan ulang' : 'tolak'} untuk Credit Limit.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: iconColor,
      cancelButtonColor: "#94a3b8",
      confirmButtonText: confirmBtnText,
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId: po.id, action }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Gagal memproses approval");
      }

      Swal.fire({
        icon: "success",
        title: successText,
        timer: 1500,
        showConfirmButton: false,
      });

      setPoData((prev) => {
        // Rule 4: Jika reject (baik oleh pusat maupun direksi), hilangkan dari tabel accordion approval
        if (action === "reject") {
          return prev.filter(item => item.id !== po.id);
        }
        
        return prev.map((item) =>
          item.id === po.id
            ? { 
                ...item, 
                statusCreditLimit: action === "approve" ? "APPROVED" : 
                                   action === "reRequest" ? "REQUESTED" : "REJECTED" 
              }
            : item
        );
      });
      pages.refreshForPoIds([po.id]);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err?.message || "Terjadi kesalahan sistem" });
    }
  };

  const handleToggleND = async (poId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic UI update
    setPoData((prev) =>
      prev.map((item) =>
        item.id === poId ? { ...item, isNotaDinas: newVal } : item
      )
    );

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, action: "toggleND", isNotaDinas: newVal }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan status ND");
      }
      pages.refreshForPoIds([poId]);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan status ND. Silakan coba lagi.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
      // Revert optimistic update
      setPoData((prev) =>
        prev.map((item) =>
          item.id === poId ? { ...item, isNotaDinas: currentVal } : item
        )
      );
    }
  };

  const handleUpdateNDDetails = async (poId: string, noNd: string, linkNd: string) => {
    // Optimistic UI update
    setPoData((prev) =>
      prev.map((item) =>
        item.id === poId ? { ...item, noNd, linkNd } : item
      )
    );

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId, action: "updateNDDetails", noNd, linkNd }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan detail ND");
      }
      
      pages.refreshForPoIds([poId]);
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Detail ND berhasil disimpan.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan detail ND. Silakan coba lagi.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
      pages.refreshForPoIds([poId]);
    }
  };

  const handleApproveAll = async (batchCode: string, _pos: any[]) => {
    const batch = batchGroups.find(item => item.batchCode === batchCode);
    if (!batch) return;
    await approveFromServer(batch.id, batchCode, batch.requestedCount > 0 ? "pusat" : "direksi");
  };

  const handleChecklistAllND = async (batchCode: string, _batchPos: any[], checked: boolean) => {
    const batchPos = await requireBatchDetails(batchCode);
    if (!batchPos) return;
    const modifiablePos = batchPos.filter(p => p.statusCreditLimit !== "APPROVED_DIREKSI");
    if (modifiablePos.length === 0) return;
    const poIds = modifiablePos.map(p => p.id);
    
    // Optimistic UI update
    setPoData((prev) =>
      prev.map((item) =>
        poIds.includes(item.id) ? { ...item, isNotaDinas: checked } : item
      )
    );

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poIds, action: "toggleAllND", isNotaDinas: checked }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan status ND massal");
      }
      pages.refreshBatches([batchCode]);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal menyimpan status ND. Silakan coba lagi.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000
      });
      // Revert optimistic update
      setPoData((prev) =>
        prev.map((item) => {
          if (poIds.includes(item.id)) {
            return { ...item, isNotaDinas: !checked };
          }
          return item;
        })
      );
    }
  };

  const handleExportExcel = async (batchCode?: string, _posToExport?: any[]) => {
    if (exportActive.current || activeActions.current.size) return;
    const batch = batchCode ? batchGroups.find(item => item.batchCode === batchCode) : null;
    if (batchCode && !batch) return;
    exportActive.current = true; setExporting(true);
    if (batchCode) setBatchBusy(prev => ({ ...prev, [batchCode]: true }));
    try {
      const params = batch ? new URLSearchParams({ batchId: batch.id }) : new URLSearchParams();
      if (!batch) for (const [key, value] of Object.entries({ q: search.trim(), company: selectedNamaPt, inisial: selectedInisial, tujuan: selectedTujuan, tglFrom, tglTo })) if (value) params.set(key, value);
      const response = await fetch("/api/po/credit-limit/approval/export?" + params, { cache: "no-store" });
      if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.error || "Gagal mengambil data export lengkap."); }
      if (!response.headers.get("Content-Type")?.includes("spreadsheetml")) throw new Error("Format file export tidak valid.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("File export kosong.");
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "Approval_Credit_Limit.xlsx";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Export Dibatalkan", text: error instanceof Error ? error.message : "Gagal menyiapkan file export." });
    } finally {
      exportActive.current = false; setExporting(false);
      if (batchCode) setBatchBusy(prev => ({ ...prev, [batchCode]: false }));
    }
  };

  const handleCloseBatch = async (batchCode: string) => {
    // Rule 2: Pre-check apakah seluruh PO dalam batch sudah APPROVED_DIREKSI
    const batchPos = await requireBatchDetails(batchCode);
    if (!batchPos) return;
    const isAllApprovedDireksi = batchPos.length > 0 && batchPos.every((p: any) => p.statusCreditLimit === "APPROVED_DIREKSI");

    if (!isAllApprovedDireksi) {
      Swal.fire({
        icon: "warning",
        title: "Belum Dapat Ditutup",
        text: `Batch ${batchCode} belum dapat ditutup karena masih ada PO yang belum disetujui Direksi (Approved Direksi).`,
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Close Batch?",
      text: `Batch ${batchCode} akan ditutup. PO baru yang diajukan credit limit akan masuk ke batch berikutnya.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Close Batch",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "closeBatch", batchCode }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Gagal menutup batch");
      }

      Swal.fire({
        icon: "success",
        title: "Batch Ditutup!",
        text: `${batchCode} berhasil di-close.`,
        timer: 1500,
        showConfirmButton: false,
      });

      pages.refreshBatches([batchCode]);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err?.message || "Terjadi kesalahan sistem" });
    }
  };

  const handleUncloseBatch = async (batchCode: string) => {
    const result = await Swal.fire({
      title: "Unclose Batch?",
      text: `Batch ${batchCode} akan dibuka kembali. PO baru akan masuk ke batch ini.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Buka Batch",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "uncloseBatch", batchCode }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Gagal membuka batch");
      }

      Swal.fire({
        icon: "success",
        title: "Batch Dibuka!",
        text: `${batchCode} berhasil di-unclose.`,
        timer: 1500,
        showConfirmButton: false,
      });

      pages.refreshBatches([batchCode]);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err?.message || "Terjadi kesalahan sistem" });
    }
  };

  const handleUpdateKodeVendor = (poId: string, val: string) => {
    setPoData((prev) =>
      prev.map((item) => (item.id === poId ? { ...item, kodeVendor: val } : item))
    );
    pages.refreshForPoIds([poId]);
  };

  return {
    batchBusy, exporting,
    fetchError: pages.fetchError, fetchData, matchingPoCount: pages.matchingPoCount, totalBatches: pages.totalBatches,
    detailLoading: pages.detailLoading, detailErrors: pages.detailErrors, retryBatch: (code: string) => pages.loadBatch(code, true).catch(() => {}), withBatchDetails,
    loading,
    role,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedBatches,
    batchGroups,
    filteredPo,
    expandedBatches,
    toggleBatch,
    handleAction,
    handleToggleND,
    handleApproveAll,
    handleChecklistAllND,
    handleExportExcel,
    handleUpdateNDDetails,
    handleCloseBatch,
    handleUncloseBatch,
    handleUpdateKodeVendor,
  };
}
