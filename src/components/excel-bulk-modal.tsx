 "use client";
 
 import { useEffect, useRef, useState } from "react";
 import * as XLSX from "xlsx";
 import Modal from "./modal";
 import { LoaderThree } from "@/components/ui/loader";
 import { FileSpreadsheet, Upload, X } from "lucide-react";
 import { saveRitel, saveUnitProduksi, saveProduct } from "@/lib/api";
 
 type Variant = "ritel" | "unit" | "produk";
 
 type Props = {
   open: boolean;
   onClose: () => void;
   onSuccess?: () => void;
   title: string;
   variant: Variant;
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
 }: Props) {
   const [file, setFile] = useState<File | null>(null);
   const [rows, setRows] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [dupeCount, setDupeCount] = useState(0);
   const [replaceDupes, setReplaceDupes] = useState(false);
   const [showConfirm, setShowConfirm] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const fileRef = useRef<HTMLInputElement>(null);
 
   const [keys, setKeys] = useState<Record<string, string | null>>({
     a: null,
     b: null,
     c: null,
   });
 
   const readExcel = async (f: File) => {
     const reader = new FileReader();
     return new Promise<any[]>((resolve, reject) => {
       reader.onload = (e) => {
         try {
           const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
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
     if (variant === "ritel") {
       const namaPtKey = findKey(first, ["nama pt", "nama company", "company", "nama perusahaan", "pt"]);
       const tujuanKey = findKey(first, ["tujuan", "destination", "lokasi", "store", "nama toko", "dc"]);
       const inisialKey = findKey(first, ["inisial", "initial"]);
       return { a: namaPtKey, b: tujuanKey, c: inisialKey };
     }
     if (variant === "unit") {
       const regKey = findKey(first, ["regional", "region", "reg"]);
       const siteKey = findKey(first, ["site area", "sitearea", "lokasi", "unit", "site"]);
       return { a: regKey, b: siteKey, c: null };
     }
     const productKey = findKey(first, ["produk", "product", "nama produk", "nama produk (sku)"]);
     const satuanKey = findKey(first, ["satuan kg", "satuan", "kg/pcs", "kg per pcs", "kg"]);
     return { a: productKey, b: satuanKey, c: null };
   };
 
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const selected = e.target.files?.[0];
     if (!selected) return;
     setFile(selected);
     setError(null);
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
       const set = new Set(
         (Array.isArray(list) ? list : list?.data || []).map(
           (x: any) =>
             `${normalize(String(x?.namaPt || ""))}|${normalize(String(x?.inisial || ""))}|${normalize(
               String(x?.tujuan || ""),
             )}`,
         ),
       );
       const count = rows
         .map(
           (r) =>
             `${normalize(getCell(r, keys.a))}|${normalize(getCell(r, keys.c))}|${normalize(getCell(r, keys.b))}`,
         )
         .filter((k) => set.has(k)).length;
       setDupeCount(count);
       return;
     }
     if (variant === "unit") {
       const res = await fetch("/api/unit-produksi");
       const list = await res.json();
       const set = new Set(
         (Array.isArray(list) ? list : list?.data || []).map(
           (x: any) => `${normalize(String(x?.namaRegional || ""))}|${normalize(String(x?.siteArea || ""))}`,
         ),
       );
       const count = rows
         .map((r) => `${normalize(getCell(r, keys.a))}|${normalize(getCell(r, keys.b))}`)
         .filter((k) => set.has(k)).length;
       setDupeCount(count);
       return;
     }
     const res = await fetch("/api/product");
     const list = await res.json();
     const set = new Set(
       (Array.isArray(list) ? list : list?.data || []).map((x: any) => normalize(String(x?.name || ""))),
     );
     const count = rows
       .map((r) => normalize(getCell(r, keys.a)))
       .filter((k) => set.has(k) && !!k).length;
     setDupeCount(count);
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
     try {
       if (variant === "ritel") {
         const res = await fetch("/api/ritel");
         const list = await res.json();
         const all = Array.isArray(list) ? list : list?.data || [];
         for (const r of rows) {
           const namaPt = getCell(r, keys.a);
           const tujuan = getCell(r, keys.b);
           if (!namaPt || !tujuan) continue;
           const inisial = getCell(r, keys.c) || null;
           const key = `${normalize(namaPt)}|${normalize(inisial || "")}|${normalize(tujuan)}`;
           const match = all.find(
             (x: any) =>
               normalize(String(x?.namaPt || "")) === normalize(namaPt) &&
               normalize(String(x?.tujuan || "")) === normalize(tujuan) &&
               normalize(String(x?.inisial || "")) === normalize(inisial || ""),
           );
           if (match && !replaceDupes) continue;
           if (match && replaceDupes) {
             try {
               await fetch("/api/ritel", {
                 method: "DELETE",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ id: match.id }),
               });
             } catch {}
           }
           await saveRitel({ namaPt, inisial: inisial || undefined, tujuan });
         }
       } else if (variant === "unit") {
         const res = await fetch("/api/unit-produksi");
         const list = await res.json();
         const all = Array.isArray(list) ? list : list?.data || [];
         for (const r of rows) {
           const regional = getCell(r, keys.a);
           const siteArea = getCell(r, keys.b);
           if (!regional || !siteArea) continue;
           const match = all.find(
             (x: any) =>
               normalize(String(x?.namaRegional || "")) === normalize(regional) &&
               normalize(String(x?.siteArea || "")) === normalize(siteArea),
           );
           if (match && !replaceDupes) continue;
           if (match && replaceDupes) {
             try {
               await fetch("/api/unit-produksi", {
                 method: "DELETE",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ namaRegional: regional, siteArea }),
               });
             } catch {}
           }
           await saveUnitProduksi({ regional, siteArea });
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
           const match = all.find((x: any) => normalize(String(x?.name || "")) === normalize(name));
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
     }
   };
 
   const renderPreviewHeaders = () => {
     if (variant === "ritel") return ["Nama PT", "Inisial", "Tujuan"];
     if (variant === "unit") return ["Regional", "Site Area"];
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
     const name = getCell(row, keys.a);
     const satuanRaw = keys.b ? Number(row[keys.b]) : 1;
     const satuan = isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
     return [name, String(satuan)];
   };
 
   const titleText = title || "Bulk Upload";
 
   return (
     <>
       <Modal open={open} onClose={onClose} title={titleText} className="max-w-xl">
         <div className="space-y-4">
           {!file ? (
             <div
               onClick={() => fileRef.current?.click()}
               className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
             >
               <div className="p-3 bg-slate-50 rounded-full mb-3 group-hover:bg-white transition-colors">
                 <Upload size={24} className="text-slate-400 group-hover:text-blue-500" />
               </div>
               <h3 className="font-bold text-slate-700 text-sm">Click to upload or drag and drop</h3>
               <p className="text-slate-400 text-xs mt-1">Excel files only (.xlsx, .xls)</p>
               <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
             </div>
           ) : (
             <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                   <FileSpreadsheet size={24} />
                 </div>
                 <div>
                   <p className="font-bold text-slate-700 text-sm truncate max-w-[200px]">{file.name}</p>
                   <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                 </div>
               </div>
               <button
                 onClick={() => {
                   setFile(null);
                   setRows([]);
                   setDupeCount(0);
                   setError(null);
                   setReplaceDupes(false);
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
                 <span className="font-semibold text-slate-700">Preview Data</span>
                 <span className="text-slate-500">{rows.length} records found</span>
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
                         <td colSpan={renderPreviewHeaders().length} className="p-2 text-center text-slate-400 italic">
                           ...and {rows.length - 5} more
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
 
           {error && (
             <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">{error}</div>
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
               {uploading ? <LoaderThree label="Processing..." /> : "Upload Data"}
             </button>
           </div>
         </div>
       </Modal>
 
       {showConfirm && !uploading && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
           <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-50 bg-blue-50/50">
               <h3 className="text-lg font-extrabold text-slate-800">Konfirmasi Duplikat</h3>
               <p className="text-xs text-slate-500 mt-1">Terdeteksi {dupeCount} data sudah ada di database.</p>
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
