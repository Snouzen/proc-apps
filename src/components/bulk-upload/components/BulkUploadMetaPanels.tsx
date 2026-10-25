"use client";

import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { LoaderThree } from "@/components/ui/loader";
import { ReadMeta, ResultSummary } from "../types";

interface BulkUploadMetaPanelsProps {
  loading: boolean;
  error: string | null;
  readMeta: ReadMeta | null;
  showReadMeta: boolean;
  setShowReadMeta: React.Dispatch<React.SetStateAction<boolean>>;
  previewDataLength: number;
  uniquePoNosLength: number;
  plannedPoCountPreview: number;
  replaceDupes: boolean;
  setReplaceDupes: (val: boolean) => void;
  setReplaceTouched: (val: boolean) => void;
  duplicateNos: string[];
  duplicateRowMap: Record<string, number[]>;
  showDuplicateRows: boolean;
  setShowDuplicateRows: React.Dispatch<React.SetStateAction<boolean>>;
  errorList: string[];
  failedRows: number[];
  showFailedRows: boolean;
  setShowFailedRows: React.Dispatch<React.SetStateAction<boolean>>;
  successCount: number;
  resultSummary: ResultSummary | null;
  missingCounts: Record<string, number> | null;
  setResultOpen: (val: boolean) => void;
}

