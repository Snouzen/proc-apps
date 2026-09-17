"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Plus, Trash2, Loader2, Building2, Save, X, Search, Store } from "lucide-react";
import { OptionRitel, FormRowItem } from "./RealisasiFormModal";
import { DAFTAR_PROVINSI_INDONESIA } from "@/lib/constants/provinces";
import DateInputHybrid from "@/components/DateInputHybrid";
import ProvinsiSelect from "./ProvinsiSelect";

interface RitelSearchInputProps {
  value: string;
  companyName?: string | null;
  options: OptionRitel[];
  onSelect: (option: OptionRitel) => void;
  onChangeText: (text: string) => void;
}

function RitelSearchInput({
  value,
  companyName,
  options,
  onSelect,
  onChangeText,
}: RitelSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Synchronize internal text if value prop changes externally (e.g. initial load or reset)
  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  // Filter options dynamically by inisial or company name
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.inisial.toLowerCase().includes(q) ||
        o.namaPt.toLowerCase().includes(q)
    );
  }, [options, search]);

  const handlePick = (opt: OptionRitel) => {
    setSearch(opt.inisial);
    onSelect(opt);
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className="relative w-full">
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-2.5 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                onChangeText(val);
                setOpen(true);
                setHighlightIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!open) setOpen(true);
                  else
                    setHighlightIndex((prev) =>
                      Math.min(prev + 1, filtered.length - 1)
                    );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === "Enter") {
                  if (open && filtered[highlightIndex]) {
                    e.preventDefault();
                    handlePick(filtered[highlightIndex]);
                  }
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Ketik inisial / PT ritel... (contoh: HERO, INDOMARET)"
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-2xs"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  onChangeText("");
                  setOpen(true);
                }}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                title="Hapus ketikan"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          {companyName && !open && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1 mt-0.5 truncate">
              {companyName}
            </div>
          )}
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[9999] w-[var(--radix-anchor-width)] max-h-56 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 space-y-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 text-center leading-relaxed">
              Tidak ada mitra terdaftar yang cocok.<br />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                &quot;{search}&quot;
              </span>{" "}
              akan disimpan sebagai entri nama manual.
            </div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.id || `${opt.namaPt}-${opt.inisial}`}
                type="button"
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => handlePick(opt)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                  highlightIndex === i
                    ? "bg-blue-50 dark:bg-blue-900/40 text-blue-950 dark:text-blue-100"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs">
                    {opt.logoUrl ? (
                      <img
                        src={opt.logoUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Store
                        size={14}
                        className="text-slate-300 dark:text-slate-600"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs tracking-tight truncate">
                      {opt.inisial}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {opt.namaPt}
                    </div>
                  </div>
                </div>

                {opt.provinsi && (
                  <span className="shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-600">
                    📍 {opt.provinsi}
                  </span>
                )}
              </button>
            ))
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

interface RealisasiFormSplitProps {
  tanggal: string;
  setTanggal: (val: string) => void;
  judul: string;
  setJudul: (val: string) => void;
  subjudul: string;
  setSubjudul: (val: string) => void;
  sumberCatatan: string;
  setSumberCatatan: (val: string) => void;
  daftarRegional: string;
  setDaftarRegional: (val: string) => void;
  items: FormRowItem[];
  setItems: React.Dispatch<React.SetStateAction<FormRowItem[]>>;
  ritelOptions: OptionRitel[];
  loadingOptions: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isEditMode: boolean;
  existingReportDates?: string[];
}

export default function RealisasiFormSplit({
  tanggal,
  setTanggal,
  judul,
  setJudul,
  subjudul,
  setSubjudul,
  sumberCatatan,
  setSumberCatatan,
  daftarRegional,
  setDaftarRegional,
  items,
  setItems,
  ritelOptions,
  loadingOptions,
  saving,
  onSave,
  onCancel,
  isEditMode,
  existingReportDates = [],
}: RealisasiFormSplitProps) {
  const standardProvinces = DAFTAR_PROVINSI_INDONESIA;
  const isDateConflict = Boolean(
    existingReportDates && tanggal && existingReportDates.includes(tanggal)
  );

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        ritelId: null,
        companyName: "",
        provinsi: "Jabodetabek",
        namaRitel: "",
        logoUrl: null,
        volumeKg: 0,
        urutan: prev.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectRitel = (index: number, selectedId: string) => {
    const found = ritelOptions.find((r) => r.id === selectedId);
    if (!found) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        ritelId: found.id,
        companyName: found.namaPt,
        namaRitel: found.inisial,
        logoUrl: found.logoUrl,
        provinsi: found.provinsi || copy[index].provinsi || "Jabodetabek",
      };
      return copy;
    });
  };

  const handleUpdateField = (
    index: number,
    field: keyof FormRowItem,
    val: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val,
      };
      return copy;
    });
  };

  const totalKgLive = items.reduce(
    (sum, it) => sum + Number(it.volumeKg || 0),
    0
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isEditMode ? "Edit Rekapan Realisasi" : "Input Rekapan Baru"}
          </h2>
          <p className="text-[11px] text-slate-400">
            Pratinjau slide di kanan akan otomatis ter-update live
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || isDateConflict}
            title={
              isDateConflict
                ? "Pilih tanggal lain yang belum memiliki laporan"
                : undefined
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={13} />
                Simpan Rekapan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Content (Scrollable) */}
      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(100vh-200px)]">
        {/* Basic Info: Hanya Tanggal Realisasi */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Tanggal Realisasi <span className="text-rose-500">*</span>
          </label>
          <DateInputHybrid
            value={tanggal}
            onChange={(val) => setTanggal(val)}
            placeholder="Pilih tanggal..."
            className="w-full"
            inputClassName={`py-1.5 px-3 text-xs font-bold rounded-lg ${
              isDateConflict
                ? "border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-400"
                : "border-slate-200 dark:border-slate-700"
            }`}
          />
          {isDateConflict && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
              ⚠️ Laporan untuk tanggal ini sudah ada. Dalam 1 hari hanya diperbolehkan 1 laporan.
            </p>
          )}
        </div>

        {/* Input Manual: Daftar Regional (Tepat di bawah Tanggal Realisasi) */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                Daftar Regional
              </label>
              <p className="text-[10px] text-slate-400">
                Teks regional pada card &quot;Jumlah Regional&quot;
              </p>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#0B2A59] dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
              {(() => {
                const entered = (daftarRegional || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                return `${entered.length} Regional`;
              })()}
            </span>
          </div>

          <input
            type="text"
            value={daftarRegional}
            onChange={(e) => setDaftarRegional(e.target.value)}
            placeholder="Contoh: Jabodetabek, Jawa, Sulawesi"
            className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />

          <p className="text-[10px] text-slate-400 leading-tight">
            Ketik nama-nama regional dipisahkan koma. Angka jumlah regional akan dihitung otomatis sesuai entri yang diketik.
          </p>
        </div>

        {/* Retailers Section Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
              Mitra Ritel ({items.length})
            </span>
            <p className="text-[10px] text-slate-400">
              Total: {totalKgLive.toLocaleString("id-ID")} KG
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#0B2A59] text-white text-[11px] font-bold rounded-lg hover:bg-blue-900 transition-all shadow-2xs"
          >
            <Plus size={12} />
            Tambah
          </button>
        </div>

        {/* Ritel Cards */}
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="w-9 h-7 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-0.5">
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 size={12} className="text-slate-400" />
                    )}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                    {item.namaRitel || "Pilih Ritel"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Searchable Ritel Combobox */}
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">
                  Pilih / Ketik Inisial Ritel
                </label>
                <RitelSearchInput
                  value={item.namaRitel}
                  companyName={item.companyName}
                  options={ritelOptions}
                  onSelect={(opt) => {
                    setItems((prev) => {
                      const copy = [...prev];
                      copy[idx] = {
                        ...copy[idx],
                        ritelId: opt.id,
                        namaRitel: opt.inisial,
                        companyName: opt.namaPt,
                        logoUrl: opt.logoUrl,
                        provinsi: opt.provinsi || copy[idx].provinsi || "Jabodetabek",
                      };
                      return copy;
                    });
                  }}
                  onChangeText={(text) => {
                    handleUpdateField(idx, "namaRitel", text);
                  }}
                />
              </div>

              {/* Wilayah & Volume inputs side by side */}
              <div className="grid grid-cols-2 gap-2 items-start">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    Wilayah / Provinsi
                  </label>
                  <ProvinsiSelect
                    value={item.provinsi || "Jabodetabek"}
                    onChange={(val) => handleUpdateField(idx, "provinsi", val)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase mb-1">
                    Volume (KG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.volumeKg || ""}
                    onChange={(e) =>
                      handleUpdateField(
                        idx,
                        "volumeKg",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-blue-700 dark:text-blue-400 shadow-2xs no-spinners [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
              Belum ada ritel. Klik Tambah di atas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
