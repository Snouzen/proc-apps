"use client";

import { useMemo, useRef, useState } from "react";
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
  const [poPlannedTotal, setPoPlannedTotal] = useState<number>(0);
  const [poDone, setPoDone] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [failedRows, setFailedRows] = useState<number[]>([]);
  const [showFailedRows, setShowFailedRows] = useState<boolean>(false);
  const [showDuplicateRows, setShowDuplicateRows] = useState<boolean>(false);
  const [missingCounts, setMissingCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [duplicateNos, setDuplicateNos] = useState<string[]>([]);
  const [duplicateRowMap, setDuplicateRowMap] = useState<
    Record<string, number[]>
  >({});
  const [replaceDupes, setReplaceDupes] = useState<boolean>(false);
  const [replaceTouched, setReplaceTouched] = useState<boolean>(false);
  const [readMeta, setReadMeta] = useState<{
    totalRows: number;
    parsedRows: number;
    emptyRows: number[];
    missingNoPoRows: number[];
    missingCompanyRows: number[];
  } | null>(null);
  const [showReadMeta, setShowReadMeta] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    uniquePoCount: number;
    plannedPoCount: number;
    addedPoCount: number;
    replacedPoCount: number;
    skippedDuplicatePoCount: number;
    addedPOs: string[];
    skippedDuplicatePOs: string[];
    replacedPOs: string[];
    uploadedItemRows: number;
    totalItemRows: number;
    errors: string[];
    listTruncated?: boolean;
    debugSamples?: Array<{
      noPo: string;
      tglPoRawType: string;
      tglPoRaw: any;
      tglPoParsed: string | null;
      expiredRawType: string;
      expiredRaw: any;
      expiredParsed: string | null;
    }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMeta, setProgressMeta] = useState<{
    batchIndex: number;
    batchTotal: number;
    poDone: number;
    poTotal: number;
  } | null>(null);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [headerKeys, setHeaderKeys] = useState<{
    noPo: string | null;
    company: string | null;
    inisial: string | null;
    product: string | null;
    total: string | null;
    tglPo: string | null;
    expiredTgl: string | null;
  }>({
    noPo: null,
    company: null,
    inisial: null,
    product: null,
    total: null,
    tglPo: null,
    expiredTgl: null,
  });

  const uniquePoNos = useMemo(() => {
    const key = headerKeys.noPo;
    if (!key) return [];
    const set = new Set<string>();
    for (const row of previewData) {
      const v = String(getCell(row, key)).trim();
      if (v) set.add(v);
    }
    return Array.from(set);
  }, [previewData, headerKeys.noPo]);

  const plannedPoCountPreview = useMemo(() => {
    const unique = uniquePoNos.length;
    if (replaceDupes) return unique;
    return Math.max(unique - duplicateNos.length, 0);
  }, [uniquePoNos.length, duplicateNos.length, replaceDupes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setErrorList([]);
    setResultOpen(false);
    setResultSummary(null);
    setReadMeta(null);
    setShowReadMeta(false);
    setLoading(true);

    try {
      const res = await readExcel(selectedFile);
      const data = Array.isArray(res) ? res : res.data;
      if (!Array.isArray(res)) setReadMeta(res.meta);
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
      const tglPoKey = findColumnKey(first, [
        "Tanggal PO",
        "TGL PO",
        "TanggalPO",
      ]);
      const expiredKey = findColumnKey(first, [
        "Tanggal Expired PO",
        "TGL EXP",
        "Expired PO",
      ]);
      setHeaderKeys({
        noPo: noPoKey,
        company: companyKey,
        inisial: inisialKey,
        product: productKey,
        total: totalKey,
        tglPo: tglPoKey,
        expiredTgl: expiredKey,
      });
      await validateDuplicates(data);
    } catch (err: any) {
      setError(err.message || "Failed to read file");
      setFile(null);
      setDuplicateNos([]);
      setReadMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const readExcel = (
    file: File,
  ): Promise<
    | any[]
    | {
        data: any[];
        meta: {
          totalRows: number;
          parsedRows: number;
          emptyRows: number[];
          missingNoPoRows: number[];
          missingCompanyRows: number[];
        };
      }
  > => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array", cellDates: false });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: true,
          });

          const allRows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: true,
            defval: "",
          }) as any[][];
          const header = Array.isArray(allRows?.[0]) ? allRows[0] : [];
          const normalizeHeader = (s: any) =>
            String(s ?? "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
          const findHeaderIndex = (aliases: string[]) => {
            const targets = aliases.map(normalizeHeader);
            for (let i = 0; i < header.length; i++) {
              if (targets.includes(normalizeHeader(header[i]))) return i;
            }
            return -1;
          };
          const idxNoPo = findHeaderIndex([
            "Nomor PO",
            "No PO",
            "NO PO",
            "NOPO",
          ]);
          const idxCompany = findHeaderIndex([
            "Nama Company",
            "Nama PT",
            "Company",
          ]);
          const emptyRows: number[] = [];
          const missingNoPoRows: number[] = [];
          const missingCompanyRows: number[] = [];
          for (let i = 1; i < allRows.length; i++) {
            const row = Array.isArray(allRows[i]) ? allRows[i] : [];
            const rowNum = i + 1;
            const hasAny = row.some((c) => String(c ?? "").trim() !== "");
            if (!hasAny) {
              emptyRows.push(rowNum);
              continue;
            }
            if (idxNoPo >= 0) {
              const v = String(row[idxNoPo] ?? "").trim();
              if (!v) missingNoPoRows.push(rowNum);
            }
            if (idxCompany >= 0) {
              const v = String(row[idxCompany] ?? "").trim();
              if (!v) missingCompanyRows.push(rowNum);
            }
          }

          resolve({
            data: jsonData as any[],
            meta: {
              totalRows: Math.max(allRows.length - 1, 0),
              parsedRows: (jsonData as any[]).length,
              emptyRows,
              missingNoPoRows,
              missingCompanyRows,
            },
          });
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
  function getCell(row: any, key: string | null) {
    if (!key) return "";
    const v = row?.[key];
    return typeof v === "string" ? v.trim() : String(v ?? "").trim();
  }

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
      if (!replaceTouched) {
        setReplaceDupes(dupes.length > 0);
      }
      const dupeSet = new Set(dupes);
      const map: Record<string, number[]> = {};
      for (let i = 0; i < rows.length; i++) {
        const noPo = String(getCell(rows[i], noPoKey)).trim();
        if (!noPo || !dupeSet.has(noPo)) continue;
        const excelRow = i + 2;
        (map[noPo] ??= []).push(excelRow);
      }
      setDuplicateRowMap(map);
    } catch {
      setDuplicateNos([]);
      setDuplicateRowMap({});
    }
  };

  const handleUpload = async () => {
    if (!previewData.length) return;

    setUploading(true);
    setProgressOpen(true);
    cancelRef.current = false;
    setError(null);
    setErrorList([]);
    setSuccessCount(0);
    setPoDone(0);
    setResultOpen(false);
    setResultSummary(null);

    try {
      // Hitung target total PO yang akan diproses (bukan item rows)
      const uniqueNos = Array.from(
        new Set(
          previewData
            .map((row) => String(getCell(row, headerKeys.noPo)).trim())
            .filter((s) => !!s),
        ),
      );
      const planned =
        replaceDupes === true
          ? uniqueNos.length
          : Math.max(uniqueNos.length - duplicateNos.length, 0);
      setPoPlannedTotal(planned);

      const CHUNK = previewData.length > 5000 ? 80 : 400;
      const batchTotal = Math.max(1, Math.ceil(previewData.length / CHUNK));
      let totalSuccess = 0;
      const aggregateMissing: Record<string, number> = {};
      const skippedDuplicatePOs: string[] = [];
      let skippedDuplicatePoCount = 0;
      const addedPOs: string[] = [];
      const replacedPOs: string[] = [];
      const debugAgg: Array<{
        noPo: string;
        tglPoRawType: string;
        tglPoRaw: any;
        tglPoParsed: string | null;
        expiredRawType: string;
        expiredRaw: any;
        expiredParsed: string | null;
      }> = [];
      let addedPoCount = 0;
      let replacedPoCount = 0;
      let poDoneLocal = 0;
      const allErrors: string[] = [];
      const failedSet = new Set<number>();
      let listDupeTruncated = false;
      let listAddedTruncated = false;
      let listReplacedTruncated = false;
      let listErrorsTruncated = false;

      setProgressMeta({
        batchIndex: 0,
        batchTotal,
        poDone: 0,
        poTotal: planned,
      });

      for (let i = 0; i < batchTotal; i++) {
        if (cancelRef.current) {
          allErrors.push("Upload dibatalkan.");
          break;
        }
        const toYMDJakarta = (d: Date) => {
          const tzOffsetHours = 7;
          const shifted = new Date(d.getTime() + tzOffsetHours * 3600 * 1000);
          const y = shifted.getUTCFullYear();
          const m = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
          const day = `${shifted.getUTCDate()}`.padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        const parseGuessToDate = (v: unknown): Date | null => {
          if (v === null || v === undefined) return null;
          if (v instanceof Date && !isNaN(v.getTime())) return v;
          if (typeof v === "number" && Number.isFinite(v)) {
            const days = Math.floor(v);
            const utc = new Date((days - 25569) * 86400 * 1000);
            if (!isNaN(utc.getTime())) return utc;
          }
          if (typeof v === "string") {
            const s = v.trim();
            if (/^\d{4}-\d{2}-\d{2}T/i.test(s)) {
              const d = new Date(s);
              if (!isNaN(d.getTime())) return d;
            }
            const token = s.split(/\s+/)[0];
            const ymd = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (ymd) {
              const y = Number(ymd[1]);
              const mo = Number(ymd[2]) - 1;
              const da = Number(ymd[3]);
              if (
                Number.isFinite(y) &&
                Number.isFinite(mo) &&
                Number.isFinite(da)
              ) {
                return new Date(Date.UTC(y, mo, da, 12, 0, 0, 0));
              }
            }
            const dMonY =
              token.match(
                /^(\d{1,2})[\/\-\s]([A-Za-z]{3,}\.?)([\/\-\s])(\d{2,4})$/,
              ) ||
              token.match(/^(\d{1,2})[\-\s]([A-Za-z]{3,}\.?)[\-\s](\d{2,4})$/);
            if (dMonY) {
              const da = Number(dMonY[1]);
              const monRaw = String(dMonY[2] || "")
                .toLowerCase()
                .replace(/[^a-z]/g, "");
              const yRaw = Number(dMonY[dMonY.length - 1]);
              const y = yRaw < 100 ? 2000 + yRaw : yRaw;
              const monMap: Record<string, number> = {
                jan: 0,
                january: 0,
                januari: 0,
                feb: 1,
                february: 1,
                februari: 1,
                mar: 2,
                march: 2,
                maret: 2,
                apr: 3,
                april: 3,
                may: 4,
                mei: 4,
                jun: 5,
                june: 5,
                juni: 5,
                jul: 6,
                july: 6,
                juli: 6,
                aug: 7,
                august: 7,
                agustus: 7,
                sep: 8,
                sept: 8,
                september: 8,
                oct: 9,
                october: 9,
                oktober: 9,
                nov: 10,
                november: 10,
                dec: 11,
                december: 11,
                desember: 11,
              };
              const mo = monMap[monRaw];
              if (
                Number.isFinite(y) &&
                Number.isFinite(mo) &&
                Number.isFinite(da)
              ) {
                return new Date(
                  Date.UTC(y as number, mo as number, da, 12, 0, 0, 0),
                );
              }
            }
            const d = new Date(s);
            if (!isNaN(d.getTime())) return d;
          }
          return null;
        };
        const normalizeBatch = (rows: any[]) => {
          const kTglPo = headerKeys.tglPo;
          const kExp = headerKeys.expiredTgl;
          if (!kTglPo && !kExp) return rows;
          return rows.map((r) => {
            if (!r || typeof r !== "object") return r;
            const next: any = { ...r };
            if (kTglPo) {
              const d = parseGuessToDate(next[kTglPo]);
              if (d) next[kTglPo] = toYMDJakarta(d);
            }
            if (kExp) {
              const d = parseGuessToDate(next[kExp]);
              if (d) next[kExp] = toYMDJakarta(d);
            }
            return next;
          });
        };
        const batch = normalizeBatch(
          previewData.slice(i * CHUNK, (i + 1) * CHUNK),
        );
        const batchLabel =
          planned > 0
            ? `Uploading PO ${poDoneLocal}/${planned} • Batch ${i + 1}/${batchTotal}`
            : `Batch ${i + 1}/${batchTotal}`;
        setUploadProgress(batchLabel);
        setProgressMeta({
          batchIndex: i + 1,
          batchTotal,
          poDone: poDoneLocal,
          poTotal: planned,
        });
        await new Promise((r) => setTimeout(r, 0));
        const controller = new AbortController();
        abortRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 menit per kloter
        try {
          let res: Response;
          let result: any;
          try {
            res = await fetch("/api/po/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: batch,
                replaceDuplicates: replaceDupes,
              }),
              signal: controller.signal,
            });
            result = await res.json();
          } finally {
            clearTimeout(timeoutId);
          }
          if (!res.ok) {
            throw new Error(result?.error || `Batch ${i + 1} failed`);
          }
          totalSuccess += Number(result?.count || 0);
          addedPoCount += Number(result?.addedPoCount || 0);
          replacedPoCount += Number(result?.replacedPoCount || 0);
          skippedDuplicatePoCount += Number(result?.duplicatePoCount || 0);
          // Update progress PO done per batch
          const poProgressIncrement =
            replaceDupes === true
              ? Number(result?.addedPoCount || 0) +
                Number(result?.replacedPoCount || 0)
              : Number(result?.addedPoCount || 0);
          poDoneLocal = poDoneLocal + poProgressIncrement;
          setPoDone(poDoneLocal);
          setUploadProgress(
            planned > 0
              ? `Uploading PO ${Math.min(poDoneLocal, planned)}/${planned} • Batch ${i + 1}/${batchTotal}`
              : `Batch ${i + 1}/${batchTotal}`,
          );
          setProgressMeta({
            batchIndex: i + 1,
            batchTotal,
            poDone: poDoneLocal,
            poTotal: planned,
          });
          if (Array.isArray(result?.errors)) {
            for (const e of result.errors as string[]) {
              allErrors.push(`Batch ${i + 1}: ${e}`);
              const m = e.match(/Row\s*~?(\d+)/i);
              if (m && m[1]) {
                const n = Number(m[1]);
                if (Number.isFinite(n)) failedSet.add(n);
              }
            }
          }
          if (result?.errorsTruncated) {
            listErrorsTruncated = true;
            allErrors.push(
              `Batch ${i + 1}: daftar error dipotong (terlalu banyak).`,
            );
          }
          if (Array.isArray(result?.duplicatePOs)) {
            skippedDuplicatePOs.push(...result.duplicatePOs.map(String));
          }
          if (Array.isArray(result?.addedPOs)) {
            addedPOs.push(...result.addedPOs.map(String));
          }
          if (Array.isArray(result?.replacedPOs)) {
            replacedPOs.push(...result.replacedPOs.map(String));
          }
          if (Array.isArray(result?.debugSamples)) {
            for (const s of result.debugSamples as any[]) {
              if (!s || typeof s !== "object") continue;
              const noPo = String((s as any).noPo || "");
              if (!noPo) continue;
              if (debugAgg.some((x) => x.noPo === noPo)) continue;
              debugAgg.push(s as any);
              if (debugAgg.length >= 5) break;
            }
          }
          if (result?.duplicatePOsTruncated) listDupeTruncated = true;
          if (result?.addedPOsTruncated) listAddedTruncated = true;
          if (result?.replacedPOsTruncated) listReplacedTruncated = true;
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
        } finally {
          abortRef.current = null;
        }
      }

      setSuccessCount(totalSuccess);
      setMissingCounts(aggregateMissing);
      setErrorList(allErrors);
      setFailedRows(Array.from(failedSet).sort((a, b) => a - b));
      setUploadProgress(null);
      setProgressOpen(false);
      setProgressMeta(null);

      if (onSuccess) onSuccess();
      router.refresh();

      const dedupe = (list: string[]) => Array.from(new Set(list));
      const summary = {
        uniquePoCount: uniqueNos.length,
        plannedPoCount: planned,
        addedPoCount,
        replacedPoCount,
        skippedDuplicatePoCount,
        addedPOs: dedupe(addedPOs),
        skippedDuplicatePOs: dedupe(skippedDuplicatePOs),
        replacedPOs: dedupe(replacedPOs),
        uploadedItemRows: totalSuccess,
        totalItemRows: previewData.length,
        errors: allErrors,
        debugSamples: debugAgg.slice(0, 5),
        listTruncated:
          listDupeTruncated ||
          listAddedTruncated ||
          listReplacedTruncated ||
          listErrorsTruncated,
      };
      setResultSummary(summary);
      setResultOpen(true);
      setUploading(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong during upload");
      setUploading(false);
      setUploadProgress(null);
      setProgressOpen(false);
      setProgressMeta(null);
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
    setDuplicateRowMap({});
    setReplaceDupes(false);
    setReplaceTouched(false);
    setShowDuplicateRows(false);
    setReadMeta(null);
    setShowReadMeta(false);
    setResultOpen(false);
    setResultSummary(null);
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
                  <span className="font-bold">{readMeta.totalRows}</span> •
                  Terbaca jadi item records:{" "}
                  <span className="font-bold">{readMeta.parsedRows}</span>
                </div>
                <div className="mt-1 text-xs text-amber-800/80">
                  Row kosong (ke-skip):{" "}
                  <span className="font-bold">{readMeta.emptyRows.length}</span>{" "}
                  • Row Nomor PO kosong:{" "}
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
                          Row berisi tapi Nomor PO kosong (akan di-skip saat
                          upload)
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

          {previewData.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <div className="text-slate-700 font-semibold">
                Ringkasan record
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Total item rows:{" "}
                <span className="font-bold">{previewData.length}</span>
                {readMeta &&
                  readMeta.totalRows !== previewData.length &&
                  ` (di sheet: ${readMeta.totalRows})`}{" "}
                • Total PO unik:{" "}
                <span className="font-bold">{uniquePoNos.length}</span> • Akan
                diproses:{" "}
                <span className="font-bold">{plannedPoCountPreview}</span> PO{" "}
                {replaceDupes ? "(Replace ON)" : "(Skip duplikat)"}
              </div>
            </div>
          )}

          {previewData.length > 0 && duplicateNos.length > 0 && (
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
                Total item rows: {previewData.length} • Total PO unik:{" "}
                {uniquePoNos.length} • Akan diproses: {plannedPoCountPreview} PO{" "}
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
                  <div className="font-semibold mb-1">
                    Baris Excel terdampak:
                  </div>
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
          {previewData.length > 0 && duplicateNos.length === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <div className="text-slate-700 font-semibold">
                Validasi: tidak ada duplikat PO di database
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Total item rows: {previewData.length} • Total PO unik:{" "}
                {uniquePoNos.length} • Akan diproses: {plannedPoCountPreview} PO
              </div>
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
                  Upload selesai: {resultSummary.totalItemRows} item rows
                  diproses • {resultSummary.uploadedItemRows} item rows
                  tersimpan
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
                      ? `${uploadProgress} (Remaining: ${Math.max(
                          poPlannedTotal - poDone,
                          0,
                        )})`
                      : poPlannedTotal > 0
                        ? `Uploading PO ${poDone}/${poPlannedTotal} (Remaining: ${Math.max(
                            poPlannedTotal - poDone,
                            0,
                          )})`
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
      {resultOpen && resultSummary && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Ringkasan Bulk Upload
              </h3>
              <button
                type="button"
                onClick={() => setResultOpen(false)}
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
                  <div className="text-xs text-blue-700/80">
                    Duplikat di-skip
                  </div>
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
                            <tr
                              key={s.noPo}
                              className="border-t border-slate-100"
                            >
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
                  onClick={() => setResultOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResultOpen(false);
                    reset();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {progressOpen && uploading && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Upload Bulk PO
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {progressMeta
                      ? `Batch ${progressMeta.batchIndex}/${progressMeta.batchTotal} • ${Math.max(
                          progressMeta.batchTotal - progressMeta.batchIndex,
                          0,
                        )} batch remaining`
                      : "Menyiapkan batch..."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelRef.current = true;
                    abortRef.current?.abort();
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">Progress</span>
                  <span className="text-slate-500">
                    {progressMeta && progressMeta.poTotal > 0
                      ? `${progressMeta.poDone}/${progressMeta.poTotal} uploaded`
                      : progressMeta
                        ? `${progressMeta.batchIndex}/${progressMeta.batchTotal} batch`
                        : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-900"
                    style={{
                      width: (() => {
                        if (!progressMeta) return "0%";
                        if (progressMeta.poTotal > 0) {
                          const pct = Math.max(
                            0,
                            Math.min(
                              100,
                              Math.round(
                                (progressMeta.poDone / progressMeta.poTotal) *
                                  100,
                              ),
                            ),
                          );
                          return `${pct}%`;
                        }
                        const pct = Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(
                              (progressMeta.batchIndex /
                                Math.max(progressMeta.batchTotal, 1)) *
                                100,
                            ),
                          ),
                        );
                        return `${pct}%`;
                      })(),
                    }}
                  />
                </div>
                {progressMeta && progressMeta.poTotal > 0 && (
                  <div className="text-xs text-slate-600">
                    {Math.max(progressMeta.poTotal - progressMeta.poDone, 0)} of{" "}
                    {progressMeta.poTotal} remaining
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {uploadProgress || "Sedang memproses..."}
              </div>
            </div>
          </div>
        </div>
      )}
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
