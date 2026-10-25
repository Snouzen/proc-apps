"use client";

import React from "react";
import { Archive, X } from "lucide-react";
import { Product } from "../types";

interface ProdukDetailModalProps {
  viewProduct: Product | null;
  onClose: () => void;
}

export default function ProdukDetailModal({
  viewProduct,
  onClose,
}: ProdukDetailModalProps) {
  if (!viewProduct) return null;

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
              Detail Produk
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="text-xs text-slate-400 font-bold uppercase">ID</div>
          <div className="text-sm font-mono text-slate-700 dark:text-slate-300">
            {viewProduct.id}
          </div>
          <div className="text-xs text-slate-400 font-bold uppercase">
            Nama Produk
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {viewProduct.name}
          </div>
          <div className="text-xs text-slate-400 font-bold uppercase">
            Satuan (Kg/pcs)
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {viewProduct.satuanKg ?? ""}
          </div>
        </div>
      </div>
    </div>
  );
}
