"use client";

import React from "react";
import { X } from "lucide-react";
import { ResultSummary } from "../types";

interface BulkUploadResultModalProps {
  open: boolean;
  resultSummary: ResultSummary | null;
  onClose: () => void;
  onFinished: () => void;
}

export default function BulkUploadResultModal({
  open,
  resultSummary,
  onClose,
  onFinished,
}: BulkUploadResultModalProps) {
  if (!open || !resultSummary) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800">
            Ringkasan Bulk Upload
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="text-xs text-slate-500">Total PO unik</div>
              <div className="text-xl font-extrabold">
                {resultSummary.uniquePoCount}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="text-xs text-slate-500">PO diproses</div>
              <div className="text-xl font-extrabold">
                {resultSummary.plannedPoCount}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700/80">PO baru</div>
              <div className="text-xl font-extrabold text-emerald-700">
                {resultSummary.addedPoCount}
              </div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-xs text-blue-700/80">Duplikat di-skip</div>
              <div className="text-xl font-extrabold text-blue-700">
                {resultSummary.skippedDuplicatePoCount}
              </div>
            </div>
          </div>

          {resultSummary.addedPOs.length > 0 && (
            <div>
              <div className="font-bold text-slate-800 mb-2">
                Preview PO baru ({resultSummary.addedPOs.length})
              </div>
              <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-2xl bg-white p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {resultSummary.addedPOs.slice(0, 200).map((n) => (
                    <div
                      key={n}
                      className="px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 font-mono text-xs"
                    >
                      {n}
                    </div>
                  ))}
                </div>
                {resultSummary.addedPOs.length > 200 && (
                  <div className="text-xs text-slate-500 mt-3 italic">
                    ...dan {resultSummary.addedPOs.length - 200} PO lainnya
                  </div>
                )}
              </div>
            </div>
          )}

          {resultSummary.errors.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="font-bold text-amber-800">
                Ada error ({resultSummary.errors.length})
              </div>
              <div className="text-xs text-amber-800 mt-2 max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside">
                  {resultSummary.errors.slice(0, 80).map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
                {resultSummary.errors.length > 80 && (
                  <div className="italic mt-2">
                    ...dan {resultSummary.errors.length - 80} error lainnya
                  </div>
                )}
              </div>
            </div>
          )}

          {Array.isArray(resultSummary.debugSamples) &&
            resultSummary.debugSamples.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="font-bold text-slate-800">
                  Debug tanggal (sample)
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="text-left py-1 pr-3">No PO</th>
                        <th className="text-left py-1 pr-3">Raw</th>
                        <th className="text-left py-1 pr-3">Parsed</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {resultSummary.debugSamples.map((s) => (
                        <tr key={s.noPo} className="border-t border-slate-100">
                          <td className="py-1 pr-3 font-mono">{s.noPo}</td>
                          <td className="py-1 pr-3 font-mono">
                            {String(s.tglPoRaw ?? "")} /{" "}
                            {String(s.expiredRaw ?? "")}
                          </td>
                          <td className="py-1 pr-3 font-mono">
                            {String(s.tglPoParsed ?? "")} /{" "}
                            {String(s.expiredParsed ?? "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={onFinished}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
