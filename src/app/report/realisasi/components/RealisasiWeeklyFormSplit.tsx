"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  MapPin,
  Calendar,
  FileText,
  Save,
  RotateCcw,
  X,
  Upload,
  Sparkles,
} from "lucide-react";
import { WeeklyDocumentationItem } from "./RealisasiWeeklySlide";

interface RealisasiWeeklyFormSplitProps {
  docs: WeeklyDocumentationItem[];
  setDocs: (docs: WeeklyDocumentationItem[]) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export default function RealisasiWeeklyFormSplit({
  docs,
  setDocs,
  onSave,
  onCancel,
  onReset,
}: RealisasiWeeklyFormSplitProps) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const handleUpdateField = (
    index: number,
    field: keyof WeeklyDocumentationItem,
    value: string
  ) => {
    const updated = [...docs];
    if (!updated[index]) {
      updated[index] = {
        photoUrl: "",
        location: "",
        date: "",
        description: "",
      };
    }
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setDocs(updated);
  };

  const handleFileUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateField(index, "photoUrl", result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col max-h-[calc(100vh-140px)] overflow-hidden">
      {/* ── Form Header ───────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Form Dokumentasi Lapangan
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Input 5 foto dokumentasi lapangan beserta lokasi & keterangannya
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Tab Selector for 5 Cards ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, idx) => (
          <button
            key={`tab-${idx}`}
            type="button"
            onClick={() => setActiveCardIndex(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeCardIndex === idx
                ? "bg-[#0B2A59] text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
            }`}
          >
            <span>Foto #{idx + 1}</span>
            {docs[idx]?.photoUrl ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Form Body (Active Card Input) ─────────────────────────────────── */}
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {(() => {
          const idx = activeCardIndex;
          const currentDoc = docs[idx] || {
            photoUrl: "",
            location: "",
            date: "",
            description: "",
          };

          return (
            <div className="space-y-4">
              {/* Photo Preview & Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#0B2A59] dark:text-blue-400" />
                  Foto Dokumentasi #{idx + 1}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-44 aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative shrink-0">
                    {currentDoc.photoUrl ? (
                      <img
                        src={currentDoc.photoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                        <span className="text-[10px]">Belum ada foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors">
                      <Upload size={14} />
                      <span>Upload Foto dari Perangkat</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(idx, e)}
                      />
                    </label>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">
                        Atau tempel URL gambar:
                      </span>
                      <input
                        type="text"
                        value={currentDoc.photoUrl || ""}
                        onChange={(e) =>
                          handleUpdateField(idx, "photoUrl", e.target.value)
                        }
                        placeholder="https://... atau /img/..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#0B2A59] dark:text-blue-400" />
                  Lokasi / Mitra Ritel
                </label>
                <input
                  type="text"
                  value={currentDoc.location || ""}
                  onChange={(e) =>
                    handleUpdateField(idx, "location", e.target.value)
                  }
                  placeholder="Contoh: Alfamidi – Jl Swadaya"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#0B2A59] dark:text-blue-400" />
                  Tanggal Pengambilan
                </label>
                <input
                  type="text"
                  value={currentDoc.date || ""}
                  onChange={(e) =>
                    handleUpdateField(idx, "date", e.target.value)
                  }
                  placeholder="Contoh: 25 September 2026"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0B2A59] dark:text-blue-400" />
                  Deskripsi / Keterangan
                </label>
                <textarea
                  value={currentDoc.description || ""}
                  onChange={(e) =>
                    handleUpdateField(idx, "description", e.target.value)
                  }
                  rows={2}
                  placeholder="Contoh: Produk beras premium tersedia di rak ritel modern."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Form Actions Footer ───────────────────────────────────────────── */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw size={13} />
          Reset Default
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0B2A59] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Save size={13} />
            Simpan Dokumentasi
          </button>
        </div>
      </div>
    </div>
  );
}
