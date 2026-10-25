"use client";

import React from "react";

export interface BulkDialogState {
  rows: any[];
  dupeCount: number;
  productKey: string;
  satuanKey: string | null;
}

interface ProdukBulkConfirmModalProps {
  bulkDialog: BulkDialogState | null;
  setBulkDialog: (val: BulkDialogState | null) => void;
  executeProdukBulk: (replaceDupes: boolean) => Promise<void>;
}

export default function ProdukBulkConfirmModal({
  bulkDialog,
  setBulkDialog,
  executeProdukBulk,
}: ProdukBulkConfirmModalProps) {
  if (!bulkDialog) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setBulkDialog(null)}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-50 dark:border-slate-800 bg-blue-50/50 dark:bg-indigo-500/10 shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100">
            Konfirmasi Bulk Upload
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total {bulkDialog.rows.length} baris. Duplikat terdeteksi:{" "}
            {bulkDialog.dupeCount}.
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-3 flex-1 overflow-y-auto">
          <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                <tr>
                  <th className="p-2 font-medium text-slate-500 dark:text-slate-400">
                    Produk
                  </th>
                  <th className="p-2 font-medium text-slate-500 dark:text-slate-400">
                    Satuan (Kg)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {bulkDialog.rows.slice(0, 5).map((row, i) => {
                  const name = String(row[bulkDialog.productKey] ?? "").trim();
                  const satuanRaw = bulkDialog.satuanKey
                    ? Number(row[bulkDialog.satuanKey])
                    : 1;
                  const satuan =
                    isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
                  return (
                    <tr key={i}>
                      <td className="p-2 text-slate-700 dark:text-slate-300">
                        {name}
                      </td>
                      <td className="p-2 text-slate-700 dark:text-slate-300">
                        {satuan}
                      </td>
                    </tr>
                  );
                })}
                {bulkDialog.rows.length > 5 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="p-2 text-center text-slate-400 dark:text-slate-500 italic"
                    >
                      ...dan {bulkDialog.rows.length - 5} data lain
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bulkDialog.dupeCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => executeProdukBulk(true)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs sm:text-sm hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  Replace Duplikat
                </button>
                <button
                  type="button"
                  onClick={() => executeProdukBulk(false)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs sm:text-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  Skip Duplikat
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => executeProdukBulk(false)}
                className="col-span-1 sm:col-span-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs sm:text-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Submit
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setBulkDialog(null)}
            className="w-full px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
