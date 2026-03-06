"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { LoaderThree } from "@/components/ui/loader";
import * as XLSX from "xlsx";
import Modal from "./modal";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BulkUploadModal({ open, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [missingCounts, setMissingCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [duplicateNos, setDuplicateNos] = useState<string[]>([]);
  const [replaceDupes, setReplaceDupes] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [headerKeys, setHeaderKeys] = useState<{
    noPo: string | null;
    company: string | null;
    inisial: string | null;
    product: string | null;
    total: string | null;
  }>({ noPo: null, company: null, inisial: null, product: null, total: null });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setErrorList([]);
    setLoading(true);

    try {
      const data = await readExcel(selectedFile);
      setPreviewData(data);
      const first = data[0] || {};
      const noPoKey = findColumnKey(first, [
        "Nomor PO",
        "No PO",
        "NO PO",
        "NOPO",
      ]);
      const companyKey = findColumnKey(first, [
        "Nama Company",
        "Nama PT",
        "Company",
      ]);
      const inisialKey = findColumnKey(first, ["Inisial", "Initial"]);
      const productKey = findColumnKey(first, [
        "Nama Produk",
        "Produk",
        "Product",
      ]);
      const totalKey = findColumnKey(first, ["rp tagih", "RP TAGIH", "Total"]);
      setHeaderKeys({
        noPo: noPoKey,
        company: companyKey,
        inisial: inisialKey,
        product: productKey,
        total: totalKey,
      });
      await validateDuplicates(data);
    } catch (err: any) {
      setError(err.message || "Failed to read file");
      setFile(null);
      setDuplicateNos([]);
    } finally {
      setLoading(false);
    }
  };

  const readExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const norm = (s: string) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const findColumnKey = (row: any, aliases: string[]): string | null => {
    if (!row || typeof row !== "object") return null;
    const targets = aliases.map(norm);
    for (const k of Object.keys(row)) {
      if (targets.includes(norm(k))) return k;
    }
    return null;
  };
  const getCell = (row: any, key: string | null) =>
    key
      ? typeof row?.[key] === "string"
        ? row[key].trim()
        : String(row?.[key] ?? "").trim()
      : "";

  const validateDuplicates = async (rows: any[]) => {
    try {
      const first = rows[0] || {};
      const noPoKey =
        findColumnKey(first, ["Nomor PO", "No PO", "NO PO", "NOPO"]) ||
        headerKeys.noPo;
      const nos = Array.from(
        new Set(
          rows
            .map((r) => String(getCell(r, noPoKey)).trim())
            .filter((s) => !!s),
        ),
      );
      if (nos.length === 0) {
        setDuplicateNos([]);
        return;
      }
      // Batch request to avoid huge headers (431) and large payloads
      const CHUNK = 500;
      const chunk = <T,>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const batches = chunk(nos, CHUNK);
      const found = new Set<string>();
      for (let i = 0; i < batches.length; i++) {
        try {
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), 120000);
          const res = await fetch("/api/po/check-dupes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noPoList: batches[i] }),
            signal: controller.signal,
          });
          clearTimeout(to);
          if (!res.ok) continue;
          const data = await res.json();
          const exists: string[] = Array.isArray(data?.exists)
            ? data.exists
            : [];
          exists.forEach((n) => found.add(String(n)));
        } catch {
          // continue best-effort
        }
      }
      const dupes = nos.filter((n) => found.has(n));
      setDuplicateNos(dupes);
    } catch {
      setDuplicateNos([]);
    }
  };

  const handleUpload = async () => {
    if (!previewData.length) return;

    setUploading(true);
    setError(null);
    setErrorList([]);
    setSuccessCount(0);

    try {
      // Chunk large payloads to prevent server overload/timeouts
      const CHUNK = 800; // item-rows per request
      const chunk = <T,>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size),
        );
      const batches = chunk(previewData, CHUNK);
      let totalSuccess = 0;
      let aggregateMissing: Record<string, number> = {};
      let aggregateDuplicates: string[] = [];
      let addedPoCount = 0;
      let replacedPoCount = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        setUploadProgress(`Batch ${i + 1}/${batches.length}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 menit per kloter
        try {
          const res = await fetch("/api/po/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: batches[i],
              replaceDuplicates: replaceDupes,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result?.error || `Batch ${i + 1} failed`);
          }
          totalSuccess += Number(result?.count || 0);
          addedPoCount += Number(result?.addedPoCount || 0);
          replacedPoCount += Number(result?.replacedPoCount || 0);
          if (Array.isArray(result?.errors)) {
            allErrors.push(
              ...result.errors.map((e: string) => `Batch ${i + 1}: ${e}`),
            );
          }
          if (Array.isArray(result?.duplicatePOs)) {
            aggregateDuplicates.push(...result.duplicatePOs.map(String));
          }
          if (result?.missingCounts) {
            for (const [k, v] of Object.entries(result.missingCounts)) {
              aggregateMissing[k] = (aggregateMissing[k] || 0) + Number(v || 0);
            }
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          const msg =
            err?.name === "AbortError"
              ? `Batch ${i + 1} timeout / koneksi terputus`
              : `Batch ${i + 1} gagal: ${err?.message || "unknown error"}`;
          allErrors.push(msg);
        }
      }

      setSuccessCount(totalSuccess);
      (window as any).__bulk_addedPoCount__ = addedPoCount;
      (window as any).__bulk_duplicates__ = aggregateDuplicates;
      (window as any).__bulk_replacedPoCount__ = replacedPoCount;
      setMissingCounts(aggregateMissing);
      setErrorList(allErrors);
      setUploadProgress(null);

      if (onSuccess) onSuccess();

      // Selesai: tutup modal bila tanpa error; jika ada error, tetap tampilkan ringkasan
      if (allErrors.length === 0) {
        setTimeout(() => {
          setFile(null);
          setPreviewData([]);
          setDuplicateNos([]);
          setReplaceDupes(false);
          setUploading(false);
          onClose();
          router.refresh();
        }, 1000);
      } else {
        setUploading(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong during upload");
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const startUpload = async () => {
    if (!previewData.length) return;
    if (duplicateNos.length > 0 && !uploading) {
      setShowConfirm(true);
      return;
    }
    await handleUpload();
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setError(null);
    setErrorList([]);
    setDuplicateNos([]);
    setReplaceDupes(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Bulk Upload PO"
        className="max-w-xl"
      >
        <div className="space-y-4">
          {/* Upload Area */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="p-3 bg-slate-50 rounded-full mb-3 group-hover:bg-white transition-colors">
                <Upload
                  size={24}
                  className="text-slate-400 group-hover:text-blue-500"
                />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">
                Click to upload or drag and drop
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Excel files only (.xlsx, .xls)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {previewData.length > 0 && duplicateNos.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <div className="flex items-center justify-between">
                <div className="text-blue-700 font-semibold">
                  Deteksi Duplikat: {duplicateNos.length} nomor PO sudah ada
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-blue-700">
                    <input
                      type="checkbox"
                      checked={replaceDupes}
                      onChange={(e) => setReplaceDupes(e.target.checked)}
                    />
                    Replace data duplikat
                  </label>
                </div>
              </div>
              {duplicateNos.length > 0 && (
                <div className="mt-2 text-xs text-blue-700/80">
                  Contoh: {duplicateNos.slice(0, 5).join(", ")}
                  {duplicateNos.length > 5 && " ..."}
                </div>
              )}
            </div>
          )}

          {/* Status Messages */}
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
              <ul className="list-disc list-inside text-xs text-amber-800 max-h-40 overflow-y-auto">
                {errorList.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {successCount > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-700 text-sm">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <div>
                <p>
                  Successfully uploaded {successCount} item rows
                  {typeof (window as any).__bulk_addedPoCount__ === "number"
                    ? ` (PO baru: ${(window as any).__bulk_addedPoCount__})`
                    : ""}
                </p>
                {/* Duplicate summary (if set globally by result handler) */}
                {Array.isArray((window as any).__bulk_duplicates__) &&
                  (window as any).__bulk_duplicates__.length > 0 && (
                    <p className="text-emerald-700/80 text-xs mt-1">
                      Duplikat di-skip:{" "}
                      {(window as any).__bulk_duplicates__.length}
                      {": "}
                      {(window as any).__bulk_duplicates__
                        .slice(0, 5)
                        .join(", ")}
                      {(window as any).__bulk_duplicates__.length > 5 && " ..."}
                    </p>
                  )}
                {typeof (window as any).__bulk_replacedPoCount__ === "number" &&
                  (window as any).__bulk_replacedPoCount__ > 0 && (
                    <p className="text-emerald-700/80 text-xs mt-1">
                      Duplikat di-replace:{" "}
                      {(window as any).__bulk_replacedPoCount__}
                    </p>
                  )}
                {missingCounts && (
                  <p className="text-emerald-700/80 text-xs mt-1">
                    Kolom kosong terdeteksi:{" "}
                    {Object.entries(missingCounts)
                      .filter(([_, c]) => (c as number) > 0)
                      .slice(0, 8)
                      .map(([k, c]) => `${k}: ${c}`)
                      .join(" · ")}
                    {Object.entries(missingCounts).filter(
                      ([_, c]) => (c as number) > 0,
                    ).length > 8 && " · ..."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Summary */}
          {previewData.length > 0 && !uploading && !successCount && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  Preview Data
                </span>
                <span className="text-slate-500">
                  {previewData.length} records found
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium text-slate-500">No PO</th>
                      <th className="p-2 font-medium text-slate-500">
                        Company
                      </th>
                      <th className="p-2 font-medium text-slate-500">
                        Inisial
                      </th>
                      <th className="p-2 font-medium text-slate-500">
                        Product
                      </th>
                      <th className="p-2 font-medium text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-slate-700">
                          {getCell(row, headerKeys.noPo)}
                        </td>
                        <td className="p-2 text-slate-700 truncate max-w-[100px]">
                          {getCell(row, headerKeys.company)}
                        </td>
                        <td className="p-2 text-slate-700 truncate max-w-[100px]">
                          {getCell(row, headerKeys.inisial) || "—"}
                        </td>
                        <td className="p-2 text-slate-700 truncate max-w-[100px]">
                          {getCell(row, headerKeys.product)}
                        </td>
                        <td className="p-2 text-slate-700 font-medium">
                          {(() => {
                            const val = getCell(row, headerKeys.total);
                            const num = Number(val);
                            return isFinite(num) && num > 0
                              ? num.toLocaleString("id-ID")
                              : "-";
                          })()}
                        </td>
                      </tr>
                    ))}
                    {previewData.length > 5 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-2 text-center text-slate-400 italic"
                        >
                          ...and {previewData.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={startUpload}
              disabled={
                !file || loading || uploading || previewData.length === 0
              }
              className="flex-1 py-2.5 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 active:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <LoaderThree
                  label={
                    uploadProgress
                      ? `Processing ${uploadProgress}`
                      : "Processing..."
                  }
                />
              ) : (
                "Upload Data"
              )}
            </button>
          </div>
        </div>
      </Modal>
      {showConfirm && !uploading && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
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
                  onClick={async () => {
                    setReplaceDupes(true);
                    setShowConfirm(false);
                    await handleUpload();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                >
                  Replace Duplikat
                </button>
                <button
                  onClick={async () => {
                    setReplaceDupes(false);
                    setShowConfirm(false);
                    await handleUpload();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                >
                  Skip Duplikat
                </button>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
