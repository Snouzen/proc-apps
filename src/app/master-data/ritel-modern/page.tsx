"use client";

const getXLSX = () => import("xlsx");

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Eye,
  Zap,
  Edit2,
  Plus,
  Store,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import React, { useEffect, useState } from "react";
import { saveRitel } from "@/lib/api";
import { getMeSync } from "@/lib/me";
import { StatefulButton } from "@/components/ui/stateful-button";
import Combobox from "@/components/combobox";
import dynamic from "next/dynamic";
const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), {
  ssr: false,
});
import { useAutoRefreshTick } from "@/components/auto-refresh";

const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const parts = String(text).split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-black rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
};

export default function RitelModernPage() {
  const me = getMeSync();
  const isRm = me?.role === "rm";
  const isPusat = me?.role === "pusat";
  const canEdit = isRm || isPusat;
  const refreshTick = useAutoRefreshTick();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"addInisial" | "addCompany">("addInisial");
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [bulkDialog, setBulkDialog] = useState<{
    rows: any[];
    dupeCount: number;
    namaPtKey: string | null;
    tujuanKey: string | null;
    inisialAliases: string[];
  } | null>(null);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [inisial, setInisial] = useState("");

  const [editCompany, setEditCompany] = useState<{
    id?: string;
    namaPt: string;
    originalNamaPt?: string;
    inisial: string | null;
    originalInisial: string | null;
    logoPt?: string | null;
    logoInisial?: string | null;
    ptOnly?: boolean;
  } | null>(null);
  const [viewCompany, setViewCompany] = useState<{
    namaPt: string;
    inisial: string | null;
    stores: { id: string; tujuan: string }[];
  } | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<string | null>(null);
  const [deleteInisial, setDeleteInisial] = useState<{ namaPt: string; inisial: string } | null>(null);
  const [viewPage, setViewPage] = useState(1);
  useEffect(() => {
    if (viewCompany) setViewPage(1);
  }, [viewCompany]);

  const [dataRitel, setDataRitel] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editStore, setEditStore] = useState<{
    id: string;
    tujuan: string;
    namaPt: string;
  } | null>(null);
  const [deleteStore, setDeleteStore] = useState<{
    id: string;
    tujuan: string;
    namaPt: string;
  } | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [editAlias, setEditAlias] = useState<{
    namaPt: string;
    inisial: string;
  } | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [viewAliases, setViewAliases] = useState<{ namaPt: string } | null>(
    null,
  );
  const [aliasPage, setAliasPage] = useState(1);
  const aliasItemsPerPage = 6; // 3 rows x 2 grid
  useEffect(() => {
    if (viewAliases) setAliasPage(1);
  }, [viewAliases]);
  const [addStoreFor, setAddStoreFor] = useState<{
    namaPt: string;
    inisial: string;
  } | null>(null);
  const [newStoreForName, setNewStoreForName] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [logoPt, setLogoPt] = useState("");
  const [logoInisial, setLogoInisial] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [bulkResult, setBulkResult] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  // Mapping Nama PT -> Inisial (sama seperti form manual, untuk bulk upload dipakai juga)
  const companyMapping: Record<string, string> = {
    "PERUM BULOG - UBSN": "BOSSFOOD",
    "PT GRACIA MITRA SELARAS": "MARKET CITY",
    "PT SUMBER ALFARIA TRIJAYA, TBK": "ALFAMART",
    "PT LUCKY STRATEGIS": "GRAND LUCKY",
    "PT MITRA BELANJA ANDA": "GRAND LUCKY",
    "PT HOKKY TE IT": "GRAND LUCKY",
    "PT LUCKY BERSAMA": "GRAND LUCKY",
    "PT LION SUPER INDO (LSI)": "SUPERINDO",
    "PT TRANS RITEL INDONESIA": "TRANSMART",
    "PT TRANS GROSIR INDONESIA": "GROSERINDO",
    "CV HOKKI FAMILY": "HOKKY SURABAYA",
    "PT HOKKY PRADANA UTAMA": "HOKKY SURABAYA",
    "PT NAGA SWALAYAN": "NAGA SWALAYAN",
    "PT TIP TOP": "TIP TOP",
  };

  const [loadError, setLoadError] = useState<string | null>(null);

  const safeDataRitel = Array.isArray(dataRitel) ? dataRitel : [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading((v) => v || dataRitel.length === 0);
      setLoadError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

      try {
        const fetchOnce = async () => {
          const res = await fetch("/api/ritel", {
            signal: controller.signal,
            cache: "no-store",
          });
          let result: unknown;
          try {
            result = await res.json();
          } catch {
            return {
              ok: false,
              statusText: res.statusText,
              error: "Response bukan JSON. Cek API / server.",
              data: null,
            };
          }
          if (!res.ok) {
            const msg =
              (result as { error?: string })?.error ||
              res.statusText ||
              "Gagal mengambil data";
            return {
              ok: false,
              statusText: res.statusText,
              error: msg,
              data: null,
            };
          }
          const list = Array.isArray(result)
            ? result
            : ((result as { data?: unknown[] })?.data ?? []);
          return {
            ok: true,
            statusText: res.statusText,
            error: null,
            data: list,
          };
        };

        let lastErr: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const out = await fetchOnce();
          if (out.ok) {
            setDataRitel(out.data as any[]);
            lastErr = null;
            break;
          }
          lastErr = out.error || "Gagal mengambil data";
          const isMaxClient =
            typeof lastErr === "string" &&
            lastErr.toLowerCase().includes("maxclientsinsessionmode");
          if (!isMaxClient || attempt === 2) break;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
        if (lastErr) {
          setLoadError(lastErr);
          if (dataRitel.length === 0) setDataRitel([]);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Gagal load data:", err);
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            setLoadError(
              "Timeout. Database/API tidak merespons. Cek DATABASE_URL dan koneksi.",
            );
          } else {
            setLoadError(err.message);
          }
        } else {
          setLoadError("Tidak bisa connect ke server. Cek koneksi / database.");
        }
        if (dataRitel.length === 0) setDataRitel([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshTick]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };
  const executeRitelBulk = async (replaceDupes: boolean) => {
    if (!bulkDialog) return;
    const { rows, dupeCount, namaPtKey, tujuanKey, inisialAliases } =
      bulkDialog;
    const existingKeySet = new Set(
      (Array.isArray(dataRitel) ? dataRitel : []).map(
        (row: any) =>
          `${String(row.namaPt || "")
            .trim()
            .toLowerCase()}|${String(row.tujuan || "")
            .trim()
            .toLowerCase()}`,
      ),
    );
    setIsLoading(true);
    setBulkDialog(null);
    try {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const namaPt = getCellValue(row, namaPtKey);
        const tujuan = getCellValue(row, tujuanKey);
        if (!namaPt || !tujuan) continue;

        const inisialKey = findColumnKey(row, inisialAliases);
        const excelInisial = getCellValue(row, inisialKey);
        const inisial = companyMapping[namaPt] ?? (excelInisial || null);

        // Find logo keys if they exist in Excel (Logo PT, Logo Inisial)
        const logoPtKey = findColumnKey(row, ["logo pt", "logopt", "logo_pt"]);
        const logoInisialKey = findColumnKey(row, [
          "logo inisial",
          "logoinitial",
          "logo_inisial",
        ]);
        const excelLogoPt = getCellValue(row, logoPtKey);
        const excelLogoInisial = getCellValue(row, logoInisialKey);

        const payload = {
          namaPt,
          inisial: inisial || undefined,
          tujuan,
          logoPt: excelLogoPt || undefined,
          logoInisial: excelLogoInisial || undefined,
        };

        const key = `${namaPt.trim().toLowerCase()}|${tujuan.trim().toLowerCase()}`;
        const isDupe = existingKeySet.has(key);

        if (isDupe && !replaceDupes) {
          continue;
        }
        if (isDupe && replaceDupes) {
          const match = (Array.isArray(dataRitel) ? dataRitel : []).find(
            (r: any) =>
              String(r.namaPt || "")
                .trim()
                .toLowerCase() === namaPt.trim().toLowerCase() &&
              String(r.tujuan || "")
                .trim()
                .toLowerCase() === tujuan.trim().toLowerCase(),
          );
          if (match?.id) {
            try {
              await fetch(`/api/ritel?id=${encodeURIComponent(match.id)}`, {
                method: "DELETE",
              });
            } catch {}
          }
        }
        await saveRitel(payload);
      }
      Swal.fire({
        icon: "success",
        title: "Bulk Upload Berhasil",
        text: `Bulk Upload selesai. Duplikat: ${dupeCount}. Mode: ${replaceDupes ? "REPLACE" : "SKIP"}.`,
      });
      try {
        const res = await fetch("/api/ritel");
        const result = await res.json().catch(() => ({}));
        const list = Array.isArray(result) ? result : (result?.data ?? []);
        setDataRitel(list);
      } catch {}
    } catch (error) {
      console.error("Bulk Upload Error:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal konek server backend atau ada masalah saat upload. Cek konsol.",
      });
    } finally {
      setIsLoading(false);
      setBulkDialog(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      namaPt: selectedCompany,
      inisial: inisial,
      tujuan: newStoreName,
    };

    try {
      const result = await saveRitel(payload);

      if (result) {
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Data Berhasil disimpan!",
          timer: 1500,
        });
        setIsModalOpen(false);
        setSelectedCompany("");
        setNewStoreName("");

        window.location.reload();
      }
    } catch (error) {
      console.error("Error Submit Data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal konek server backend",
      });
    }
  };

  const groupedData = safeDataRitel.reduce((acc: any[], item: any) => {
    let group = acc.find((g) => g.namaPt === item.namaPt);
    if (!group) {
      group = {
        displayId: item.id,
        namaPt: item.namaPt,
        logoPt: item.logoPt,
        inisials: {} as Record<
          string,
          {
            logoInisial?: string | null;
            stores: { id: string; tujuan: string }[];
          }
        >,
      };
      acc.push(group);
    }

    // Always update logoPt if current item has it (in case some rows don't)
    if (item.logoPt && !group.logoPt) group.logoPt = item.logoPt;

    const alias = String(item.inisial ?? "—");
    
    const hasStore = item.tujuan && String(item.tujuan).trim().length > 0;
    
    // Skip empty inisial placeholder if there are no stores attached
    if (alias !== "—" || hasStore) {
      if (!group.inisials[alias]) {
        group.inisials[alias] = { logoInisial: item.logoInisial, stores: [] };
      }
      // Update logoInisial if current item has it
      if (item.logoInisial && !group.inisials[alias].logoInisial) {
        group.inisials[alias].logoInisial = item.logoInisial;
      }

      if (hasStore) {
        group.inisials[alias].stores.push({ id: item.id, tujuan: item.tujuan });
      }
    }
    return acc;
  }, []);

  const existingCompanies = Array.from(
    new Set(safeDataRitel.map((item) => item.namaPt)),
  ).sort();
  const allCompanyOptions = Array.from(
    new Set([...Object.keys(companyMapping), ...existingCompanies]),
  ).sort();

  const filteredData = groupedData
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchPt = item.namaPt.toLowerCase().includes(term);
      const matchAlias = Object.keys(item.inisials).some((a) =>
        a.toLowerCase().includes(term),
      );
      const matchStore = Object.values(item.inisials).some((data: any) =>
        data.stores.some((s: any) =>
          String(s.tujuan || "")
            .toLowerCase()
            .includes(term),
        ),
      );
      return matchPt || matchAlias || matchStore;
    })
    .sort((a, b) => a.namaPt.localeCompare(b.namaPt));

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Cari key kolom di row yang cocok dengan salah satu alias (case-insensitive, trim, spasi ganda dinormalisasi)
  const findColumnKey = (row: any, aliases: string[]): string | null => {
    if (!row || typeof row !== "object") return null;
    const norm = (s: string) =>
      (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const normAliases = aliases.map((a) => norm(a));
    for (const key of Object.keys(row)) {
      if (normAliases.includes(norm(key))) return key;
    }
    return null;
  };

  const getCellValue = (row: any, key: string | null): string => {
    if (!key || row[key] == null) return "";
    return String(row[key]).trim();
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const XLSX = await getXLSX();
      const workbook = XLSX.read(event.target?.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      if (!jsonData.length) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "File Excel kosong atau tidak ada data di sheet pertama.",
        });
        e.target.value = "";
        return;
      }

      const first = jsonData[0];
      const namaPtAliases = [
        "nama pt",
        "namapt",
        "company",
        "nama perusahaan",
        "pt",
      ];
      const tujuanAliases = [
        "tujuan",
        "destination",
        "lokasi",
        "store",
        "nama toko",
        "dc",
      ];
      const inisialAliases = ["inisial", "initial"];

      const namaPtKey = findColumnKey(first, namaPtAliases);
      const tujuanKey = findColumnKey(first, tujuanAliases);

      if (!namaPtKey || !tujuanKey) {
        const existingKeys =
          Object.keys(first || {}).join(", ") || "(tidak ada kolom)";
        Swal.fire({
          icon: "error",
          title: "Format Salah",
          text: `Format Excel tidak dikenali. Gunakan header: "Nama PT" dan "Tujuan". Kolom terbaca: ${existingKeys}.`,
        });
        e.target.value = "";
        return;
      }

      const existingKeySet = new Set(
        safeDataRitel.map(
          (row: any) =>
            `${String(row.namaPt || "")
              .trim()
              .toLowerCase()}|${String(row.tujuan || "")
              .trim()
              .toLowerCase()}`,
        ),
      );
      const uploadKeys = jsonData.map((row) => {
        const namaPt = getCellValue(row, namaPtKey);
        const tujuan = getCellValue(row, tujuanKey);
        return `${namaPt.trim().toLowerCase()}|${tujuan.trim().toLowerCase()}`;
      });
      const dupeCount = uploadKeys.filter((k) => existingKeySet.has(k)).length;
      setBulkDialog({
        rows: jsonData,
        dupeCount,
        namaPtKey,
        tujuanKey,
        inisialAliases,
      });
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ritel Modern</h1>
          <p className="text-sm text-slate-500 mt-1">Ritel Modern</p>
        </div>

        <div className="flex gap-2">
          {!isRm && (
          <button
            suppressHydrationWarning
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload (Excel)
          </button> 
        )}
          <button
            suppressHydrationWarning
            onClick={() => {
              setSelectedCompany("");
              setInisial("");
              setLogoPt("");
              setLogoInisial("");
              setModalMode("addInisial");
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Add New Data
          </button>
        </div>
      </div>

      {bulkResult && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            bulkResult.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {bulkResult.text}
        </div>
      )}
      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          setIsLoading(true);
          fetch("/api/ritel")
            .then((r) => r.json())
            .then((list) => {
              setDataRitel(Array.isArray(list) ? list : list?.data || []);
            })
            .finally(() => setIsLoading(false));
        }}
        title="Bulk Upload Ritel Modern"
        variant="ritel"
      />

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Gagal load data:</strong> {loadError}
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari Nama PT atau Inisial..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-non focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-neutral-900">
                <svg className="absolute w-20 h-20" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="6"
                    fill="none"
                    className="stroke-neutral-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    className="stroke-amber-500 ldr-dash"
                  />
                </svg>
                <div className="ldr-flicker text-amber-500">
                  <Zap size={24} />
                </div>
              </div>
            </div>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            {loadError ? "—" : "Belum ada data di database."}
          </div>
        ) : (
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {currentItems.map((group) => (
              <div
                key={group.displayId}
                className="group relative bg-white rounded-[32px] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden"
              >
                {/* Logo Area - Large & Clear */}
                <div className="relative h-[130px] w-full bg-white border-b border-slate-50 flex items-center justify-center p-6 overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                  
                  {group.logoPt ? (
                    <img
                      src={group.logoPt}
                      alt={group.namaPt}
                      className="max-h-full max-w-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Building2 size={40} className="text-slate-400" />
                    </div>
                  )}

                  {/* Badge Inisial - Top Right */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full border border-slate-100 shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <span className="text-[10px] font-black text-slate-800 tabular-nums">
                      {Object.keys(group.inisials).length}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inisial</span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors truncate" title={group.namaPt}>
                      {highlightText(group.namaPt, searchTerm)}
                    </h3>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-2">
                    <button
                      onClick={() => setViewAliases({ namaPt: group.namaPt })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-indigo-100 active:scale-95"
                    >
                      <Eye size={14} strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase tracking-widest">View Details</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => {
                            const firstAlias = Object.keys(group.inisials)[0];
                            const firstData = group.inisials[firstAlias];
                            setEditCompany({
                              id: group.displayId,
                              namaPt: group.namaPt,
                              originalNamaPt: group.namaPt,
                              inisial: null,
                              originalInisial: null,
                              logoPt: group.logoPt,
                              ptOnly: true
                            });
                          }}
                          className="p-3 rounded-2xl bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-300 group/edit"
                          title="Edit Logo / Nama PT"
                        >
                          <Edit2 size={15} strokeWidth={2.5} className="group-hover/edit:rotate-12 transition-transform" />
                        </button>
                      )}

                      {!isRm && (
                        <button
                          onClick={() => setDeleteCompany(group.namaPt)}
                          className="p-3 rounded-2xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 group/del"
                          title="Hapus Ritel"
                        >
                          <Trash2 size={15} strokeWidth={2.5} className="group-hover/del:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editStore && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditStore(null)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Ubah Nama Store
              </h3>
              <button
                onClick={() => setEditStore(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Company: <span className="font-bold">{editStore.namaPt}</span>
              </p>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
              <div className="flex gap-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditStore(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      await fetch("/api/ritel", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: editStore.id,
                          tujuan: newStoreName,
                        }),
                      });
                      setEditStore(null);
                      setDataRitel((prev) =>
                        prev.map((r) =>
                          r.id === editStore.id
                            ? { ...r, tujuan: newStoreName }
                            : r,
                        ),
                      );
                      if (viewCompany) {
                        setViewCompany({
                          ...viewCompany,
                          stores: viewCompany.stores.map((s) =>
                            s.id === editStore.id
                              ? { ...s, tujuan: newStoreName }
                              : s,
                          ),
                        });
                      }
                    } catch {}
                  }}
                  className="flex-1"
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {addStoreFor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setAddStoreFor(null)}
          />
          <div className="relative bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddStoreFor(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                >
                  <ChevronLeft size={16} />
                  <span className="text-xs font-bold">Back</span>
                </button>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Tambah Toko/DC
                </h3>
              </div>
              <button
                onClick={() => setAddStoreFor(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                {addStoreFor.namaPt}{" "}
                {addStoreFor.inisial ? `(${addStoreFor.inisial})` : ""}
              </p>
              <input
                type="text"
                placeholder="Nama Toko/DC"
                value={newStoreForName}
                onChange={(e) => setNewStoreForName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
              <div className="flex gap-2 justify-end">
                <StatefulButton
                  variant="cancel"
                  onClick={() => {
                    setAddStoreFor(null);

                  }}
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      const payload = {
                        namaPt: addStoreFor.namaPt,
                        inisial: addStoreFor.inisial || null,
                        tujuan: newStoreForName,
                      };
                      const result = await saveRitel(payload);
                      setDataRitel((prev) => [result, ...prev]);
                      
                      // Sync with viewCompany if active
                      if (viewCompany && 
                          viewCompany.namaPt === addStoreFor.namaPt && 
                          (viewCompany.inisial || "—") === (addStoreFor.inisial || "—")) {
                        setViewCompany({
                          ...viewCompany,
                          stores: [...viewCompany.stores, { id: result.id, tujuan: result.tujuan }]
                        });
                      }

                      setAddStoreFor(null);
                      setNewStoreForName("");
                    } catch {
                      // noop
                    }
                  }}
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteStore && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteStore(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus Store?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteStore.tujuan} di {deleteStore.namaPt}
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <StatefulButton
                variant="cancel"
                onClick={() => setDeleteStore(null)}
              >
                Batal
              </StatefulButton>
              <StatefulButton
                variant="submit"
                onClick={async () => {
                  try {
                    await fetch(
                      `/api/ritel?id=${encodeURIComponent(deleteStore.id)}`,
                      {
                        // REFACTOR: DELETE via query param
                        method: "DELETE",
                      },
                    );
                    setDeleteStore(null);
                    setDataRitel((prev) =>
                      prev.filter((r) => r.id !== deleteStore.id),
                    );
                    if (viewCompany) {
                      setViewCompany({
                        ...viewCompany,
                        stores: viewCompany.stores.filter(
                          (s) => s.id !== deleteStore.id,
                        ),
                      });
                    }
                  } catch {}
                }}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Hapus
              </StatefulButton>
            </div>
          </div>
        </div>
      )}
      {viewAliases && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewAliases(null)}
          />
          <div className="relative bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Inisial - {viewAliases.namaPt}
              </h3>
              <button
                onClick={() => setViewAliases(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {(() => {
                const group = groupedData.find(
                  (g) => g.namaPt === viewAliases.namaPt,
                );
                const aliases = group ? Object.entries(group.inisials) : [];
                const totalPages = Math.max(
                  1,
                  Math.ceil(aliases.length / aliasItemsPerPage),
                );
                const start = (aliasPage - 1) * aliasItemsPerPage;
                const pageAliases = aliases.slice(
                  start,
                  start + aliasItemsPerPage,
                );
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pageAliases.length === 0 ? (
                        <div className="col-span-1 sm:col-span-2 text-center text-slate-400 py-6 text-sm font-medium">
                          Belum ada Inisial terdaftar.
                        </div>
                      ) : (
                        pageAliases.map(([alias, data]: [string, any]) => (
                          <div
                          key={alias}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                              {data.logoInisial ? (
                                <img
                                  src={data.logoInisial}
                                  alt="logo"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Store size={20} className="text-slate-200" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest uppercase inline-block mb-1 border border-slate-200/50">
                                {alias || "—"}
                              </div>
                              <div className="text-xs text-slate-400 font-medium">
                                {data.stores.length} Distribusi Toko
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewCompany({
                                  namaPt: viewAliases.namaPt,
                                  inisial: alias,
                                  stores: data.stores,
                                });
                              }}
                              className="p-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                              title="Lihat Toko"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const masterGroup = (dataRitel || []).find(
                                  (r) =>
                                    r.namaPt === viewAliases.namaPt &&
                                    (r.inisial || "—") === alias,
                                );
                                setEditCompany({
                                  id: masterGroup?.id,
                                  namaPt: viewAliases.namaPt,
                                  inisial: alias === "—" ? null : alias,
                                  originalInisial:
                                    alias === "—" ? null : alias,
                                  logoPt: masterGroup?.logoPt || null,
                                  logoInisial:
                                    masterGroup?.logoInisial || null,
                                });
                              }}
                              className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                              title="Edit Data & Logo"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setAddStoreFor({
                                  namaPt: viewAliases.namaPt,
                                  inisial: alias,
                                });
                                setNewStoreForName("");
                              }}
                              className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Tambah Toko/DC"
                            >
                              <Plus size={14} />
                            </button>
                            {(isPusat || isRm) && (
                              <button
                                onClick={() => {
  
                                  setTimeout(() => {
                                    setDeleteInisial({
                                      namaPt: viewAliases.namaPt,
                                      inisial: alias,
                                    });
                                  }, 0);
                                }}
                                className="p-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700"
                                title="Hapus Inisial"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )))}
                    </div>
                    <div className="flex items-center justify-between pt-3">
                      <p className="text-xs text-slate-500">
                        Menampilkan {start + 1}-
                        {Math.min(start + aliasItemsPerPage, aliases.length)}{" "}
                        dari {aliases.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setAliasPage((p) => Math.max(p - 1, 1))
                          }
                          disabled={aliasPage === 1}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white disabled:opacity-50 hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setAliasPage((p) => Math.min(p + 1, totalPages))
                          }
                          disabled={aliasPage === totalPages}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white disabled:opacity-50 hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {bulkDialog && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setBulkDialog(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-blue-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Konfirmasi Bulk Upload
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Total {bulkDialog.rows.length} baris. Duplikat terdeteksi:{" "}
                {bulkDialog.dupeCount}.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium text-slate-500">
                        Nama PT
                      </th>
                      <th className="p-2 font-medium text-slate-500">
                        Inisial
                      </th>
                      <th className="p-2 font-medium text-slate-500">Tujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkDialog.rows.slice(0, 5).map((row, i) => {
                      const namaPt = getCellValue(row, bulkDialog.namaPtKey);
                      const tujuan = getCellValue(row, bulkDialog.tujuanKey);
                      const inisialKey = findColumnKey(
                        row,
                        bulkDialog.inisialAliases,
                      );
                      const excelInisial = getCellValue(row, inisialKey);
                      const inisial =
                        companyMapping[namaPt] ?? (excelInisial || "");
                      return (
                        <tr key={i}>
                          <td className="p-2 text-slate-700">{namaPt}</td>
                          <td className="p-2 text-slate-700">
                            {inisial || "—"}
                          </td>
                          <td className="p-2 text-slate-700">{tujuan}</td>
                        </tr>
                      );
                    })}
                    {bulkDialog.rows.length > 5 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-2 text-center text-slate-400 italic"
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
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                    >
                      Replace Duplikat
                    </button>
                    <button
                      onClick={() => executeRitelBulk(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      Skip Duplikat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => executeRitelBulk(false)}
                    className="col-span-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                  >
                    Submit
                  </button>
                )}
              </div>
              <button
                onClick={() => setBulkDialog(null)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
      {editAlias && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditAlias(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Ubah Inisial
              </h3>
              <button
                onClick={() => setEditAlias(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Company: <span className="font-bold">{editAlias.namaPt}</span>
              </p>
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
              <div className="flex gap-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditAlias(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      await fetch("/api/ritel/alias", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          namaPt: editAlias.namaPt,
                          inisial: editAlias.inisial,
                          newInisial: newAlias,
                        }),
                      });
                      setEditAlias(null);
                      setDataRitel((prev) =>
                        prev.map((r) =>
                          r.namaPt === editAlias.namaPt &&
                          (r.inisial ?? "—") === editAlias.inisial
                            ? { ...r, inisial: newAlias }
                            : r,
                        ),
                      );
                    } catch {}
                  }}
                  className="flex-1"
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between item-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={22} className="text-blue-600" />
                {modalMode === "addCompany" ? "Tambah Company Baru" : "Tambah Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>


            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-6 space-y-5"
            >
              <div
                className="relative overflow-hidden transition-all duration-300"
                style={{
                  minHeight: modalMode === "addInisial" ? (isRm ? "180px" : "320px") : "120px",
                }}
              >
                <div
                  className={`transition-all duration-300 transform ${
                    modalMode === "addInisial"
                      ? "translate-x-0 opacity-100 relative"
                      : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                  } space-y-5`}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Building2 size={12} /> Company Name
                    </label>
                    <Combobox
                      options={allCompanyOptions}
                      value={selectedCompany}
                      onChange={setSelectedCompany}
                      placeholder="Cari atau pilih company..."
                      leftIcon={<Building2 size={16} />}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Store size={12} /> Inisial
                    </label>
                    <input
                      required={modalMode === "addInisial"}
                      type="text"
                      placeholder="Contoh: ALFAMART"
                      value={inisial}
                      onChange={(e) => setInisial(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-semibold text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {!isRm && (<>
                      <div>
                        <label className="block text-[11px] font-bold text-blue-600 mb-1 uppercase tracking-wider">
                          Suntik Logo PT (URL)
                        </label>
                        <input
                          type="text"
                          value={logoPt}
                          onChange={(e) => setLogoPt(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px]"
                        />
                        {logoPt && (
                          <div className="mt-1 flex justify-center p-1 bg-white border border-blue-100 rounded-lg">
                            <img src={logoPt} alt="preview" className="h-8 object-contain" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-600 mb-1 uppercase tracking-wider">
                          Suntik Logo Inisial (URL)
                        </label>
                        <input
                          type="text"
                          value={logoInisial}
                          onChange={(e) => setLogoInisial(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-[11px]"
                        />
                        {logoInisial && (
                          <div className="mt-1 flex justify-center p-1 bg-white border border-amber-100 rounded-lg">
                            <img src={logoInisial} alt="preview" className="h-8 object-contain" />
                          </div>
                        )}
                      </div>
                    </>)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompany("");
                      setInisial("");
                      setModalMode("addCompany");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
                  >
                    Add Company Baru
                  </button>
                </div>

                <div
                  className={`transition-all duration-300 transform ${
                    modalMode === "addCompany"
                      ? "translate-x-0 opacity-100 relative"
                      : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                  } space-y-5`}
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nama Company
                    </label>
                    <input
                      required={modalMode === "addCompany"}
                      type="text"
                      placeholder="Contoh: PT LION SUPER INDO"
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompany("");
                      setInisial("");
                      setModalMode("addInisial");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
                  >
                    Back
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    if (modalMode === "addCompany" && !selectedCompany) {
                      Swal.fire({ icon: "error", text: "Nama Company wajib diisi!" });
                      return;
                    }
                    if (modalMode === "addInisial" && (!selectedCompany || !inisial)) {
                      Swal.fire({ icon: "error", text: "Company dan Inisial wajib diisi!" });
                      return;
                    }

                    try {
                      const payload = {
                        namaPt: selectedCompany,
                        inisial: modalMode === "addCompany" ? null : inisial,
                        logoPt: logoPt || undefined,
                        logoInisial: logoInisial || undefined,
                      };
                      const result = await saveRitel(payload);
                      setIsModalOpen(false);
                      setSelectedCompany("");
                      setInisial("");
                      setLogoPt("");
                      setLogoInisial("");
                      setDataRitel((prev) => [result, ...prev]);

                      Swal.fire({
                        icon: "success",
                        title: "Berhasil",
                        text: "Data Berhasil disimpan!",
                        timer: 1500,
                      });
                      setTimeout(() => window.location.reload(), 1000);
                    } catch (error) {
                      console.error("Error Submit Data:", error);
                      Swal.fire({
                        icon: "error",
                        title: "Gagal",
                        text: "Gagal konek server backend",
                      });
                    }
                  }}
                  className="flex-1"
                >
                  Simpan {modalMode === "addCompany" ? "Company" : "Data"}
                </StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inisial Modal */}
      {editCompany && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditCompany(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                {editCompany.ptOnly 
                  ? "Edit Profil Perusahaan" 
                  : `Edit Inisial - ${editCompany.namaPt}`}
              </h3>
              <button
                onClick={() => setEditCompany(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editCompany.ptOnly && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Nama PT (Perusahaan)
                  </label>
                  <input
                    type="text"
                    value={editCompany.namaPt ?? ""}
                    onChange={(e) =>
                      setEditCompany({ ...editCompany, namaPt: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-slate-800 shadow-sm"
                  />
                </div>
              )}

              {!editCompany.ptOnly && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Inisial
                  </label>
                  <input
                    type="text"
                    value={editCompany.inisial ?? ""}
                    onChange={(e) =>
                      setEditCompany({ ...editCompany, inisial: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  />
                </div>
              )}

              <div className="space-y-3">
                {!isRm && (<>

                {editCompany.ptOnly ? (
                  <div>
                    <label className="block text-[11px] font-bold text-blue-600 mb-1 uppercase tracking-wider">
                      Suntik Logo PT (URL)
                    </label>
                    <input
                      type="text"
                      value={editCompany.logoPt ?? ""}
                      onChange={(e) =>
                        setEditCompany({ ...editCompany, logoPt: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-[11px]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-600 mb-1 uppercase tracking-wider">
                      Suntik Logo Inisial (URL)
                    </label>
                    <input
                      type="text"
                      value={editCompany.logoInisial ?? ""}
                      onChange={(e) =>
                        setEditCompany({
                          ...editCompany,
                          logoInisial: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-[11px]"
                    />
                  </div>
                )}
              
                </>)}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditCompany(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/ritel", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: editCompany.id,
                          namaPt: editCompany.originalNamaPt, // Send original name to find the PT group
                          newNamaPt: editCompany.namaPt,      // Send new name to update it
                          inisial: editCompany.originalInisial, // original value to find rows
                          newInisial: editCompany.inisial, // new value to update
                          logoPt: editCompany.logoPt,
                          logoInisial: editCompany.logoInisial,
                        }),
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        Swal.fire({
                          icon: "error",
                          title: "Gagal",
                          text: j?.error || "Gagal update inisial",
                        });
                        return;
                      }
                      // Update state locally
                      setDataRitel((prev) =>
                        prev.map((x: any) => {
                          const oldPtName = (editCompany.originalNamaPt || editCompany.namaPt).toLowerCase();
                          const isSamePt = x.namaPt.toLowerCase() === oldPtName;
                          
                          if (isSamePt) {
                            const isTargetInisial = (x.inisial ?? "—") === (editCompany.originalInisial ?? "—");
                            return {
                              ...x,
                              namaPt: editCompany.namaPt,
                              logoPt: editCompany.logoPt,
                              inisial: isTargetInisial ? (editCompany.inisial || null) : x.inisial,
                              logoInisial: isTargetInisial ? (editCompany.logoInisial || null) : x.logoInisial,
                            };
                          }
                          return x;
                        }),
                      );
                      Swal.fire({
                        icon: "success",
                        title: "Tersimpan",
                        text: "Data Berhasil di-update!",
                        timer: 1500,
                        showConfirmButton: false,
                        position: "top-end",
                        toast: true,
                      });
                      setEditCompany(null);
                    } catch {
                      Swal.fire({
                        icon: "error",
                        title: "Oops...",
                        text: "Gagal update inisial",
                      });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Stores Modal */}
      {viewCompany && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewCompany(null)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewCompany(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                >
                  <ChevronLeft size={16} />
                  <span className="text-xs font-bold">Back</span>
                </button>
                <h3 className="text-lg font-extrabold text-slate-800 truncate">
                  {viewCompany.namaPt}{" "}
                  {viewCompany.inisial ? `(${viewCompany.inisial})` : ""}
                </h3>
              </div>
              <button
                onClick={() => setViewCompany(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {(() => {
                const perPage = 6;
                const total = viewCompany.stores.length;
                const totalPages = Math.max(1, Math.ceil(total / perPage));
                const start = (viewPage - 1) * perPage;
                const end = Math.min(start + perPage, total);
                const pageStores = viewCompany.stores.slice(start, end);
                return (
                  <>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pageStores.map((s) => (
                        <li
                          key={s.id}
                          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 group/store-item hover:border-amber-200 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Store size={14} className="text-amber-600 flex-shrink-0" />
                            <span className="text-sm font-bold text-slate-700 truncate">
                              {s.tujuan}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setNewStoreName(s.tujuan);
                                  setEditStore({ id: s.id, tujuan: s.tujuan, namaPt: viewCompany.namaPt });
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit Nama Toko"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setDeleteStore({ id: s.id, tujuan: s.tujuan, namaPt: viewCompany.namaPt });
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                                title="Hapus Toko"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-slate-500">
                        Showing {total ? start + 1 : 0}–{end} of {total}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewPage((p) => Math.max(p - 1, 1))}
                          disabled={viewPage === 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setViewPage((p) => Math.min(p + 1, totalPages))
                          }
                          disabled={viewPage === totalPages}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Modal */}
      {deleteCompany && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteCompany(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus semua store untuk {deleteCompany}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteCompany(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/ritel?namaPt=${encodeURIComponent(deleteCompany!)}`,
                      {
                        // REFACTOR: DELETE via query param
                        method: "DELETE",
                      },
                    );
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      alert(j?.error || "Gagal menghapus data");
                      return;
                    }
                    setDataRitel((prev) =>
                      prev.filter(
                        (x: any) =>
                          x.namaPt.toLowerCase() !==
                          deleteCompany!.toLowerCase(),
                      ),
                    );
                    setDeleteCompany(null);
                  } catch {
                    alert("Gagal menghapus data");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Inisial Modal */}
      {deleteInisial && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteInisial(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus Inisial {deleteInisial.inisial}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus secara permanen semua data toko/DC yang bernaung di bawah inisial ini.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteInisial(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/ritel?namaPt=${encodeURIComponent(deleteInisial.namaPt)}&inisial=${encodeURIComponent(deleteInisial.inisial)}`,
                      {
                        method: "DELETE",
                      },
                    );
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      alert(j?.error || "Gagal menghapus data");
                      return;
                    }
                    setDataRitel((prev) =>
                      prev.filter((x: any) => {
                        const ptMatch = x.namaPt.toLowerCase() === deleteInisial.namaPt.toLowerCase();
                        const xInisial = x.inisial || "—";
                        const inMatch = xInisial.toLowerCase() === deleteInisial.inisial.toLowerCase();
                        return !(ptMatch && inMatch);
                      }),
                    );
                    setDeleteInisial(null);
                  } catch {
                    alert("Gagal menghapus data");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredData.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-slate-500">
            Showing {indexOfFirstItem + 1} to{" "}
            {Math.min(indexOfLastItem, filteredData.length)} of{" "}
            {filteredData.length} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
