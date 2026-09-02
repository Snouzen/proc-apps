"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { cleanSiteArea } from "@/lib/credit-limit";

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
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const batchesPerPage = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/po?group=credit_approval&summary=true&includeItems=false&limit=5000&offset=0&sort=tglPo_desc",
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
    import("@/lib/me").then(({ getMe }) => {
      getMe().then((me) => {
        setRole(me?.role || "");
        if (me?.role === "pusat") {
          fetchData();
        } else {
          setLoading(false);
        }
      });
    });
  }, [fetchData]);

  const handleAction = async (po: any, action: "approve" | "approveDireksi" | "reject" | "reRequest") => {
    const isApprove = action === "approve" || action === "approveDireksi";
    const isReRequest = action === "reRequest";
    
    let confirmText = "Setujui Credit Limit?";
    let successText = "Berhasil Disetujui!";
    let iconColor = "#10b981";
    let confirmBtnText = "Ya, Setujui!";
    
    if (action === "approveDireksi") {
      confirmText = "Setujui Credit Limit (Direksi)?";
      successText = "Disetujui Direksi!";
      iconColor = "#4f46e5";
    } else if (isReRequest) {
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
        throw new Error("Gagal memproses approval");
      }

      Swal.fire({
        icon: "success",
        title: successText,
        timer: 1500,
        showConfirmButton: false,
      });

      setPoData((prev) => {
        // Jika reject dan status REQUESTED (pusat), hilangkan dari tabel (hapus batch)
        if (action === "reject" && po.statusCreditLimit === "REQUESTED") {
          return prev.filter(item => item.id !== po.id);
        }
        
        return prev.map((item) =>
          item.id === po.id
            ? { 
                ...item, 
                statusCreditLimit: action === "approve" ? "APPROVED" : 
                                   action === "approveDireksi" ? "APPROVED_DIREKSI" : 
                                   action === "reRequest" ? "REQUESTED" : "REJECTED" 
              }
            : item
        );
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Terjadi kesalahan sistem" });
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
      // We don't revert optimistic update here, they can just refresh or try again
    }
  };

  const handleApproveAll = async (batchCode: string, pos: any[]) => {
    const hasRequested = pos.some(p => p.statusCreditLimit === "REQUESTED");
    const action = hasRequested ? "approveAll" : "approveDireksiAll";
    const titleText = hasRequested ? "Approve Semua PO (Pusat)?" : "Approve Semua PO (Direksi)?";

    const result = await Swal.fire({
      title: titleText,
      text: `Anda akan menyetujui ${pos.length} PO dalam batch ${batchCode}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: hasRequested ? "#10b981" : "#4f46e5",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Setujui Semua",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const poIds = pos.map((po) => po.id);
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poIds, action }),
      });

      if (!res.ok) {
        throw new Error("Gagal memproses credit limit");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil Disetujui!",
        text: `${pos.length} PO telah disetujui.`,
        timer: 1500,
        showConfirmButton: false,
      });

      setPoData((prev) =>
        prev.map((item) =>
          poIds.includes(item.id)
            ? { ...item, statusCreditLimit: hasRequested ? "APPROVED" : "APPROVED_DIREKSI" }
            : item
        )
      );
    } catch (err) {
      Swal.fire({ icon: "error", title: "Oops...", text: "Terjadi kesalahan sistem" });
    }
  };

  const handleChecklistAllND = async (batchCode: string, batchPos: any[], checked: boolean) => {
    const poIds = batchPos.map(p => p.id);
    
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

  const handleExportExcel = (batchCode: string, posToExport: any[]) => {
    if (!posToExport || posToExport.length === 0) {
      Swal.fire({
        title: "Info",
        text: "Tidak ada data untuk diexport",
        icon: "info"
      });
      return;
    }

    const dataToExport = posToExport.map((po, index) => {
      const company = po.RitelModern?.namaPt || po.company || "-";
      return {
        "No": index + 1,
        "Batch": po.CreditLimitBatch?.batchCode || "Tanpa Batch",
        "No PO": po.noPo || "-",
        "Company": company,
        "Inisial": po.RitelModern?.inisial || "-",
        "Site Area": cleanSiteArea(po.UnitProduksi?.siteArea || po.siteArea),
        "Tujuan": po.tujuanDetail || po.RitelModern?.tujuan || "-",
        "Tgl PO": po.tglPo ? format(new Date(po.tglPo), "dd/MM/yyyy") : "-",
        "Due Date": po.expiredTgl ? format(new Date(po.expiredTgl), "dd/MM/yyyy") : "-",
        "Tgl Kirim": po.tglkirim ? format(new Date(po.tglkirim), "dd/MM/yyyy") : "-",
        "Pcs Total": Number(po.pcsTotal || 0),
        "Pcs Kirim": Number(po.pcsKirimTotal || 0),
        "Nominal": Number(po.totalNominal || 0),
        "Kode Vendor": po.kodeVendor || "-",
        "Remarks": po.remarksCreditLimit || "-",
        "ND": po.isNotaDinas ? "true" : "false",
        "Status": po.statusCreditLimit === "APPROVED" ? "Approved (Pusat)" : po.statusCreditLimit === "APPROVED_DIREKSI" ? "Approved (Direksi)" : (po.statusCreditLimit || "-"),
      };
    });

    const totalPcsSum = dataToExport.reduce((sum, r) => sum + (Number(r["Pcs Total"]) || 0), 0);
    const totalPcsKirimSum = dataToExport.reduce((sum, r) => sum + (Number(r["Pcs Kirim"]) || 0), 0);
    const totalNominalSum = dataToExport.reduce((sum, r) => sum + (Number(r["Nominal"]) || 0), 0);

    dataToExport.push({
      "No": "" as any,
      "Batch": "",
      "No PO": "",
      "Company": "",
      "Inisial": "",
      "Site Area": "",
      "Tujuan": "",
      "Tgl PO": "",
      "Due Date": "",
      "Tgl Kirim": "SUB TOTAL",
      "Pcs Total": totalPcsSum,
      "Pcs Kirim": totalPcsKirimSum,
      "Nominal": totalNominalSum,
      "Kode Vendor": "",
      "Remarks": "",
      "ND": "",
      "Status": "",
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    worksheet["!cols"] = [
      { wch: 4 }, { wch: 16 }, { wch: 18 }, { wch: 25 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 16 }, { wch: 14 }, { wch: 25 }, { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Approval PO");
    
    const safeBatchCode = batchCode.replace(/[^a-zA-Z0-9-]/g, "_");
    XLSX.writeFile(workbook, `Export_${safeBatchCode}_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
  };

  const filteredPo = useMemo(() => {
    let result = poData;

    if (selectedNamaPt) {
      result = result.filter((po) => po.RitelModern?.namaPt === selectedNamaPt);
    }
    if (selectedInisial) {
      result = result.filter((po) => po.RitelModern?.inisial === selectedInisial);
    }
    if (selectedTujuan) {
      result = result.filter((po) => po.tujuanDetail === selectedTujuan);
    }

    if (tglFrom) {
      const fromDate = new Date(tglFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((po) => new Date(po.tglPo) >= fromDate);
    }
    if (tglTo) {
      const toDate = new Date(tglTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((po) => new Date(po.tglPo) <= toDate);
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

    return result;
  }, [poData, search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  const batchGroups = useMemo(() => {
    const map = new Map<string, { batchCode: string; pos: any[]; isArchived: boolean; isBatchOpen: boolean; seqNumber: number; isBatchUncloseable: boolean }>();
    let maxSeq = 0;

    filteredPo.forEach((po) => {
      const code = po.CreditLimitBatch?.batchCode || "Tanpa Batch";
      const seq = po.CreditLimitBatch?.seqNumber || 0;
      if (seq > maxSeq) maxSeq = seq;
      
      if (!map.has(code)) {
        map.set(code, { 
          batchCode: code, 
          pos: [], 
          isArchived: true, 
          isBatchOpen: po.CreditLimitBatch?.status === "OPEN",
          seqNumber: seq,
          isBatchUncloseable: false,
        });
      }
      
      const group = map.get(code)!;
      group.pos.push(po);
      if (po.statusCreditLimit === "REQUESTED" || po.statusCreditLimit === "APPROVED") {
        group.isArchived = false;
      }
    });

    const groups = Array.from(map.values());
    
    // Set isBatchUncloseable: must be CLOSED, distance <= 1, and PO count < 50
    groups.forEach((g) => {
      if (!g.isBatchOpen && g.seqNumber >= maxSeq - 1 && g.pos.length < 50) {
        g.isBatchUncloseable = true;
      }
    });

    return groups.sort((a, b) => {
      if (a.isArchived && !b.isArchived) return 1;
      if (!a.isArchived && b.isArchived) return -1;
      return b.batchCode.localeCompare(a.batchCode);
    });
  }, [filteredPo]);

  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * batchesPerPage;
    return batchGroups.slice(startIndex, startIndex + batchesPerPage);
  }, [batchGroups, currentPage]);

  const totalPages = Math.ceil(batchGroups.length / batchesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedNamaPt, selectedInisial, selectedTujuan, tglFrom, tglTo]);

  const toggleBatch = (batchCode: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchCode)) {
        next.delete(batchCode);
      } else {
        next.add(batchCode);
      }
      return next;
    });
  };

  const handleCloseBatch = async (batchCode: string) => {
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

      await fetchData();
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

      await fetchData();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Gagal", text: err?.message || "Terjadi kesalahan sistem" });
    }
  };

  const handleUpdateKodeVendor = (poId: string, val: string) => {
    setPoData((prev) =>
      prev.map((item) => (item.id === poId ? { ...item, kodeVendor: val } : item))
    );
  };

  return {
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
