"use client";

import React from "react";

interface BulkUploadConfirmModalProps {
  open: boolean;
  duplicateNos: string[];
  onConfirm: (replace: boolean) => Promise<void>;
  onClose: () => void;
}

export default function BulkUploadConfirmModal({
  open,
  duplicateNos,
  onConfirm,
  onClose,
}: BulkUploadConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-blue-50/50">
          <h3 className="text-lg font-extrabold text-slate-800">
            Konfirmasi Duplikat PO
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Terdeteksi {duplicateNos.length} nomor PO sudah ada di database.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <div className="text-sm text-slate-700">
            Contoh: {duplicateNos.slice(0, 5).join(", ")}
            {duplicateNos.length > 5 && " ..."}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onConfirm(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
            >
              Replace Duplikat
            </button>
            <button
              onClick={() => onConfirm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
            >
              Skip Duplikat
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
