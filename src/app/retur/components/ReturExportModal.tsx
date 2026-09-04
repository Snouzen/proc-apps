"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  X,
  FileSpreadsheet,
  Eye,
  Download,
  CheckCircle2,
  Sparkles,
  Building2,
  Check,
  Search,
  Loader2,
  CheckSquare,
  Square,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";

export interface ReturExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRetailerId?: string | null;
  selectedRetailerName?: string | null;
  isExportAll?: boolean;
  search?: string | null;
  filterInisial?: string | null;
  filterToko?: string | null;
  filterLokasi?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  selectedStatus?: string | null;
  previewData?: any[];
  totalRecordsCount?: number;
  retailers?: any[];
  units?: any[];
  filterOptions?: { inisials: string[]; tokos: string[] };
  availableLocations?: string[];
}

export function ReturExportModal({
  isOpen,
  onClose,
  selectedRetailerName: initialRetailerName,
  isExportAll: initialExportAll = false,
  previewData: fallbackPreviewData = [],
  totalRecordsCount: fallbackTotalCount = 0,
  retailers = [],
}: ReturExportModalProps) {
  // Multi-select Ritel Modern State
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [searchRitelQuery, setSearchRitelQuery] = useState<string>("");

  // Live query & export progress states
  const [livePreviewRows, setLivePreviewRows] = useState<any[]>(fallbackPreviewData.slice(0, 7));
  const [liveTotalCount, setLiveTotalCount] = useState<number>(fallbackTotalCount);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [activeTab, setActiveTab] = useState<"ritel" | "preview">("ritel");

  // 1. Unique Retailer PT Names (deduplicated and sorted alphabetically)
  const uniqueRetailerNames = useMemo(() => {
    const set = new Set<string>();
    retailers.forEach((r: any) => {
      if (r.namaPt && r.namaPt.trim()) {
        set.add(r.namaPt.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [retailers]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialExportAll || !initialRetailerName) {
        // Default to all selected
        setSelectedRetailers([...uniqueRetailerNames]);
      } else {
        // Specific retailer active from page
        setSelectedRetailers([initialRetailerName]);
      }
      setSearchRitelQuery("");
      setIsExporting(false);
      setProgress(0);
      setStatusText("");
      setActiveTab("ritel");
    }
  }, [isOpen, initialRetailerName, initialExportAll, uniqueRetailerNames]);

  // Filtered retailers by search query
  const filteredRetailerList = useMemo(() => {
    if (!searchRitelQuery.trim()) return uniqueRetailerNames;
    const q = searchRitelQuery.toLowerCase();
    return uniqueRetailerNames.filter((name) => name.toLowerCase().includes(q));
  }, [uniqueRetailerNames, searchRitelQuery]);

  // Toggle individual retailer
  const handleToggleRetailer = (ptName: string) => {
    setSelectedRetailers((prev) => {
      if (prev.includes(ptName)) {
        return prev.filter((name) => name !== ptName);
      } else {
        return [...prev, ptName];
      }
    });
  };

  // Select all / Deselect all
  const handleSelectAll = () => {
    setSelectedRetailers([...uniqueRetailerNames]);
  };

  const handleDeselectAll = () => {
    setSelectedRetailers([]);
  };

  const isAllSelected = selectedRetailers.length === uniqueRetailerNames.length && uniqueRetailerNames.length > 0;
  const isNoneSelected = selectedRetailers.length === 0;

  // ── Live Query Preview & Count Debounce Fetcher ─────────────────────
  const fetchLivePreview = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingPreview(true);
    try {
      const params = new URLSearchParams();
      params.set("preview", "true");

      if (isAllSelected || isNoneSelected) {
        // Exporting all
      } else {
        selectedRetailers.forEach((pt) => {
          params.append("namaPt", pt);
        });
      }

      const res = await fetch(`/api/retur/export?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setLiveTotalCount(json.totalCount || 0);
        setLivePreviewRows(json.preview || []);
      }
    } catch (err) {
      console.error("Failed to fetch export preview:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, selectedRetailers, isAllSelected, isNoneSelected]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchLivePreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLivePreview, isOpen]);

  const executeExport = async () => {
    if (selectedRetailers.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Pilih Ritel Modern",
        text: "Silakan pilih minimal 1 ritel modern untuk diekspor.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    setIsExporting(true);
    setProgress(15);
    setStatusText("Menyiapkan filter ritel modern...");

    try {
      const params = new URLSearchParams();

      if (!isAllSelected) {
        selectedRetailers.forEach((pt) => {
          params.append("namaPt", pt);
        });
      }

      // Smooth progress animation
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev < 40) return prev + 10;
          if (prev < 75) {
            setStatusText("Mengambil seluruh data dari database...");
            return prev + 5;
          }
          if (prev < 90) {
            setStatusText("Menyusun lembar kerja Excel (.xlsx)...");
            return prev + 2;
          }
          return prev;
        });
      }, 300);

      const response = await fetch(`/api/retur/export?${params.toString()}`, {
        credentials: "include",
      });
      clearInterval(progressTimer);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesi login Anda telah berakhir. Silakan login kembali untuk melanjutkan.");
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunduh file export");
      }

      setProgress(95);
      setStatusText("Menyiapkan file download...");

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Data_Retur_${new Date().toISOString().split("T")[0]}.xlsx`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setStatusText("Ekspor berhasil diselesaikan!");

      setTimeout(() => {
        setIsExporting(false);
        onClose();
        Swal.fire({
          icon: "success",
          title: "Ekspor Selesai",
          text: `File ${filename} (${liveTotalCount.toLocaleString("id-ID")} baris) berhasil diunduh.`,
          timer: 2500,
          showConfirmButton: false,
        });
      }, 800);
    } catch (err: any) {
      console.error("Export Error:", err);
      setIsExporting(false);
      setProgress(0);
      setStatusText("");
      Swal.fire({
        icon: "error",
        title: "Gagal Ekspor",
        text: err.message || "Terjadi kesalahan sistem saat mengekspor data.",
        confirmButtonColor: "#4f46e5",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* ── Modal Header ─────────────────────────────────────────── */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileSpreadsheet size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Export Data Retur ke Excel
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                  {isAllSelected
                    ? `Semua Ritel (${uniqueRetailerNames.length})`
                    : `${selectedRetailers.length} Ritel Dipilih`}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Pilih satu atau beberapa Ritel Modern untuk diekspor.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Summary & Tabs Bar ───────────────────────────────────── */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total estimasi data:</span>
            <span className="inline-flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 tabular-nums">
              {isLoadingPreview && <Loader2 size={12} className="animate-spin text-indigo-600" />}
              {liveTotalCount.toLocaleString("id-ID")} Baris Data
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("ritel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeTab === "ritel"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Building2 size={13} />
              Pilih Ritel ({selectedRetailers.length}/{uniqueRetailerNames.length})
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                activeTab === "preview"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Eye size={13} />
              Pratinjau Data ({livePreviewRows.length})
            </button>
          </div>
        </div>

        {/* ── Modal Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "ritel" ? (
            <div className="space-y-4">
              
              {/* Search & Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama ritel modern..."
                    value={searchRitelQuery}
                    onChange={(e) => setSearchRitelQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 placeholder:font-normal"
                  />
                  {searchRitelQuery && (
                    <button
                      onClick={() => setSearchRitelQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={isAllSelected}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckSquare size={13} />
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={isNoneSelected}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Square size={13} />
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Ritel Cards Grid (Multi-Pick) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredRetailerList.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-xs text-slate-400">
                    Tidak ada ritel modern yang cocok dengan kata kunci &quot;{searchRitelQuery}&quot;.
                  </div>
                ) : (
                  filteredRetailerList.map((ptName) => {
                    const isSelected = selectedRetailers.includes(ptName);
                    return (
                      <div
                        key={ptName}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleRetailer(ptName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleRetailer(ptName);
                          }
                        }}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm ring-1 ring-indigo-400/20"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check size={13} strokeWidth={3} />}
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                          <Building2 size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-bold leading-tight truncate ${
                              isSelected
                                ? "text-indigo-900 dark:text-indigo-100"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {ptName}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Pratinjau {livePreviewRows.length} Baris Pertama Retur (Total {liveTotalCount.toLocaleString("id-ID")} Baris):
                </p>
                <span className="text-[11px] text-slate-400">
                  Data lengkap akan di-render seluruhnya ke file .xlsx
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-inner bg-slate-50/30 dark:bg-slate-900/30">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      <th className="px-3.5 py-2.5">NO</th>
                      <th className="px-3.5 py-2.5">RTV/CN</th>
                      <th className="px-3.5 py-2.5">TGL RTV</th>
                      <th className="px-3.5 py-2.5">TOKO</th>
                      <th className="px-3.5 py-2.5">NAMA COMPANY</th>
                      <th className="px-3.5 py-2.5">INISIAL</th>
                      <th className="px-3.5 py-2.5">PRODUK</th>
                      <th className="px-3.5 py-2.5">QTY</th>
                      <th className="px-3.5 py-2.5">NOMINAL</th>
                      <th className="px-3.5 py-2.5">STATUS</th>
                      <th className="px-3.5 py-2.5">LOKASI</th>
                      <th className="px-3.5 py-2.5">PEMBEBANAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {isLoadingPreview ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-xs">
                          <div className="flex items-center justify-center gap-2 text-indigo-600">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Memperbarui pratinjau data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : livePreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Belum ada data retur yang sesuai dengan ritel yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      livePreviewRows.map((row: any, idx: number) => (
                        <tr
                          key={row.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-medium text-slate-700 dark:text-slate-300"
                        >
                          <td className="px-3.5 py-2">{idx + 1}</td>
                          <td className="px-3.5 py-2 font-bold text-indigo-600 dark:text-indigo-400">
                            {row.rtvCn || "-"}
                          </td>
                          <td className="px-3.5 py-2">
                            {row.tanggalRtv
                              ? new Date(row.tanggalRtv).toLocaleDateString("id-ID")
                              : "-"}
                          </td>
                          <td className="px-3.5 py-2">{row.namaCompany || "-"}</td>
                          <td className="px-3.5 py-2">{row.RitelModern?.namaPt || "-"}</td>
                          <td className="px-3.5 py-2">{row.inisial || "-"}</td>
                          <td className="px-3.5 py-2">{row.produk || "-"}</td>
                          <td className="px-3.5 py-2 tabular-nums">
                            {Number(row.qtyReturn || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3.5 py-2 tabular-nums font-bold">
                            Rp {Number(row.nominal || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {row.statusBarang || "BELUM DIAMBIL"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2">{row.LokasiBarang?.siteArea || "-"}</td>
                          <td className="px-3.5 py-2">{row.PembebananReturn?.siteArea || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Progress Bar Card (Appears during Exporting) ────────── */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 space-y-2.5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span className="flex items-center gap-2">
                  {progress >= 100 ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  {statusText || "Memproses..."}
                </span>
                <span className="font-black tabular-nums">{progress}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-indigo-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="text-xs text-slate-400">
            {selectedRetailers.length === 0 ? (
              <span className="text-rose-500 font-semibold">Pilih minimal 1 ritel modern</span>
            ) : isAllSelected ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                Semua ritel dipilih ({liveTotalCount.toLocaleString("id-ID")} baris data)
              </span>
            ) : (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedRetailers.length} Ritel dipilih ({liveTotalCount.toLocaleString("id-ID")} baris data)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>

            <button
              onClick={executeExport}
              disabled={isExporting || selectedRetailers.length === 0 || liveTotalCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download size={15} strokeWidth={2.5} />
                  Download Excel ({liveTotalCount.toLocaleString("id-ID")} Data)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

