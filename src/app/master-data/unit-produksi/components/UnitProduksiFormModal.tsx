"use client";

import React from "react";
import { X, Globe2, MapPin, Edit2 } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";
import { StatefulButton } from "@/components/ui/stateful-button";
import { saveUnitProduksi } from "@/lib/api";

interface UnitProduksiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalMode: "addSite" | "addRegional";
  setModalMode: (mode: "addSite" | "addRegional") => void;
  contextRegional: string | null;
  selectedRegional: string;
  setSelectedRegional: (val: string) => void;
  regionalOptions: any[];
  siteName: string;
  setSiteName: (val: string) => void;
  siteAlamat: string;
  setSiteAlamat: (val: string) => void;
  siteManager: string;
  setSiteManager: (val: string) => void;
  dataUnit: any[];
  setDataUnit: React.Dispatch<React.SetStateAction<any[]>>;
  loadData: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function UnitProduksiFormModal({
  isOpen,
  onClose,
  modalMode,
  setModalMode,
  contextRegional,
  selectedRegional,
  setSelectedRegional,
  regionalOptions,
  siteName,
  setSiteName,
  siteAlamat,
  setSiteAlamat,
  siteManager,
  setSiteManager,
  dataUnit,
  setDataUnit,
  loadData,
  showToast,
}: UnitProduksiFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex-none p-5 sm:p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {modalMode === "addRegional"
              ? "Tambah Regional Baru"
              : contextRegional
                ? `Tambah Site ke ${contextRegional}`
                : "Tambah Site Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            <div
              className="relative overflow-hidden"
              style={{
                minHeight:
                  modalMode === "addSite"
                    ? contextRegional
                      ? "160px"
                      : "190px"
                    : "120px",
              }}
            >
            <div
              className={`transition-all duration-300 transform ${
                modalMode === "addSite"
                  ? "translate-x-0 opacity-100 relative"
                  : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              } space-y-5`}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe2 size={12} /> Regional
                </label>
                <SmoothSelect
                  value={selectedRegional}
                  onChange={(v) => setSelectedRegional(v)}
                  options={regionalOptions}
                  width={400}
                  disabled={!!contextRegional}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={12} /> Nama Site
                </label>
                <input
                  required={modalMode === "addSite"}
                  type="text"
                  placeholder="Contoh: SPP Kendal"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Edit2 size={12} /> Manager Operasional
                </label>
                <input
                  type="text"
                  placeholder="Nama Manager (Opsional)"
                  value={siteManager}
                  onChange={(e) => setSiteManager(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Edit2 size={12} /> Alamat Site Area
                </label>
                <textarea
                  rows={2}
                  placeholder="Masukkan alamat lengkap gudang/pabrik..."
                  value={siteAlamat}
                  onChange={(e) => setSiteAlamat(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 resize-none"
                />
              </div>

              {!contextRegional && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegional("");
                    setSiteName("");
                    setModalMode("addRegional");
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
                >
                  Add Regional
                </button>
              )}
            </div>

            <div
              className={`transition-all duration-300 transform ${
                modalMode === "addRegional"
                  ? "translate-x-0 opacity-100 relative"
                  : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
              } space-y-5`}
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Nama Regional
                </label>
                <input
                  required={modalMode === "addRegional"}
                  type="text"
                  placeholder="Contoh: REG 4 KALIMANTAN"
                  value={selectedRegional}
                  onChange={(e) => setSelectedRegional(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRegional("");
                  setSiteName("");
                  setModalMode("addSite");
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        <div className="flex-none p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex gap-3">
            <StatefulButton
              variant="cancel"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </StatefulButton>
            <StatefulButton
              variant="submit"
              onClick={async () => {
                if (
                  modalMode === "addSite" &&
                  (!selectedRegional || !siteName)
                ) {
                  showToast("Regional dan Site Area wajib diisi!", "error");
                  return;
                }
                if (modalMode === "addRegional" && !selectedRegional) {
                  showToast("Nama Regional wajib diisi!", "error");
                  return;
                }
                try {
                  const payload = {
                    regional: selectedRegional,
                    siteArea: modalMode === "addRegional" ? "-" : siteName,
                    alamat: modalMode === "addRegional" ? "" : siteAlamat,
                    managerOperasional:
                      modalMode === "addRegional" ? "" : siteManager,
                  };
                  const created = await saveUnitProduksi(payload);
                  onClose();
                  setSelectedRegional("");
                  setSiteName("");
                  setSiteAlamat("");
                  setSiteManager("");

                  setDataUnit((prev) => [...prev, created]);

                  showToast(
                    modalMode === "addRegional"
                      ? `Regional '${created?.namaRegional || payload.regional}' berhasil dibuat!`
                      : `Site '${payload.siteArea}' berhasil ditambahkan!`
                  );

                  await loadData();
                } catch (err: any) {
                  showToast(err?.message || "Gagal menyimpan data", "error");
                }
              }}
              className="flex-1"
            >
              Simpan {modalMode === "addRegional" ? "Regional" : "Site"}
            </StatefulButton>
          </div>
        </form>
      </div>
    </div>
  );
}
