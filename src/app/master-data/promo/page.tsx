"use client";

import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Copy,
  TrendingDown,
  Percent,
  Calendar,
  Layers,
  Link2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  AlertCircle,
  Building2,
  ArrowLeft
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });
import * as Popover from "@radix-ui/react-popover";
import Swal from "sweetalert2";

interface Promo {
  id: string;
  nomor: string;
  linkDocs?: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  dpp: number;
  ppn: number;
  pph: number;
  total: number;
  linkFP?: string;
  ritelId?: string;
}

export default function PromoPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Initial view: Card Grid of retailers.
  // Detail view: List of promos for a specific retailer.
  const [isGroupedMode, setIsGroupedMode] = useState(true);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [retailers, setRetailers] = useState<any[]>([]);

  // Add Promo flow: Select retailer first if in grouped mode.
  const [showRitelSelector, setShowRitelSelector] = useState(false);
  const [searchRitelText, setSearchRitelText] = useState("");
  const [isRitelDropdownOpen, setIsRitelDropdownOpen] = useState(false);

  // State for Form
  const [formData, setFormData] = useState({
    nomor: "",
    linkDocs: "",
    kegiatan: "Dc Fee",
    periode: "Januari",
    tanggal: "", 
    dpp: 0,
    ppn: 0,
    pph: 0,
    linkFP: "",
    ritelId: "",
  });

  // Search/Suggest States
  const [kegiatanSearch, setKegiatanSearch] = useState("");
  const [periodeSearch, setPeriodeSearch] = useState("");

  // Popover States
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false);
  const [activeKegiatanIdx, setActiveKegiatanIdx] = useState(0);
  const [isPeriodeOpen, setIsPeriodeOpen] = useState(false);
  const [activePeriodeIdx, setActivePeriodeIdx] = useState(0);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isRowsOpen, setIsRowsOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [promos, setPromos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [saving, setSaving] = useState(false);
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };

  const kegiatanOptions = [
    "Dc Fee",
    "B2B Fee",
    "Tagihan Promosi",
    "Support Event",
    "Rafaksi",
    "Rebate",
    "Lain-Lain",
  ];

  const bulanOptions = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const filteredKegiatans = useMemo(() => {
    return kegiatanOptions.filter((opt) =>
      opt.toLowerCase().includes(kegiatanSearch.toLowerCase()),
    );
  }, [kegiatanSearch]);

  const filteredPeriodes = useMemo(() => {
    return bulanOptions.filter((opt) =>
      opt.toLowerCase().includes(periodeSearch.toLowerCase()),
    );
  }, [periodeSearch]);

  useEffect(() => {
    setIsMounted(true);
    setFormData((prev) => ({
      ...prev,
      tanggal: new Date().toISOString().split("T")[0],
    }));
    
    // Fetch retailers for Dropdown Select
    fetch("/api/ritel").then(res => res.json()).then(res => {
      const data = Array.isArray(res) ? res : (res?.data || []);
      
      // Deduplicate by name to prevent confusing UI in the selector
      const unique = [];
      const seen = new Set();
      for (const r of data) {
        if (!seen.has(r.namaPt.trim().toUpperCase())) {
          seen.add(r.namaPt.trim().toUpperCase());
          unique.push(r);
        }
      }
      setRetailers(unique);
    });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL("/api/promo", window.location.origin);
      if (selectedRetailerId) {
        url.searchParams.set("ritelId", selectedRetailerId);
      }
      const res = await fetch(url.toString());
      const json = await res.json();
      setIsGroupedMode(json.isGrouped);
      setPromos(json.data || []);
      setCurrentPage(1);
    } catch {
      setPromos([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRetailerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    Swal.fire({
      icon: type,
      title: message,
      toast: true,
      position: 'top-end',
      timer: 2500,
      showConfirmButton: false,
      background: '#fff',
      color: '#0f172a',
      customClass: {
        popup: 'rounded-2xl border border-slate-100 shadow-xl'
      }
    });
  };

  const calculatedTotal = useMemo(() => {
    const dpp = Number(formData.dpp) || 0;
    const ppn = Number(formData.ppn) || 0;
    return dpp + ppn;
  }, [formData.dpp, formData.ppn]);

  const handleKegiatanKeyDown = (e: React.KeyboardEvent) => {
    if (!isKegiatanOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveKegiatanIdx((prev) =>
        prev < filteredKegiatans.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveKegiatanIdx((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredKegiatans[activeKegiatanIdx]) {
        setFormData({
          ...formData,
          kegiatan: filteredKegiatans[activeKegiatanIdx],
        });
        setKegiatanSearch("");
        setIsKegiatanOpen(false);
      }
    }
  };

  const handlePeriodeKeyDown = (e: React.KeyboardEvent) => {
    if (!isPeriodeOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivePeriodeIdx((prev) =>
        prev < filteredPeriodes.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivePeriodeIdx((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredPeriodes[activePeriodeIdx]) {
        setFormData({
          ...formData,
          periode: filteredPeriodes[activePeriodeIdx],
        });
        setPeriodeSearch("");
        setIsPeriodeOpen(false);
      }
    }
  };

  const handleEdit = (promo: Promo) => {
    setEditId(promo.id);
    setFormData({
      nomor: promo.nomor,
      linkDocs: promo.linkDocs || "",
      kegiatan: promo.kegiatan,
      periode: promo.periode,
      tanggal: new Date(promo.tanggal).toISOString().split("T")[0],
      dpp: promo.dpp,
      ppn: promo.ppn,
      pph: promo.pph || 0,
      linkFP: promo.linkFP || "",
      remarks: promo.remarks || "",
      ritelId: selectedRetailerId || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const res = await fetch("/api/promo", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editId }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      showToast(
        "success",
        editId ? "Data Berhasil Diperbarui" : "Data Promo Berhasil Disimpan",
      );
      loadData();
      setIsModalOpen(false);
      setEditId(null);
      setFormData({
        nomor: "",
        linkDocs: "",
        kegiatan: "Dc Fee",
        periode: "Januari",
        tanggal: new Date().toISOString().split("T")[0],
        dpp: 0,
        ppn: 0,
        pph: 0,
        linkFP: "",
        ritelId: selectedRetailerId || "",
      });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/promo?id=${encodeURIComponent(deleteConfirmId)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Gagal menghapus promo");

      showToast("success", "Promo berhasil dihapus");
      setPromos((prev) => prev.filter((p) => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (ritelId: string, ritelName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Seluruh Data Promo?',
      html: `Semua data promo untuk <b class="font-bold">${ritelName}</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal',
      customClass: {
        popup: 'rounded-[32px] font-sans',
        confirmButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest',
        cancelButton: 'rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest'
      }
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/promo?ritelId=${ritelId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Gagal menghapus data grup");
        showToast("success", "Seluruh data promo peritel berhasil dihapus");
        loadData();
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Error");
        setIsLoading(false);
      }
    }
  };

  const DatePickerContent = () => {
    const [viewDate, setViewDate] = useState(
      new Date(formData.tanggal || new Date()),
    );
    const daysInMonth = (month: number, year: number) =>
      new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      1,
    ).getDay();
    const days = Array.from(
      { length: daysInMonth(viewDate.getMonth(), viewDate.getFullYear()) },
      (_, i) => i + 1,
    );
    const monthName = viewDate.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });

    return (
      <div className="p-4 w-[280px]">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
              )
            }
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-black uppercase tracking-widest">
            {monthName}
          </span>
          <button
            type="button"
            onClick={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
              )
            }
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <span key={i} className="text-[10px] font-black text-slate-300">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(firstDay)
            .fill(null)
            .map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
          {days.map((d) => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isSelected = formData.tanggal === dateStr;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, tanggal: dateStr });
                  setIsDateOpen(false);
                }}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${isSelected ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-100 text-slate-600"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const filtered = promos.filter((p: any) => {
    if (isGroupedMode && !selectedRetailerId) {
      return p.namaPt?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return (p.nomor + p.kegiatan + p.id)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  // Pagination Logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  if (!isMounted)
    return (
      <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        Initializing Manifest...
      </div>
    );

  return (
    <main className="p-8 pb-32 max-w-[1600px] mx-auto min-h-screen bg-[#fcfdfe] animate-in fade-in duration-700">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          {selectedRetailerId && (
            <button
              onClick={() => setSelectedRetailerId(null)}
              className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-[24px] shadow-sm hover:shadow-indigo-500/10 transition-all active:scale-95 group"
            >
              <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
              {selectedRetailerId 
                ? `PROMO: ${retailers.find(r => r.id === selectedRetailerId)?.namaPt || 'Detail'}` 
                : "Master Promo"
              }
            </h1>
            <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Daftar Spesifikasi Data Promo
                </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-3 bg-white border border-slate-100 text-slate-400 px-8 py-5 rounded-[40px] font-black hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95 text-xs uppercase tracking-widest"
          >
            <Layers size={16} />
            Bulk Upload
          </button>
          <button
            onClick={() => {
              if (!selectedRetailerId && isGroupedMode) {
                setSearchRitelText("");
                setShowRitelSelector(true);
              } else {
                setEditId(null);
                setFormData({
                  ...formData,
                  nomor: "",
                  linkDocs: "",
                  kegiatan: "Dc Fee",
                  periode: "Januari",
                  tanggal: new Date().toISOString().split("T")[0],
                  dpp: 0,
                  ppn: 0,
                  pph: 0,
                  linkFP: "",
                  ritelId: selectedRetailerId || "",
                });
                setIsModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-[40px] font-black hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 text-xs uppercase tracking-widest border-4 border-white/10"
          >
            <div className="p-1 bg-white/20 rounded-full">
              <Plus size={16} strokeWidth={3} />
            </div>
            Add Promo
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm mb-8">
        <div className="relative max-w-md group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder={isGroupedMode && !selectedRetailerId ? "Cari Ritel Modern..." : "Search ID, Nomor, or Kegiatan..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all text-sm font-black text-slate-700 outline-none"
          />
        </div>
      </div>

      {isGroupedMode && !selectedRetailerId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-1000">
          {isLoading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-[40px] p-8 animate-pulse h-40 shadow-sm" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Layers size={40} />
              </div>
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Belum ada data promo yang terasosiasi dengan peritel.
              </p>
            </div>
          ) : (
            filtered.map((ritel: any) => (
              <div 
                key={ritel.id}
                onClick={() => {
                  setSelectedRetailerId(ritel.id);
                  setSearchTerm("");
                }}
                className="group relative bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-500 cursor-pointer active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute top-6 right-6 flex items-center gap-2">
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} />
                   </div>
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                  <div className="p-5 bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white rounded-[32px] transition-all duration-700 w-fit shadow-inner">
                    <Building2 size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase leading-tight group-hover:text-indigo-700 transition-colors mb-2">
                      {ritel.namaPt}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100">
                          {ritel?._count?.Promos || 0} PROMOS
                        </span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 right-8 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(ritel.id, ritel.namaPt);
                    }}
                    className="p-4 bg-white text-rose-400 hover:bg-rose-600 hover:text-white rounded-[24px] shadow-sm hover:shadow-rose-500/20 transition-all active:scale-90 border border-slate-50 hover:border-rose-600"
                    title="Hapus Seluruh Data Promo Peritel"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto no-scrollbar custom-scrollbar transform-gpu">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black border-b border-slate-50">
                  <th className="px-8 py-6">ID Promo</th>
                  <th className="px-8 py-6">Nomor</th>
                  <th className="px-8 py-6">Kegiatan</th>
                  <th className="px-8 py-6">Periode</th>
                  <th className="px-8 py-6">Tanggal</th>
                  <th className="px-8 py-6 text-right">DPP</th>
                  <th className="px-8 py-6 text-right">PPN</th>
                  <th className="px-8 py-6 text-right text-rose-400">PPH</th>
                  <th className="px-8 py-6 text-right">Total</th>
                  <th className="px-8 py-6 text-center">Link Docs</th>
                  <th className="px-8 py-6 text-center">Faktur Pajak</th>
                  <th className="px-8 py-6">Remarks</th>
                  <th className="px-8 py-6 text-center text-slate-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-[13px] text-slate-700">
                {isLoading ? (
                  <tr>
                    <td className="px-8 py-10" colSpan={12}>
                      Memuat Master Data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-8 py-10 text-slate-300 italic" colSpan={12}>
                      Data promo tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((promo: any) => (
                    <tr
                      key={promo.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6 font-mono text-[10px] text-slate-400">
                        {promo.id}
                      </td>
                      <td className="px-8 py-6 text-slate-900 uppercase">
                        {promo.nomor}
                      </td>
                      <td className="px-8 py-6 uppercase font-black text-slate-600 text-[11px]">
                        {promo.kegiatan}
                      </td>
                      <td className="px-8 py-6">{promo.periode}</td>
                      <td className="px-8 py-6 text-slate-400">
                        {new Date(promo.tanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-8 py-6 text-right tabular-nums">
                        {formatRp(promo.dpp)}
                      </td>
                      <td className="px-8 py-6 text-right tabular-nums">
                        {formatRp(promo.ppn)}
                      </td>
                      <td className="px-8 py-6 text-right tabular-nums text-rose-500 italic">
                        {promo.pph ? `-${formatNumber(promo.pph)}` : "-"}
                      </td>
                      <td className="px-8 py-6 text-right text-indigo-600 font-black tabular-nums scale-[1.05] origin-right">
                        {formatRp(promo.total)}
                      </td>
                      <td className="px-8 py-6 text-center">
                        {promo.linkDocs ? (
                          <a 
                            href={promo.linkDocs} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group/btn" 
                            title="Buka Dokumentasi"
                          >
                            <Link2 size={16} />
                          </a>
                        ) : (
                          <span className="text-[10px] font-black text-slate-200 uppercase tracking-tighter italic">No Docs</span>
                        )}
                      </td>

                      <td className="px-8 py-6 text-center">
                        {promo.linkFP ? (
                          <a 
                            href={promo.linkFP} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm group/btn" 
                            title="Buka Faktur Pajak"
                          >
                            <Layers size={16} />
                          </a>
                        ) : (
                          <span className="text-[10px] font-black text-slate-200 uppercase tracking-tighter italic">No FP</span>
                        )}
                      </td>

                      <td className="px-8 py-6 text-slate-400 italic font-medium text-[11px] max-w-[200px] truncate">
                        {promo.remarks || "-"}
                      </td>

                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleEdit(promo)}
                            className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(promo.id)}
                            className="p-3 rounded-2xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Improved Pagination Footer */}
          <div className="p-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/20 text-slate-900">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Rows per page
                </label>
                <Popover.Root open={isRowsOpen} onOpenChange={setIsRowsOpen}>
                  <Popover.Trigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-900 hover:bg-slate-50 transition-all shadow-sm outline-none">
                      {itemsPerPage}
                      <ChevronDown size={14} className="text-slate-300" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[110] bg-white rounded-2xl border shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                      align="start"
                    >
                      {[10, 25, 50].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            setItemsPerPage(val);
                            setCurrentPage(1);
                            setIsRowsOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg text-xs font-black transition-colors ${itemsPerPage === val ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-500"}`}
                        >
                          {val}
                        </button>
                      ))}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, totalItems)} of {totalItems} items
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:text-slate-300 disabled:cursor-not-allowed outline-none"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safePage === 1}
                className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:text-slate-300 disabled:cursor-not-allowed outline-none"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center px-6 py-3 bg-white border border-slate-100 rounded-[20px] shadow-inner">
                <span className="text-xs font-black text-slate-900">
                  {safePage}
                </span>
                <span className="mx-2 text-slate-200 font-bold">/</span>
                <span className="text-xs font-bold text-slate-400">
                  {totalPages}
                </span>
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={safePage === totalPages}
                className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:text-slate-300 disabled:cursor-not-allowed outline-none"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm disabled:text-slate-300 disabled:cursor-not-allowed outline-none"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Ritel Modern */}
      {showRitelSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowRitelSelector(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-10 pt-10 pb-6 text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                <Building2 size={36} className="transform rotate-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pilih Peritel</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">
                Tentukan ritel modern tujuan
              </p>
            </div>

            <div className="px-10 pb-10">
              <Popover.Root open={isRitelDropdownOpen} onOpenChange={setIsRitelDropdownOpen}>
                <Popover.Trigger asChild>
                  <div className="relative mt-2">
                    <input 
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none text-center cursor-pointer hover:bg-slate-100 transition-colors"
                      placeholder="Cari Ritel Modern..."
                      value={searchRitelText}
                      onChange={(e) => {
                        setSearchRitelText(e.target.value);
                        if (!isRitelDropdownOpen) setIsRitelDropdownOpen(true);
                      }}
                    />
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className="z-[110] w-[350px] bg-white rounded-3xl border shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                    align="center"
                    sideOffset={8}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar text-slate-700 font-bold uppercase">
                      {retailers.filter(r => r.namaPt.toLowerCase().includes(searchRitelText.toLowerCase())).length === 0 ? (
                        <div className="p-4 text-center text-[10px] font-bold text-slate-300">TIDAK ADA HASIL</div>
                      ) : (
                        retailers
                          .filter(r => r.namaPt.toLowerCase().includes(searchRitelText.toLowerCase()))
                          .map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, ritelId: opt.id });
                                setSelectedRetailerId(opt.id);
                                setSearchRitelText("");
                                setIsRitelDropdownOpen(false);
                                setShowRitelSelector(false);
                                setEditId(null);
                                setIsModalOpen(true);
                              }}
                              className="w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all hover:bg-slate-50 text-slate-500"
                            >
                              {opt.namaPt}
                            </button>
                          ))
                      )}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              <button
                onClick={() => setShowRitelSelector(false)}
                className="w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-[24px]">
                  <Percent size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">
                    {editId ? "Update Promo" : "Add Promo"}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    Master Data Setting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-4 hover:bg-white rounded-[24px] text-slate-300 hover:text-rose-500 transition-all focus:outline-none"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Nomor Dokumen */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nomor Dokumen
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1672/Apr/24"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700 outline-none"
                    value={formData.nomor}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor: e.target.value })
                    }
                  />
                </div>

                {/* Jenis Kegiatan (Searchable / Combobox) */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Jenis Kegiatan
                  </label>
                  <Popover.Root
                    open={isKegiatanOpen}
                    onOpenChange={(open) => {
                      setIsKegiatanOpen(open);
                      if (!open) setKegiatanSearch("");
                    }}
                  >
                    <Popover.Trigger asChild>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={formData.kegiatan || "Pilih Kegiatan..."}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-slate-900/5 focus:bg-white outline-none transition-all pr-12"
                          value={kegiatanSearch}
                          onChange={(e) => {
                            setKegiatanSearch(e.target.value);
                            if (!isKegiatanOpen) setIsKegiatanOpen(true);
                            setActiveKegiatanIdx(0);
                          }}
                          onFocus={() => setIsKegiatanOpen(true)}
                          onKeyDown={handleKegiatanKeyDown}
                        />
                        <ChevronDown
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                        />
                      </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="z-[110] w-[300px] bg-white rounded-3xl border shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar text-slate-700 font-bold uppercase">
                          {filteredKegiatans.length === 0 ? (
                            <div className="p-4 text-center text-[10px] font-bold text-slate-300">
                              TIDAK ADA HASIL
                            </div>
                          ) : (
                            filteredKegiatans.map((opt, i) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, kegiatan: opt });
                                  setKegiatanSearch("");
                                  setIsKegiatanOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.kegiatan === opt || activeKegiatanIdx === i ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-500"}`}
                              >
                                {opt}
                              </button>
                            ))
                          )}
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                {/* Periode Bulan (Searchable / Combobox) */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Periode Bulan
                  </label>
                  <Popover.Root
                    open={isPeriodeOpen}
                    onOpenChange={(open) => {
                      setIsPeriodeOpen(open);
                      if (!open) setPeriodeSearch("");
                    }}
                  >
                    <Popover.Trigger asChild>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={formData.periode || "Pilih Periode..."}
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-slate-900/5 focus:bg-white outline-none transition-all pr-12"
                          value={periodeSearch}
                          onChange={(e) => {
                            setPeriodeSearch(e.target.value);
                            if (!isPeriodeOpen) setIsPeriodeOpen(true);
                            setActivePeriodeIdx(0);
                          }}
                          onFocus={() => setIsPeriodeOpen(true)}
                          onKeyDown={handlePeriodeKeyDown}
                        />
                        <ChevronDown
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                        />
                      </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="z-[110] w-[200px] bg-white rounded-3xl border shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar text-slate-700 font-bold uppercase">
                          {filteredPeriodes.length === 0 ? (
                            <div className="p-4 text-center text-[10px] font-bold text-slate-300">
                              TIDAK ADA HASIL
                            </div>
                          ) : (
                            filteredPeriodes.map((opt, i) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, periode: opt });
                                  setPeriodeSearch("");
                                  setIsPeriodeOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${formData.periode === opt || activePeriodeIdx === i ? "bg-slate-900 text-white shadow-lg" : "hover:bg-slate-50 text-slate-500"}`}
                              >
                                {opt}
                              </button>
                            ))
                          )}
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                {/* Tanggal Entry (Custom Date Picker) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tanggal Record
                  </label>
                  <Popover.Root open={isDateOpen} onOpenChange={setIsDateOpen}>
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl flex items-center justify-between font-bold text-slate-700 group focus:ring-4 focus:ring-slate-900/5 focus:bg-white outline-none transition-all shadow-sm"
                      >
                        <span>
                          {formData.tanggal
                            ? new Date(formData.tanggal).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                },
                              )
                            : "--/--/--"}
                        </span>
                        <Calendar
                          size={18}
                          className="text-slate-300 group-hover:text-slate-900"
                        />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="z-[110] bg-white rounded-[40px] border shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200"
                        align="start"
                      >
                        <DatePickerContent />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Link Docs (Cloud)
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700 outline-none"
                    value={formData.linkDocs}
                    onChange={(e) =>
                      setFormData({ ...formData, linkDocs: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Link Faktur Pajak (Cloud)
                  </label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700 outline-none"
                    value={formData.linkFP || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, linkFP: e.target.value })
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Remarks / Catatan
                  </label>
                  <textarea
                    placeholder="Contoh: Potongan tagihan bulan April..."
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700 outline-none resize-none h-24"
                    value={formData.remarks || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Calculator Section */}
              <div className="p-8 bg-slate-50 rounded-[32px] grid grid-cols-1 md:grid-cols-3 gap-8 border border-slate-100 shadow-inner">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    DPP (IDR)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white rounded-xl border-none font-black text-lg text-slate-700 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-200 tabular-nums"
                    placeholder="0"
                    value={formData.dpp ? formatNumber(formData.dpp) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, dpp: Number(raw) });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>PPN (IDR)</span>
                    <span className="text-[9px] text-slate-300 normal-case font-bold italic">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white rounded-xl border-none font-black text-lg text-slate-400 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-200 tabular-nums"
                    placeholder="0"
                    value={formData.ppn ? formatNumber(formData.ppn) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, ppn: raw === "" ? 0 : Number(raw) });
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>PPH (IDR)</span>
                    <span className="text-[9px] text-slate-300 normal-case font-bold italic">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white rounded-xl border-none font-black text-lg text-rose-400 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-200 tabular-nums"
                    placeholder="0"
                    value={formData.pph ? formatNumber(formData.pph) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, pph: raw === "" ? 0 : Number(raw) });
                    }}
                  />
                </div>
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                    Net Settlement
                  </label>
                  <div className="w-full px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-xl tabular-nums shadow-sm">
                    {formatRp(calculatedTotal)}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black hover:bg-slate-200 transition-all text-[11px] uppercase tracking-widest text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] px-12 py-5 bg-slate-900 text-white rounded-[32px] font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95 text-[11px] uppercase tracking-widest disabled:opacity-50"
                >
                  {saving
                    ? "Deploying..."
                    : editId
                      ? "Update Record"
                      : "Finalize & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sweet Alert Style Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setDeleteConfirmId(null)}
          ></div>
          <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95 duration-300 text-slate-900">
            <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <AlertCircle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">
              Are you sure?
            </h3>
            <p className="text-xs text-slate-400 font-bold mb-10">
              You are about to permanently delete this record. This action
              cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-3xl text-[10px] uppercase hover:bg-slate-200 transition-all"
              >
                No, Keep it
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-4 bg-rose-600 text-white font-black rounded-3xl text-[10px] uppercase hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          loadData();
          showToast("success", "Bulk Upload Berhasil!");
        }}
        title="Bulk Upload Promo"
        variant="promo"
      />
    </main>
  );
}