export default function BulkUploadMetaPanels({
  loading,
  error,
  readMeta,
  showReadMeta,
  setShowReadMeta,
  previewDataLength,
  uniquePoNosLength,
  plannedPoCountPreview,
  replaceDupes,
  setReplaceDupes,
  setReplaceTouched,
  duplicateNos,
  duplicateRowMap,
  showDuplicateRows,
  setShowDuplicateRows,
  errorList,
  failedRows,
  showFailedRows,
  setShowFailedRows,
  successCount,
  resultSummary,
  missingCounts,
  setResultOpen,
}: BulkUploadMetaPanelsProps) {
  return (
    <>
      {readMeta &&
        (readMeta.totalRows !== readMeta.parsedRows ||
          readMeta.emptyRows.length > 0 ||
          readMeta.missingNoPoRows.length > 0 ||
          readMeta.missingCompanyRows.length > 0) && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-amber-800 font-semibold">
                Validasi pembacaan Excel
              </div>
              <button
                type="button"
                onClick={() => setShowReadMeta((v) => !v)}
                className="px-2 py-1 rounded-md border border-amber-200 bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold"
              >
                {showReadMeta ? "Sembunyikan" : "Lihat Detail"}
              </button>
            </div>
            <div className="mt-2 text-xs text-amber-800/80">
              Total item rows terdeteksi:{" "}
              <span className="font-bold">{readMeta.totalRows}</span> • Terbaca
              jadi item records:{" "}
              <span className="font-bold">{readMeta.parsedRows}</span>
            </div>
            <div className="mt-1 text-xs text-amber-800/80">
              Row kosong (ke-skip):{" "}
              <span className="font-bold">{readMeta.emptyRows.length}</span> •
              Row Nomor PO kosong:{" "}
              <span className="font-bold">
                {readMeta.missingNoPoRows.length}
              </span>{" "}
              • Row Company kosong:{" "}
              <span className="font-bold">
                {readMeta.missingCompanyRows.length}
              </span>
            </div>
            {showReadMeta && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {readMeta.emptyRows.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-amber-900 mb-1">
                      Row kosong (ke-skip)
                    </div>
                    <div className="max-h-28 overflow-y-auto border border-amber-100 rounded-md bg-white p-2 text-amber-900/80">
                      {readMeta.emptyRows.slice(0, 300).join(", ")}
                      {readMeta.emptyRows.length > 300 && " ..."}
                    </div>
                  </div>
                )}
                {readMeta.missingNoPoRows.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-amber-900 mb-1">
                      Row berisi tapi Nomor PO kosong (akan di-skip saat upload)
                    </div>
                    <div className="max-h-28 overflow-y-auto border border-amber-100 rounded-md bg-white p-2 text-amber-900/80">
                      {readMeta.missingNoPoRows.slice(0, 300).join(", ")}
                      {readMeta.missingNoPoRows.length > 300 && " ..."}
                    </div>
                  </div>
                )}
                {readMeta.missingCompanyRows.length > 0 && (
                  <div className="text-xs">
                    <div className="font-semibold text-amber-900 mb-1">
                      Row berisi tapi Company kosong (akan error di server)
                    </div>
                    <div className="max-h-28 overflow-y-auto border border-amber-100 rounded-md bg-white p-2 text-amber-900/80">
                      {readMeta.missingCompanyRows.slice(0, 300).join(", ")}
                      {readMeta.missingCompanyRows.length > 300 && " ..."}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {previewDataLength > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm">
          <div className="text-slate-700 font-semibold">Ringkasan record</div>
          <div className="mt-2 text-xs text-slate-600">
            Total item rows:{" "}
            <span className="font-bold">{previewDataLength}</span>
            {readMeta &&
              readMeta.totalRows !== previewDataLength &&
              ` (di sheet: ${readMeta.totalRows})`}{" "}
            • Total PO unik:{" "}
            <span className="font-bold">{uniquePoNosLength}</span> • Akan
            diproses:{" "}
            <span className="font-bold">{plannedPoCountPreview}</span> PO{" "}
            {replaceDupes ? "(Replace ON)" : "(Skip duplikat)"}
          </div>
        </div>
      )}

      {previewDataLength > 0 && duplicateNos.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
          <div className="flex items-center justify-between">
            <div className="text-blue-700 font-semibold">
              Deteksi Duplikat: {duplicateNos.length} nomor PO sudah ada
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDuplicateRows((v) => !v)}
                className="px-2 py-1 rounded-md border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold"
                type="button"
                title="Lihat baris Excel yang terdampak duplikat"
              >
                {showDuplicateRows ? "Sembunyikan Baris" : "Lihat Baris"}
              </button>
              <label className="flex items-center gap-2 text-blue-700">
                <input
                  type="checkbox"
                  checked={replaceDupes}
                  onChange={(e) => {
                    setReplaceTouched(true);
                    setReplaceDupes(e.target.checked);
                  }}
                />
                Replace data duplikat
              </label>
            </div>
          </div>
          <div className="mt-2 text-xs text-blue-700/80">
            Total item rows: {previewDataLength} • Total PO unik:{" "}
            {uniquePoNosLength} • Akan diproses: {plannedPoCountPreview} PO{" "}
            {replaceDupes ? "(Replace ON)" : "(Skip duplikat)"}
          </div>
          {duplicateNos.length > 0 && (
            <div className="mt-2 text-xs text-blue-700/80">
              Contoh: {duplicateNos.slice(0, 5).join(", ")}
              {duplicateNos.length > 5 && " ..."}
            </div>
          )}
          {showDuplicateRows && (
            <div className="mt-3 text-xs text-blue-800">
              <div className="font-semibold mb-1">Baris Excel terdampak:</div>
              <div className="max-h-36 overflow-y-auto border border-blue-100 rounded-md bg-white p-2 space-y-1">
                {Object.entries(duplicateRowMap)
                  .slice(0, 30)
                  .map(([noPo, rows]) => (
                    <div key={noPo} className="flex gap-2">
                      <span className="font-mono font-bold">{noPo}</span>
                      <span className="text-blue-700/80">
                        Row: {rows.slice(0, 25).join(", ")}
                        {rows.length > 25 && " ..."}
                      </span>
                    </div>
                  ))}
                {Object.keys(duplicateRowMap).length > 30 && (
                  <div className="text-blue-700/70 italic">
                    ...dan {Object.keys(duplicateRowMap).length - 30} PO
                    duplikat lainnya
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {previewDataLength > 0 && duplicateNos.length === 0 && (
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm">
          <div className="text-slate-700 font-semibold">
            Validasi: tidak ada duplikat PO di database
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Total item rows: {previewDataLength} • Total PO unik:{" "}
            {uniquePoNosLength} • Akan diproses: {plannedPoCountPreview} PO
          </div>
        </div>
      )}

      {loading && (
        <div className="py-4">
          <LoaderThree label="Reading file" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {errorList.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertCircle size={18} />
            <p>{errorList.length} rows failed to upload:</p>
          </div>
          {failedRows.length > 0 && (
            <div className="text-xs text-amber-800">
              <div className="flex items-center justify-between mb-1">
                <span>
                  Baris gagal:{" "}
                  <span className="font-bold">{failedRows.length}</span>
                </span>
                <button
                  onClick={() => setShowFailedRows((v) => !v)}
                  className="px-2 py-1 rounded-md border border-amber-200 bg-white hover:bg-amber-50"
                >
                  {showFailedRows ? "Sembunyikan" : "Lihat Detail"}
                </button>
              </div>
              {showFailedRows && (
                <div className="max-h-36 overflow-y-auto border border-amber-100 rounded-md bg-white p-2">
                  {failedRows.slice(0, 200).join(", ")}
                  {failedRows.length > 200 && " ..."}
                </div>
              )}
            </div>
          )}
          <ul className="list-disc list-inside text-xs text-amber-800 max-h-40 overflow-y-auto">
            {errorList.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {successCount > 0 && resultSummary && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-700 text-sm">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <div>
            <p>
              Upload selesai: {resultSummary.totalItemRows} item rows diproses •{" "}
              {resultSummary.uploadedItemRows} item rows tersimpan
            </p>
            <p className="text-emerald-700/80 text-xs mt-1">
              PO baru: {resultSummary.addedPoCount} • Duplikat di-skip:{" "}
              {resultSummary.skippedDuplicatePoCount}
              {resultSummary.replacedPoCount > 0
                ? ` • Duplikat di-replace: ${resultSummary.replacedPoCount}`
                : ""}
            </p>
            {missingCounts && (
              <p className="text-emerald-700/80 text-xs mt-1">
                Kolom kosong terdeteksi:{" "}
                {Object.entries(missingCounts)
                  .filter(([_label, count]) => (count as number) > 0)
                  .slice(0, 8)
                  .map(([label, count]) => `${label}: ${count}`)
                  .join(" · ")}
                {Object.entries(missingCounts).filter(
                  ([_label, count]) => (count as number) > 0,
                ).length > 8 && " · ..."}
              </p>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setResultOpen(true)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50"
              >
                Lihat Ringkasan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
