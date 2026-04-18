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
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAutoRefreshTick } from "@/components/auto-refresh";
import * as Popover from "@radix-ui/react-popover";

interface Promo {
  id: string;
  nomor: string;
  linkDocs?: string;
  kegiatan: string;
  periode: string;
  tanggal: string;
  dpp: number;
  ppn: number;
  total: number;
}

export default function PromoPage() {
  const refreshTick = useAutoRefreshTick();
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // State for Form
  const [formData, setFormData] = useState({
    nomor: "",
    linkDocs: "",
    kegiatan: "Dc Fee",
    periode: "Januari",
    tanggal: "", // Set after mount
    dpp: 0,
    ppn: 0,
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
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

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
    loadData();
  }, []);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("id-ID").format(val);
  };

  const loadData = async () => {
    try {
      const res = await fetch("/api/promo");
      const json = await res.json();
      setPromos(json.data || []);
    } catch {
      setPromos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatedTotal = useMemo(() => {
    return Number(formData.dpp) + Number(formData.ppn);
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

  const filtered = promos.filter((p) =>
    (p.nomor + p.kegiatan + p.id)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

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

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 lg:px-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-rose-600 text-white" : "bg-blue-600 text-white"}`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Master Promo
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Daftar List Promo
          </p>
        </div>

        <button
          onClick={() => {
            setEditId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-[32px] font-black hover:bg-slate-800 transition-all shadow-xl active:scale-95 text-xs uppercase"
        >
          <Plus size={18} />
          Add Promo
        </button>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative max-w-md group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search ID, Nomor, or Kegiatan..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all text-sm font-black text-slate-700 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
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
                <th className="px-8 py-6 text-right">Total</th>
                <th className="px-8 py-6 text-center text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-[13px] text-slate-700">
              {isLoading ? (
                <tr>
                  <td className="px-8 py-10" colSpan={9}>
                    Memuat Master Data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-8 py-10 text-slate-300 italic" colSpan={9}>
                    Data promo tidak ditemukan.
                  </td>
                </tr>
              ) : (
                currentItems.map((promo) => (
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
                    <td className="px-8 py-6 text-right text-indigo-600 font-black tabular-nums scale-[1.05] origin-right">
                      {formatRp(promo.total)}
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

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Dokumentasi Link (Cloud)
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    PPN (IDR)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white rounded-xl border-none font-black text-lg text-slate-400 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-200 tabular-nums"
                    placeholder="0"
                    value={formData.ppn ? formatNumber(formData.ppn) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, ppn: Number(raw) });
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
    </div>
  );
}
