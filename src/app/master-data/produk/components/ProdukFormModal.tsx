"use client";

import React from "react";
import { Archive, X } from "lucide-react";

interface ProdukFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  newProductName: string;
  setNewProductName: (val: string) => void;
  newProductSatuanKg: string;
  setNewProductSatuanKg: (val: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export default function ProdukFormModal({
  isOpen,
  onClose,
  newProductName,
  setNewProductName,
  newProductSatuanKg,
  setNewProductSatuanKg,
  handleSubmit,
}: ProdukFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex-none p-5 sm:p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 dark:bg-indigo-500/20 text-white dark:text-indigo-400 rounded-xl">
              <Archive size={18} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              Tambah Product
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nama Produk
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: PUNOKAWAN 5 KG"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm font-semibold shadow-sm dark:text-slate-200"
              />
              <p className="mt-2 text-[11px] text-gray-400 italic font-medium">
                * Gunakan nama SKU resmi (satu kolom &apos;Produk&apos; untuk
                bulk) *
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Satuan KG (Kg per pcs)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="Misal: 5"
                value={newProductSatuanKg}
                onChange={(e) => setNewProductSatuanKg(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm font-semibold shadow-sm dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex-none p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none active:scale-95 text-sm"
            >
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
