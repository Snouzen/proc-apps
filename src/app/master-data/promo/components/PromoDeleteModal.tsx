"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface PromoDeleteModalProps {
  deleteConfirmId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}

export default function PromoDeleteModal({
  deleteConfirmId,
  onClose,
  onConfirm,
  saving,
}: PromoDeleteModalProps) {
  if (!deleteConfirmId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl sm:rounded-[40px] shadow-2xl overflow-hidden p-6 sm:p-10 text-center animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
          <AlertCircle size={32} className="sm:w-[40px] sm:h-[40px]" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
          Are you sure?
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-6 sm:mb-10">
          You are about to permanently delete this record. This action cannot be
          undone.
        </p>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 sm:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black rounded-2xl sm:rounded-3xl text-[10px] uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            No, Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-4 bg-rose-600 text-white font-black rounded-3xl text-[10px] uppercase hover:bg-rose-700 shadow-xl shadow-rose-200 dark:shadow-none transition-all disabled:opacity-50"
          >
            {saving ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
