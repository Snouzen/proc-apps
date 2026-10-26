"use client";

import React, { useState, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Percent, X, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { PromoFormData } from "../types";
import { formatRp, formatNumber } from "../hooks/usePromoData";

interface PromoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editId: string | null;
  formData: PromoFormData;
  setFormData: React.Dispatch<React.SetStateAction<PromoFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}

function PromoDatePickerContent({ value, onSelect }: { value: string; onSelect: (date: string) => void }) {
    const [viewDate, setViewDate] = useState(
      new Date(value || new Date())
    );
    const daysInMonth = (month: number, year: number) =>
      new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      1
    ).getDay();
    const days = Array.from(
      { length: daysInMonth(viewDate.getMonth(), viewDate.getFullYear()) },
      (_, i) => i + 1
    );
    const monthName = viewDate.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });

    return (
      <div className="p-3 sm:p-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
              )
            }
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
            {monthName}
          </span>
          <button
            type="button"
            onClick={() =>
              setViewDate(
                new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
              )
            }
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
            <span key={i} className="text-[10px] font-black text-slate-300 dark:text-slate-600">
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
            const dateStr = `${viewDate.getFullYear()}-${String(
              viewDate.getMonth() + 1
            ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const isSelected = value === dateStr;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onSelect(dateStr);
                }}
                className={`w-full aspect-square max-w-[34px] mx-auto flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-lg dark:bg-indigo-600"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

export default function PromoFormModal({
  isOpen,
  onClose,
  editId,
  formData,
  setFormData,
  handleSubmit,
  saving,
}: PromoFormModalProps) {
  // Search/Suggest States
  const [kegiatanSearch, setKegiatanSearch] = useState("");
  const [periodeSearch, setPeriodeSearch] = useState("");

  // Popover States
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false);
  const [activeKegiatanIdx, setActiveKegiatanIdx] = useState(0);
  const [isPeriodeOpen, setIsPeriodeOpen] = useState(false);
  const [activePeriodeIdx, setActivePeriodeIdx] = useState(0);
  const [isDateOpen, setIsDateOpen] = useState(false);

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
      opt.toLowerCase().includes(kegiatanSearch.toLowerCase())
    );
  }, [kegiatanSearch]);

  const filteredPeriodes = useMemo(() => {
    return bulanOptions.filter((opt) =>
      opt.toLowerCase().includes(periodeSearch.toLowerCase())
    );
  }, [periodeSearch]);

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
        prev < filteredKegiatans.length - 1 ? prev + 1 : prev
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
        prev < filteredPeriodes.length - 1 ? prev + 1 : prev
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


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl sm:rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-8 md:p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl sm:rounded-[24px]">
              <Percent size={20} className="sm:w-[24px] sm:h-[24px]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                {editId ? "Update Promo" : "Add Promo"}
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">
                Master Data Setting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 sm:p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl sm:rounded-[24px] text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-all focus:outline-none cursor-pointer"
          >
            <X size={20} className="sm:w-[24px] sm:h-[24px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-8 md:p-10 space-y-6 sm:space-y-8 flex-1 overflow-y-auto custom-scrollbar shadow-inner dark:shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {/* Nomor Dokumen */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Nomor Dokumen
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1672/Apr/24"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 outline-none"
                  value={formData.nomor}
                  onChange={(e) =>
                    setFormData({ ...formData, nomor: e.target.value })
                  }
                />
              </div>

              {/* Jenis Kegiatan (Searchable / Combobox) */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
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
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all pr-12"
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 pointer-events-none"
                      />
                    </div>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[110] w-[calc(100vw-48px)] sm:w-[300px] max-w-[300px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar text-slate-700 dark:text-slate-300 font-bold uppercase">
                        {filteredKegiatans.length === 0 ? (
                          <div className="p-4 text-center text-[10px] font-bold text-slate-300 dark:text-slate-500">
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
                              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                                formData.kegiatan === opt ||
                                activeKegiatanIdx === i
                                  ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-lg"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
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
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
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
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all pr-12"
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500 pointer-events-none"
                      />
                    </div>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[110] w-[calc(100vw-48px)] sm:w-[200px] max-w-[200px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-2 outline-none animate-in fade-in zoom-in-95 duration-200"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar text-slate-700 dark:text-slate-300 font-bold uppercase">
                        {filteredPeriodes.length === 0 ? (
                          <div className="p-4 text-center text-[10px] font-bold text-slate-300 dark:text-slate-500">
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
                              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                                formData.periode === opt ||
                                activePeriodeIdx === i
                                  ? "bg-slate-900 dark:bg-indigo-600 text-white shadow-lg"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
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
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Tanggal Record
                </label>
                <Popover.Root open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl flex items-center justify-between font-bold text-slate-700 dark:text-slate-200 group focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all shadow-sm"
                    >
                      <span>
                        {formData.tanggal
                          ? new Date(formData.tanggal).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              }
                            )
                          : "--/--/--"}
                      </span>
                      <Calendar
                        size={18}
                        className="text-slate-300 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                      />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-[110] w-[calc(100vw-48px)] sm:w-[280px] max-w-[280px] bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                      align="start"
                    >
                      <PromoDatePickerContent value={formData.tanggal} onSelect={(tanggal) => { setFormData((prev) => ({ ...prev, tanggal })); setIsDateOpen(false); }} />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Link Docs (Cloud)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 outline-none"
                  value={formData.linkDocs}
                  onChange={(e) =>
                    setFormData({ ...formData, linkDocs: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Link Faktur Pajak (Cloud)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 outline-none"
                  value={formData.linkFP || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, linkFP: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Remarks / Catatan
                </label>
                <textarea
                  placeholder="Contoh: Potongan tagihan bulan April..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 outline-none resize-none h-24"
                  value={formData.remarks || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Calculator Section */}
            <div className="p-4 sm:p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl sm:rounded-[32px] grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  DPP (IDR)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-none font-black text-base sm:text-lg text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-600 tabular-nums"
                  placeholder="0"
                  value={formData.dpp ? formatNumber(formData.dpp) : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({ ...formData, dpp: Number(raw) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>PPN (IDR)</span>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600 normal-case font-bold italic">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-none font-black text-base sm:text-lg text-slate-400 dark:text-slate-300 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-600 tabular-nums"
                  placeholder="0"
                  value={formData.ppn ? formatNumber(formData.ppn) : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({
                      ...formData,
                      ppn: raw === "" ? 0 : Number(raw),
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>PPH (IDR)</span>
                  <span className="text-[9px] text-slate-300 dark:text-slate-600 normal-case font-bold italic">
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-none font-black text-base sm:text-lg text-rose-400 dark:text-rose-400 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-rose-500/20 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-600 tabular-nums"
                  placeholder="0"
                  value={formData.pph ? formatNumber(formData.pph) : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setFormData({
                      ...formData,
                      pph: raw === "" ? 0 : Number(raw),
                    });
                  }}
                />
              </div>
              <div className="md:col-span-3 space-y-2 text-center pt-4 border-t border-slate-50 dark:border-slate-800">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                  Net Settlement
                </label>
                <div className="text-2xl sm:text-4xl font-black text-emerald-600 tabular-nums tracking-tighter truncate">
                  {formatRp(calculatedTotal)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-3.5 sm:py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl sm:rounded-3xl font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[11px] uppercase tracking-widest cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-[2] py-3.5 sm:py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl sm:rounded-[32px] font-black hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95 text-[11px] uppercase tracking-widest disabled:opacity-50 cursor-pointer text-center"
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
  );
}
