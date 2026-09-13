"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Building2, MapPin, Scale } from "lucide-react";
import Swal from "sweetalert2";
import DateInputHybrid from "@/components/DateInputHybrid";
import ProvinsiSelect from "./ProvinsiSelect";

export interface OptionRitel {
  id: string;
  namaPt: string;
  provinsi: string | null;
  inisial: string;
  tujuan?: string | null;
  logoUrl: string | null;
  provinces?: string[];
}

export interface FormRowItem {
  ritelId?: string | null;
  companyName?: string | null;
  provinsi?: string | null;
  namaRitel: string;
  logoUrl?: string | null;
  volumeKg: number;
  urutan: number;
}

export default function RealisasiFormModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any | null;
  onSaved: () => void;
}) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [ritelOptions, setRitelOptions] = useState<OptionRitel[]>([]);
  const [saving, setSaving] = useState(false);

  // Form states
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [judul, setJudul] = useState("PROGRES PEMENUHAN RITEL MODERN");
  const [subjudul, setSubjudul] = useState("");
  const [sumberCatatan, setSumberCatatan] = useState("");
  const [items, setItems] = useState<FormRowItem[]>([]);

  // Fetch Retailer Options
  useEffect(() => {
    if (!isOpen) return;
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await fetch("/api/realisasi/ritel-options");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setRitelOptions(json.data);
        }
      } catch (err) {
        console.error("Failed to load ritel options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isOpen]);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      const dt = new Date(initialData.tanggal);
      setTanggal(
        !isNaN(dt.getTime())
          ? dt.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setJudul(initialData.judul || "PROGRES PEMENUHAN RITEL MODERN");
      setSubjudul(initialData.subjudul || "");
      setSumberCatatan(initialData.sumberCatatan || "");

      if (Array.isArray(initialData.items) && initialData.items.length > 0) {
        setItems(
          initialData.items.map((it: any, idx: number) => ({
            ritelId: it.ritelId || null,
            companyName: it.companyName || "",
            provinsi: it.provinsi || "",
            namaRitel: it.namaRitel || "",
            logoUrl: it.logoUrl || null,
            volumeKg: Number(it.volumeKg || 0),
            urutan: typeof it.urutan === "number" ? it.urutan : idx,
          }))
        );
      } else {
        // Default 1 empty row
        setItems([
          {
            ritelId: null,
            companyName: "",
            provinsi: "Jabodetabek",
            namaRitel: "",
            logoUrl: null,
            volumeKg: 0,
            urutan: 0,
          },
        ]);
      }
    } else {
      // New form defaults
      setTanggal(new Date().toISOString().split("T")[0]);
      setJudul("PROGRES PEMENUHAN RITEL MODERN");
      setSubjudul("");
      setSumberCatatan("");
      setItems([
        {
          ritelId: null,
          companyName: "",
          provinsi: "Jabodetabek",
          namaRitel: "",
          logoUrl: null,
          volumeKg: 0,
          urutan: 0,
        },
      ]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Add Item Row
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

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Change Selection in a Row
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
        // Auto-fill provinsi if available and not yet set
        provinsi: found.provinsi || copy[index].provinsi || "Jabodetabek",
      };
      return copy;
    });
  };

  // Update specific field in row
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggal) {
      Swal.fire({
        title: "Perhatian",
        text: "Tanggal realisasi wajib dipilih!",
        icon: "warning",
      });
      return;
    }

    // Filter valid items (namaRitel filled)
    const validItems = items.filter((it) => it.namaRitel && it.namaRitel.trim());
    if (validItems.length === 0) {
      Swal.fire({
        title: "Perhatian",
        text: "Minimal 1 data ritel harus dipilih!",
        icon: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: initialData?.id || undefined,
        tanggal,
        judul,
        subjudul: subjudul || undefined,
        sumberCatatan: sumberCatatan || undefined,
        items: validItems,
      };

      const res = await fetch("/api/realisasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan rekapan");
      }

      Swal.fire({
        title: "Berhasil!",
        text: "Rekapan Realisasi Pemenuhan berhasil disimpan.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      Swal.fire({
        title: "Gagal Menyimpan",
        text: err.message,
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalKgLive = items.reduce(
    (sum, it) => sum + Number(it.volumeKg || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {initialData ? "Edit Rekapan Realisasi" : "Buat Rekapan Realisasi Baru"}
            </h2>
            <p className="text-xs text-slate-500">
              Input data pemenuhan ritel modern
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Section 1: Header Info (Hanya Tanggal Realisasi) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Tanggal Realisasi <span className="text-rose-500">*</span>
            </label>
            <DateInputHybrid
              value={tanggal}
              onChange={(val) => setTanggal(val)}
              placeholder="Pilih tanggal..."
              className="w-full"
              inputClassName="py-1.5 px-3 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Section 2: Items List (Maks 12) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  Mitra Ritel Yang Dilayani ({items.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Pilih inisial ritel dari master data, provinsi, dan volume realisasi (KG)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                  Total: {totalKgLive.toLocaleString("id-ID")} KG ({(totalKgLive / 1000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TON)
                </span>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2A59] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-xs"
                >
                  <Plus size={14} />
                  Tambah Ritel
                </button>
              </div>
            </div>

            {/* List of Item Rows */}
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col md:flex-row items-start md:items-center gap-3 transition-all"
                >
                  {/* Number Badge */}
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  {/* Logo Preview */}
                  <div className="w-12 h-10 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 size={16} className="text-slate-300" />
                    )}
                  </div>

                  {/* Dropdown Ritel (Hierarki: Company -> Inisial) */}
                  <div className="flex-1 w-full md:w-auto">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                      Pilih Inisial Ritel
                    </label>
                    <select
                      value={item.ritelId || ""}
                      onChange={(e) => handleSelectRitel(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Ritel --</option>
                      {ritelOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.inisial} ({opt.namaPt})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Provinsi (Editable) */}
                  <div className="w-full md:w-48">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                      Wilayah / Provinsi
                    </label>
                    <ProvinsiSelect
                      value={item.provinsi || "Jabodetabek"}
                      onChange={(val) => handleUpdateField(idx, "provinsi", val)}
                    />
                  </div>

                  {/* Volume (KG) */}
                  <div className="w-full md:w-36">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
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
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-blue-700 dark:text-blue-400 shadow-2xs no-spinners [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors self-end md:self-center"
                    title="Hapus Ritel"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                  <p className="text-xs font-semibold">Belum ada ritel yang ditambahkan.</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Tambah Ritel Sekarang
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0B2A59] hover:bg-blue-900 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Rekapan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
