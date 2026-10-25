"use client";

import React from "react";

export interface BulkDialogState {
  rows: any[];
  dupeCount: number;
  namaPtKey: string | null;
  tujuanKey: string | null;
  inisialAliases: string[];
}

interface RitelBulkConfirmModalProps {
  bulkDialog: BulkDialogState | null;
  setBulkDialog: (val: BulkDialogState | null) => void;
  companyMapping: Record<string, string>;
  executeRitelBulk: (replaceDuplicates: boolean) => void;
  findColumnKey: (row: any, aliases: string[]) => string | null;
  getCellValue: (row: any, key: string | null) => string;
}

export default function RitelBulkConfirmModal({
  bulkDialog,
  setBulkDialog,
  companyMapping,
  executeRitelBulk,
  findColumnKey,
  getCellValue,
}: RitelBulkConfirmModalProps) {
  if (!bulkDialog) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setBulkDialog(null)}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-blue-50/50 dark:bg-indigo-500/10">
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            Konfirmasi Bulk Upload
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total {bulkDialog.rows.length} baris. Duplikat terdeteksi:{" "}
            {bulkDialog.dupeCount}.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                <tr>
                  <th className="p-2 font-medium text-slate-500 dark:text-slate-400">
                    Nama PT
                  </th>
                  <th className="p-2 font-medium text-slate-500 dark:text-slate-400">
                    Inisial
                  </th>
                  <th className="p-2 font-medium text-slate-500 dark:text-slate-400">
                    Tujuan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {bulkDialog.rows.slice(0, 5).map((row, i) => {
                  const namaPt = getCellValue(row, bulkDialog.namaPtKey);
                  const tujuan = getCellValue(row, bulkDialog.tujuanKey);
                  const inisialKey = findColumnKey(
                    row,
                    bulkDialog.inisialAliases
                  );
                  const excelInisial = getCellValue(row, inisialKey);
                  const inisial =
                    companyMapping[namaPt] ?? (excelInisial || "");
                  return (
                    <tr key={i}>
                      <td className="p-2 text-slate-700 dark:text-slate-300">
                        {namaPt}
                      </td>
                      <td className="p-2 text-slate-700 dark:text-slate-300">
                        {inisial || "—"}
                      </td>
                      <td className="p-2 text-slate-700 dark:text-slate-300">
                        {tujuan}
                      </td>
                    </tr>
                  );
                })}
                {bulkDialog.rows.length > 5 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-2 text-center text-slate-400 dark:text-slate-500 italic"
                    >
                      ...dan {bulkDialog.rows.length - 5} data lain
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {bulkDialog.dupeCount > 0 ? (
              <>
                <button
                  onClick={() => executeRitelBulk(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors"
                >
                  Replace Duplikat
                </button>
                <button
                  onClick={() => executeRitelBulk(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                >
                  Skip Duplikat
                </button>
              </>
            ) : (
              <button
                onClick={() => executeRitelBulk(false)}
                className="col-span-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
              >
                Submit
              </button>
            )}
          </div>
          <button
            onClick={() => setBulkDialog(null)}
            className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
