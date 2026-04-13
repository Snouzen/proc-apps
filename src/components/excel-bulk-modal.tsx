"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "./modal";
import { LoaderThree } from "@/components/ui/loader";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { saveRitel, saveUnitProduksi, saveProduct } from "@/lib/api";

type Variant = "ritel" | "unit" | "produk" | "retur";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string; // Judul optional
  variant: Variant;
  retailerId?: string; // Khusus retur
};

function normalize(s: string) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function ExcelBulkModal({
  open,
  onClose,
  onSuccess,
  title,
  variant,
  retailerId,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dupeCount, setDupeCount] = useState(0);
  const [replaceDupes, setReplaceDupes] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDupeRows, setShowDupeRows] = useState(false);
  const [dupeGroups, setDupeGroups] = useState<
    Array<{ label: string; rows: number[] }>
  >([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMeta, setProgressMeta] = useState<{
    batchIndex: number;
    batchTotal: number;
    done: number;
    total: number;
  } | null>(null);
  const [progressText, setProgressText] = useState<string>("");
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [keys, setKeys] = useState<Record<string, string | null>>({
    a: null,
    b: null,
    c: null,
    rtvCn: null,
    tanggalRtv: null,
    maxPickup: null,
    kodeToko: null,
    namaCompany: null,
    link: null,
    rpKg: null,
    statusBarang: null,
    refKetStatus: null,
    lokasiBarang: null,
    pembebananReturn: null,
    invoiceRekon: null,
    referensiPembayaran: null,
    tanggalPembayaran: null,
    remarks: null,
    sdiReturn: null
  });

  const readExcel = async (f: File) => {
    const reader = new FileReader();
    return new Promise<any[]>((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, {
            type: "array",
            cellDates: true,
          });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          resolve(json as any[]);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(f);
    });
  };

  const findKey = (obj: any, aliases: string[]) => {
    const normAliases = aliases.map((x) => normalize(x));
    for (const k of Object.keys(obj || {})) {
      if (normAliases.includes(normalize(k))) return k;
    }
    return null;
  };

  const detectKeys = (data: any[]) => {
    const first = data[0] || {};
    let result: Record<string, string | null> = {
      a: null, b: null, c: null,
      rtvCn: null, tanggalRtv: null, maxPickup: null, kodeToko: null, namaCompany: null, link: null,
      rpKg: null, statusBarang: null, refKetStatus: null, lokasiBarang: null, pembebananReturn: null,
      invoiceRekon: null, referensiPembayaran: null, tanggalPembayaran: null, remarks: null, sdiReturn: null
    };

    if (variant === "ritel") {
      result.a = findKey(first, ["nama pt", "nama company", "company", "nama perusahaan", "pt"]);
      result.b = findKey(first, ["tujuan", "destination", "lokasi", "store", "nama toko", "dc"]);
      result.c = findKey(first, ["inisial", "initial"]);
    } else if (variant === "retur") {
      result.rtvCn = findKey(first, ["rtv", "cn", "rtv/cn", "no rtv", "no cn"]);
      result.tanggalRtv = findKey(first, ["tanggal rtv", "tgl rtv", "date rtv"]);
      result.maxPickup = findKey(first, ["max pickup", "tanggal pickup", "pickup"]);
      result.kodeToko = findKey(first, ["kode toko", "id toko", "store code"]);
      result.namaCompany = findKey(first, ["toko", "nama toko", "nama company", "store name"]);
      result.link = findKey(first, ["link", "link result", "url"]);
      result.a = findKey(first, ["produk", "product", "item"]);
      result.b = findKey(first, ["qty retur", "qty", "jumlah retur", "quantity"]);
      result.c = findKey(first, ["nominal", "amount", "total nominal"]);
      result.rpKg = findKey(first, ["rp/kg", "harga/kg", "price group"]);
      result.statusBarang = findKey(first, ["status barang", "status", "kondisi"]);
      result.refKetStatus = findKey(first, ["referensi/ket status", "keterangan status", "remark status"]);
      result.lokasiBarang = findKey(first, ["lokasi barang", "lokasi", "site"]);
      result.pembebananReturn = findKey(first, ["pembebanan retur", "beban", "pembebanan"]);
      result.invoiceRekon = findKey(first, ["invoice rekon", "rekon", "invoice"]);
      result.referensiPembayaran = findKey(first, ["referensi pembayaran", "ref bayar", "no payment"]);
      result.tanggalPembayaran = findKey(first, ["tanggal pembayaran", "tgl bayar", "pay date"]);
      result.remarks = findKey(first, ["remarks", "keterangan", "catatan"]);
      result.sdiReturn = findKey(first, ["sdi retur", "sdi"]);
    } else {
      result.a = findKey(first, ["produk", "product", "nama produk", "nama produk (sku)"]);
      result.b = findKey(first, ["satuan kg", "satuan", "kg/pcs", "kg per pcs", "kg"]);
    }
    return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setShowDupeRows(false);
    setDupeGroups([]);
    setLoading(true);
    try {
      const data = await readExcel(selected);
      if (!data.length) {
        setError("File Excel kosong");
        setRows([]);
        setDupeCount(0);
        return;
      }
      const k = detectKeys(data);
      setKeys(k);
      setRows(data);
    } catch (err: any) {
      setError(err?.message || "Gagal membaca file");
      setRows([]);
      setDupeCount(0);
    } finally {
      setLoading(false);
    }
  };

  const getCell = (row: any, key: string | null) => {
    if (!key) return "";
    const v = row?.[key];
    return typeof v === "string" ? v.trim() : String(v ?? "").trim();
  };

  const computeDupeCount = async () => {
    if (variant === "ritel") {
      const res = await fetch("/api/ritel");
      const list = await res.json();
      const all = Array.isArray(list) ? list : list?.data || [];
      const set = new Set(
        all.map(
          (x: any) =>
            `${normalize(String(x?.namaPt || ""))}|${normalize(
              String(x?.inisial || ""),
            )}|${normalize(String(x?.tujuan || ""))}`,
        ),
      );
      const groups = new Map<string, { label: string; rows: number[] }>();
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const namaPt = getCell(rows[i], keys.a);
        const tujuan = getCell(rows[i], keys.b);
        if (!namaPt || !tujuan) continue;
        const inisial = getCell(rows[i], keys.c);
        const key = `${normalize(namaPt)}|${normalize(inisial)}|${normalize(
          tujuan,
        )}`;
        if (!set.has(key)) continue;
        count += 1;
        const label = `${namaPt} (${inisial || "—"}) • ${tujuan}`;
        const excelRow = i + 2;
        const entry = groups.get(label) ?? { label, rows: [] as number[] };
        entry.rows.push(excelRow);
        groups.set(label, entry);
      }
      setDupeCount(count);
      setDupeGroups(Array.from(groups.values()));
      return;
    }
    if (variant === "unit") {
      const res = await fetch("/api/unit-produksi");
      const list = await res.json();
      const set = new Set(
        (Array.isArray(list) ? list : list?.data || []).map(
          (x: any) =>
            `${normalize(String(x?.namaRegional || ""))}|${normalize(String(x?.siteArea || ""))}`,
        ),
      );
      const count = rows
        .map(
          (r) =>
            `${normalize(getCell(r, keys.a))}|${normalize(getCell(r, keys.b))}`,
        )
        .filter((k) => set.has(k)).length;
      setDupeCount(count);
      return;
    }
    if (variant === "retur") {
       // Untuk retur kita skip dulu de-duplikasi di level ExcelModal
       // Kita biarkan API yang menangani atau user yang memfilter
       setDupeCount(0);
       setDupeGroups([]);
       return;
    }
    const res = await fetch("/api/product");
    const list = await res.json();
    const set = new Set(
      (Array.isArray(list) ? list : list?.data || []).map((x: any) =>
        normalize(String(x?.name || "")),
      ),
    );
    const count = rows
      .map((r) => normalize(getCell(r, keys.a)))
      .filter((k) => set.has(k) && !!k).length;
    setDupeCount(count);
    setDupeGroups([]);
  };

  useEffect(() => {
    if (rows.length) {
      computeDupeCount();
    } else {
      setDupeCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, keys.a, keys.b, keys.c]);

  const startUpload = async () => {
    if (!rows.length) return;
    if (dupeCount > 0 && !uploading) {
      setShowConfirm(true);
      return;
    }
    await handleUpload();
  };

  const handleUpload = async () => {
    if (!rows.length) return;
    setUploading(true);
    setShowConfirm(false);
    setProgressOpen(true);
    setProgressMeta(null);
    setProgressText("");
    cancelRef.current = false;
    try {
      if (variant === "ritel") {
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch("/api/ritel", { signal: controller.signal });
        const list = await res.json();
        const all = Array.isArray(list) ? list : list?.data || [];
        const keyToId = new Map<string, string>();
        for (const x of all) {
          const key = `${normalize(String(x?.namaPt || ""))}|${normalize(
            String(x?.inisial || ""),
          )}|${normalize(String(x?.tujuan || ""))}`;
          if (!keyToId.has(key) && x?.id) keyToId.set(key, String(x.id));
        }

        const records = rows
          .map((r, idx) => {
            const namaPt = getCell(r, keys.a);
            const tujuan = getCell(r, keys.b);
            const inisial = getCell(r, keys.c);
            const key = `${normalize(namaPt)}|${normalize(inisial)}|${normalize(
              tujuan,
            )}`;
            const excelRow = idx + 2;
            return {
              excelRow,
              namaPt,
              tujuan,
              inisial,
              key,
              matchId: keyToId.get(key) || null,
            };
          })
          .filter((x) => !!x.namaPt && !!x.tujuan);

        const toProcess = replaceDupes
          ? records
          : records.filter((x) => !x.matchId);

        const BATCH_SIZE = toProcess.length > 5000 ? 120 : 250;
        const CONCURRENCY = 8;
        const batches = Array.from(
          { length: Math.ceil(toProcess.length / BATCH_SIZE) },
          (_, i) =>
            toProcess.slice(i * BATCH_SIZE, i * BATCH_SIZE + BATCH_SIZE),
        );

        let done = 0;
        setProgressMeta({
          batchIndex: 0,
          batchTotal: batches.length,
          done: 0,
          total: toProcess.length,
        });

        for (let b = 0; b < batches.length; b++) {
          if (cancelRef.current) break;
          setProgressMeta({
            batchIndex: b + 1,
            batchTotal: batches.length,
            done,
            total: toProcess.length,
          });
          setProgressText(
            `Batch ${b + 1}/${batches.length} • ${Math.max(
              batches.length - (b + 1),
              0,
            )} batch remaining`,
          );

          const batch = batches[b];
          for (let start = 0; start < batch.length; start += CONCURRENCY) {
            if (cancelRef.current) break;
            const slice = batch.slice(start, start + CONCURRENCY);
            const settled = await Promise.allSettled(
              slice.map(async (rec) => {
                if (cancelRef.current) return;
                if (replaceDupes && rec.matchId) {
                  try {
                    await fetch(`/api/ritel?id=${encodeURIComponent(rec.matchId)}`, { // REFACTOR: DELETE via query param
                      method: "DELETE",
                      signal: controller.signal,
                    });
                  } catch {}
                }
                await saveRitel(
                  {
                    namaPt: rec.namaPt,
                    inisial: rec.inisial || undefined,
                    tujuan: rec.tujuan,
                  },
                  controller.signal,
                );
              }),
            );
            done += settled.filter((s) => s.status === "fulfilled").length;
            setProgressMeta({
              batchIndex: b + 1,
              batchTotal: batches.length,
              done,
              total: toProcess.length,
            });
            setProgressText(
              `${done}/${toProcess.length} uploaded • ${Math.max(
                toProcess.length - done,
                0,
              )} remaining`,
            );
          }
        }
        abortRef.current = null;
        if (cancelRef.current) {
          throw new Error("Upload dibatalkan");
        }
      } else if (variant === "retur") {
        const toProcess = rows;
        let done = 0;
        setProgressOpen(true);
        setProgressMeta({ batchIndex: 1, batchTotal: 1, done: 0, total: toProcess.length });

        for (const rawRow of toProcess) {
          if (cancelRef.current) break;

          // 1. Normalisasi Keys (Hapus spasi, Uppercase) guna akurasi mapping
          const row: any = {};
          Object.keys(rawRow).forEach((key) => {
            row[key.trim().toUpperCase()] = rawRow[key];
          });

          // 2. Validasi Wajib (Minimal Produk dan Qty)
          if (!row["PRODUK"] || (!row["QTY RETUR"] && !row["QTY"])) {
             done++;
             continue; // Skip baris rusak tapi jangan error satu file
          }

          // 3. Mapping Data dengan Safe Fallback & Injection
          const payload = {
            ritelId: retailerId || null, 
            namaCompany: String(row["TOKO"] || row["NAMA PERUSAHAAN"] || "").trim() || null,
            
            produk: String(row["PRODUK"] || "").trim() || null,
            qtyReturn: row["QTY RETUR"] || row["QTY"] ? Number(row["QTY RETUR"] || row["QTY"]) : 0,
            nominal: row["NOMINAL"] ? Number(row["NOMINAL"]) : 0,
            rpKg: row["RP/KG"] ? Number(row["RP/KG"]) : 0,
            
            rtvCn: row["RTV/CN"] ? String(row["RTV/CN"]) : null,
            tanggalRtv: row["TANGGAL RTV"] ? new Date(row["TANGGAL RTV"]) : null,
            maxPickup: row["MAX PICKUP"] ? new Date(row["MAX PICKUP"]) : null,
            kodeToko: row["KODE TOKO"] ? String(row["KODE TOKO"]) : null,
            
            link: String(row["LINK"] || "").trim() || null,
            statusBarang: String(row["STATUS BARANG"] || "").trim() || "Sudah Diambil",
            refKetStatus: String(row["REFERENSI/KET STATUS"] || "").trim() || null,
            
            // Tangkap dari Excel dan kirim mentah-mentah ke backend (biar backend yang translate ke ID)
            lokasiBarang: row["LOKASI BARANG"] || row["Lokasi Barang"] || row["LOKASI"] || null,
            pembebananReturn: row["PEMBEBANAN RETUR"] || row["Pembebanan Retur"] || row["PEMBEBANAN"] || null,
            
            invoiceRekon: row["INVOICE REKON"] ? Boolean(row["INVOICE REKON"]) : false,
            referensiPembayaran: String(row["REFERENSI PEMBAYARAN"] || "").trim() || null,
            tanggalPembayaran: row["TANGGAL PEMBAYARAN"] ? new Date(row["TANGGAL PEMBAYARAN"]) : null,
            remarks: String(row["REMARKS"] || "").trim() || null,
            sdiReturn: String(row["SDI RETUR"] || "").trim() || null,
          };

          try {
            const res = await fetch("/api/retur", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `HTTP Error ${res.status}`);
            }
          } catch (e: any) {
            console.error(`Row Upload Fail pada baris ke-${done + 2}:`, e);
          }

          done++;
          setProgressMeta(prev => prev ? { ...prev, done } : null);
        }
      } else {
        const res = await fetch("/api/product");
        const list = await res.json();
        const all = Array.isArray(list) ? list : list?.data || [];
        for (const r of rows) {
          const name = getCell(r, keys.a);
          if (!name) continue;
          const satuanRaw = keys.b ? Number(r[keys.b]) : 1;
          const satuan = isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
          const match = all.find(
            (x: any) => normalize(String(x?.name || "")) === normalize(name),
          );
          if (match && !replaceDupes) continue;
          if (match && replaceDupes) {
            try {
              await fetch("/api/product", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: match.id, name, satuanKg: satuan }),
              });
              continue;
            } catch {}
          }
          await saveProduct(name, satuan);
        }
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Gagal upload data");
    } finally {
      setUploading(false);
      setProgressOpen(false);
      setProgressMeta(null);
      setProgressText("");
      abortRef.current = null;
    }
  };

  const renderPreviewHeaders = () => {
    if (variant === "ritel") return ["Nama PT", "Inisial", "Tujuan"];
    if (variant === "unit") return ["Regional", "Site Area"];
    if (variant === "retur") return ["Produk", "Qty", "Nominal"];
    return ["Produk", "Satuan (Kg)"];
  };

  const renderPreviewRow = (row: any) => {
    if (variant === "ritel") {
      const namaPt = getCell(row, keys.a);
      const tujuan = getCell(row, keys.b);
      const inisial = getCell(row, keys.c);
      return [namaPt, inisial || "—", tujuan];
    }
    if (variant === "unit") {
      const regional = getCell(row, keys.a);
      const siteArea = getCell(row, keys.b);
      return [regional, siteArea];
    }
    if (variant === "retur") {
      const produk = getCell(row, keys.a);
      const qty = getCell(row, keys.b);
      const nominal = getCell(row, keys.c);
      return [produk, qty, nominal];
    }
    const name = getCell(row, keys.a);
    const satuanRaw = keys.b ? Number(row[keys.b]) : 1;
    const satuan = isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
    return [name, String(satuan)];
  };

  const titleText = title || "Bulk Upload";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={titleText}
        className="max-w-xl"
      >
        <div className="space-y-4">
          {!file ? (
            <div
              onClick={() => fileRef.current?.click()}
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
                ref={fileRef}
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
                onClick={() => {
                  setFile(null);
                  setRows([]);
                  setDupeCount(0);
                  setError(null);
                  setReplaceDupes(false);
                  setShowDupeRows(false);
                  setDupeGroups([]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  Preview Data
                </span>
                <span className="text-slate-500">
                  {rows.length} records found
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {renderPreviewHeaders().map((h) => (
                        <th key={h} className="p-2 font-medium text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 5).map((r, i) => {
                      const vals = renderPreviewRow(r);
                      return (
                        <tr key={i}>
                          {vals.map((v, k) => (
                            <td key={k} className="p-2 text-slate-700">
                              {v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {rows.length > 5 && (
                      <tr>
                        <td
                          colSpan={renderPreviewHeaders().length}
                          className="p-2 text-center text-slate-400 italic"
                        >
                          ...and {rows.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {rows.length > 0 && dupeCount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-blue-700 font-semibold">
                  Deteksi Duplikat: {dupeCount} data sudah ada di database
                </div>
                {variant === "ritel" && dupeGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDupeRows((v) => !v)}
                    className="px-2 py-1 rounded-md border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold"
                  >
                    {showDupeRows ? "Sembunyikan Baris" : "Lihat Baris"}
                  </button>
                )}
              </div>
              {variant === "ritel" && showDupeRows && dupeGroups.length > 0 && (
                <div className="mt-2 text-xs text-blue-800">
                  <div className="max-h-36 overflow-y-auto border border-blue-100 rounded-md bg-white p-2 space-y-1">
                    {dupeGroups.slice(0, 25).map((g) => (
                      <div key={g.label} className="flex gap-2">
                        <span className="font-semibold">{g.label}</span>
                        <span className="text-blue-700/80">
                          Row: {g.rows.slice(0, 25).join(", ")}
                          {g.rows.length > 25 && " ..."}
                        </span>
                      </div>
                    ))}
                    {dupeGroups.length > 25 && (
                      <div className="text-blue-700/70 italic">
                        ...dan {dupeGroups.length - 25} grup duplikat lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="py-4">
              <LoaderThree label="Reading file" />
            </div>
          )}

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
              disabled={!file || loading || uploading || rows.length === 0}
              className="flex-1 py-2.5 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 active:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <LoaderThree label="Processing..." />
              ) : (
                "Upload Data"
              )}
            </button>
          </div>
        </div>
      </Modal>
      {progressOpen && uploading && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Upload Bulk
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {progressMeta
                      ? `Batch ${progressMeta.batchIndex}/${progressMeta.batchTotal}`
                      : "Menyiapkan..."}
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
                    {progressMeta
                      ? `${progressMeta.done}/${progressMeta.total}`
                      : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-slate-900"
                    style={{
                      width: (() => {
                        if (!progressMeta || progressMeta.total <= 0)
                          return "0%";
                        const pct = Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(
                              (progressMeta.done / progressMeta.total) * 100,
                            ),
                          ),
                        );
                        return `${pct}%`;
                      })(),
                    }}
                  />
                </div>
                {progressMeta && (
                  <div className="text-xs text-slate-600">
                    {Math.max(progressMeta.total - progressMeta.done, 0)} of{" "}
                    {progressMeta.total} remaining
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {progressText || "Sedang memproses..."}
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
                Konfirmasi Duplikat
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Terdeteksi {dupeCount} data sudah ada di database.
              </p>
            </div>
            <div className="p-6 space-y-3">
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
