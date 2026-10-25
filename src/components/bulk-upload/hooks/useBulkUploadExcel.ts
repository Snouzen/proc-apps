"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReadMeta,
  ResultSummary,
  ProgressMeta,
  HeaderKeys,
} from "../types";
import { parseExcelNumber } from "@/lib/excel";

const getXLSX = () => import("xlsx");

export function useBulkUploadExcel(onSuccess?: () => void) {
  const router = useRouter();
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
  const [readMeta, setReadMeta] = useState<ReadMeta | null>(null);
  const [showReadMeta, setShowReadMeta] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultSummary, setResultSummary] = useState<ResultSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMeta, setProgressMeta] = useState<ProgressMeta | null>(null);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [headerKeys, setHeaderKeys] = useState<HeaderKeys>({
    noPo: null,
    company: null,
    inisial: null,
    product: null,
    total: null,
    tglPo: null,
    expiredTgl: null,
  });

  const getCell = (row: any, key: string | null) => {
    if (!key) return "";
    const v = row?.[key];
    return typeof v === "string" ? v.trim() : String(v ?? "").trim();
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

  const readExcel = (
    fileToRead: File,
  ): Promise<
    | any[]
    | {
        data: any[];
        meta: ReadMeta;
      }
  > => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await getXLSX();
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];

          // Format cells according to expected column types
          if (sheet["!ref"]) {
            const range = XLSX.utils.decode_range(sheet["!ref"]);
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const hAddr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
              const hCell = sheet[hAddr];
              const hText = String(hCell?.w || hCell?.v || "").trim().toLowerCase();
              const numKeywords = ["kg", "pcs", "harga", "discount", "diskon", "nominal", "tagih", "qty", "rupiah", "total", "rp", "subtotal", "jumlah", "berat"];
              const isNumeric = numKeywords.some(k => hText.includes(k));

              const words = hText.split(/[\s_\-\.\/]+/).filter(Boolean);
              const codeWords = new Set(["po", "no", "nomor", "kode", "code", "invoice", "inv", "site", "sitearea", "unit", "area", "cabang", "inisial", "company", "pt", "tujuan", "telepon", "nik", "id", "resi"]);
              const isCodeOrText = !isNumeric && (
                words.some(w => codeWords.has(w)) ||
                ["no po", "nomor po", "no inv", "site area", "unit produksi"].some(p => hText.includes(p))
              );

              for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = sheet[addr];
                if (!cell) continue;
                if (isNumeric) {
                  if (typeof cell.v === "number") {
                    cell.t = "n";
                  } else {
                    const valToParse = (cell.v !== undefined && cell.v !== null && cell.v !== "") ? cell.v : cell.w;
                    const parsedNum = parseExcelNumber(valToParse);
                    if (parsedNum !== null) {
                      cell.t = "n";
                      cell.v = parsedNum;
                    }
                  }
                } else if (isCodeOrText && cell.w !== undefined && cell.w !== null) {
                  // Preserve leading zeros ("001") for identifiers and codes
                  cell.t = "s";
                  cell.v = String(cell.w).trim();
                }
              }
            }
          }

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
      reader.readAsArrayBuffer(fileToRead);
    });
  };

  const validateDuplicates = async (rows: any[], overrideKeys?: HeaderKeys) => {
    try {
      const keys = overrideKeys || headerKeys;
      const first = rows[0] || {};
      const noPoKey =
        findColumnKey(first, ["Nomor PO", "No PO", "NO PO", "NOPO"]) ||
        keys.noPo;
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
      const newKeys: HeaderKeys = {
        noPo: noPoKey,
        company: companyKey,
        inisial: inisialKey,
        product: productKey,
        total: totalKey,
        tglPo: tglPoKey,
        expiredTgl: expiredKey,
      };
      setHeaderKeys(newKeys);
      await validateDuplicates(data, newKeys);
    } catch (err: any) {
      setError(err.message || "Failed to read file");
      setFile(null);
      setDuplicateNos([]);
      setReadMeta(null);
    } finally {
      setLoading(false);
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
        const timeoutId = setTimeout(() => controller.abort(), 300000);
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

  const cancelUpload = () => {
    cancelRef.current = true;
    abortRef.current?.abort();
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

  return {
    file,
    previewData,
    loading,
    uploading,
    uploadProgress,
    poPlannedTotal,
    poDone,
    error,
    successCount,
    errorList,
    failedRows,
    showFailedRows,
    setShowFailedRows,
    showDuplicateRows,
    setShowDuplicateRows,
    missingCounts,
    duplicateNos,
    duplicateRowMap,
    replaceDupes,
    setReplaceDupes,
    setReplaceTouched,
    readMeta,
    showReadMeta,
    setShowReadMeta,
    resultOpen,
    setResultOpen,
    resultSummary,
    fileInputRef,
    showConfirm,
    setShowConfirm,
    progressOpen,
    progressMeta,
    headerKeys,
    uniquePoNos,
    plannedPoCountPreview,
    handleFileChange,
    handleUpload,
    startUpload,
    cancelUpload,
    reset,
    getCell,
  };
}
