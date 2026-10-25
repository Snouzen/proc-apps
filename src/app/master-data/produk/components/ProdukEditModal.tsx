"use client";

import React from "react";
import { Archive, X } from "lucide-react";
import { StatefulButton } from "@/components/ui/stateful-button";
import { Product } from "../types";

interface ProdukEditModalProps {
  editProduct: Product | null;
  onClose: () => void;
  editName: string;
  setEditName: (name: string) => void;
  editSatuan: string;
  setEditSatuan: (satuan: string) => void;
  handleUpdate: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
}

export default function ProdukEditModal({
  editProduct,
  onClose,
  editName,
  setEditName,
  editSatuan,
  setEditSatuan,
  handleUpdate,
  saving,
}: ProdukEditModalProps) {
  if (!editProduct) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 dark:bg-indigo-500/20 text-white dark:text-indigo-400 rounded-xl">
              <Archive size={18} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              Edit Produk
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleUpdate} className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Nama Produk
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm font-semibold shadow-sm dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Satuan KG (Kg per pcs)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={editSatuan}
              onChange={(e) => setEditSatuan(e.target.value)}
              className="w-full px-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm font-semibold shadow-sm dark:text-slate-200"
            />
          </div>
          <div className="flex gap-3">
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
                if (saving) return;
                await handleUpdate(new Event("submit") as any);
              }}
              className="flex-1"
            >
              Simpan Perubahan
            </StatefulButton>
          </div>
        </form>
      </div>
    </div>
  );
}
