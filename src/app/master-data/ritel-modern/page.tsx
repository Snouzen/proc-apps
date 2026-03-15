"use client";

import * as XLSX from "xlsx";

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
import React, { useEffect, useState } from "react";
import { saveRitel } from "@/lib/api";
import { StatefulButton } from "@/components/ui/stateful-button";
import Combobox from "@/components/combobox";
import ExcelBulkModal from "@/components/excel-bulk-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export default function RitelModernPage() {
  const refreshTick = useAutoRefreshTick();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    namaPt: string;
    inisial: string | null;
  } | null>(null);
  const [viewCompany, setViewCompany] = useState<{
    namaPt: string;
    inisial: string | null;
    stores: { id: string; tujuan: string }[];
  } | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<string | null>(null);
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
        const res = await fetch("/api/ritel", { signal: controller.signal });
        clearTimeout(timeoutId);

        let result: unknown;
        try {
          result = await res.json();
        } catch {
          setLoadError("Response bukan JSON. Cek API / server.");
          setDataRitel([]);
          return;
        }

        if (!res.ok) {
          const msg =
            (result as { error?: string })?.error ||
            res.statusText ||
            "Gagal mengambil data";
          setLoadError(msg);
          setDataRitel([]);
          return;
        }

        const list = Array.isArray(result)
          ? result
          : ((result as { data?: unknown[] })?.data ?? []);
        setDataRitel(list);
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
        setDataRitel([]);
      } finally {
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
            .toLowerCase()}|${String(row.inisial || "")
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
        const payload = { namaPt, inisial: inisial || undefined, tujuan };
        const key = `${namaPt.trim().toLowerCase()}|${(inisial || "")
          .trim()
          .toLowerCase()}|${tujuan.trim().toLowerCase()}`;
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
              String(r.inisial || "")
                .trim()
                .toLowerCase() === (inisial || "").trim().toLowerCase() &&
              String(r.tujuan || "")
                .trim()
                .toLowerCase() === tujuan.trim().toLowerCase(),
          );
          if (match?.id) {
            try {
              await fetch("/api/ritel", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: match.id }),
              });
            } catch {}
          }
        }
        await saveRitel(payload);
      }
      setBulkResult({
        text: `Bulk Upload selesai. Duplikat: ${dupeCount}. Mode: ${replaceDupes ? "REPLACE" : "SKIP"}.`,
        type: "success",
      });
      try {
        const res = await fetch("/api/ritel");
        const result = await res.json().catch(() => ({}));
        const list = Array.isArray(result) ? result : (result?.data ?? []);
        setDataRitel(list);
      } catch {}
    } catch (error) {
      console.error("Bulk Upload Error:", error);
      setBulkResult({
        text: "Gagal konek server backend atau ada masalah saat upload. Cek konsol.",
        type: "error",
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
        alert("Data Berhasil disimpan!");
        setIsModalOpen(false);
        setSelectedCompany("");
        setNewStoreName("");

        window.location.reload();
      }
    } catch (error) {
      console.error("Error Submit Data:", error);
      alert("Gagal konek server backend");
    }
  };

  const groupedData = safeDataRitel.reduce((acc: any[], item: any) => {
    const group = acc.find((g) => g.namaPt === item.namaPt);
    if (!group) {
      acc.push({
        displayId: item.id,
        namaPt: item.namaPt,
        inisials: {} as Record<string, { id: string; tujuan: string }[]>,
      });
    }
    const normalizeIndogrosir = (
      namaPt: string,
      tujuan?: string,
      raw?: string,
    ) => {
      const lowerPt = (namaPt || "").toLowerCase();
      const isIC =
        lowerPt.includes("inti cakrawala") || lowerPt.includes("indogrosir");
      if (!isIC) return raw || "—";
      const text = (tujuan || raw || "").toLowerCase();
      const inAny = (arr: string[]) => arr.some((k) => text.includes(k));
      const jabodetabek = [
        "jakarta",
        "bogor",
        "depok",
        "bekasi",
        "tangerang",
        "jabodetabek",
      ];
      const jabar = [
        "bandung",
        "cirebon",
        "sukabumi",
        "tasik",
        "purwakarta",
        "garut",
        "jawa barat",
      ];
      const jatengDIY = [
        "semarang",
        "solo",
        "surakarta",
        "yogyakarta",
        "magelang",
        "pekalongan",
        "cilacap",
        "jawa tengah",
        "diy",
      ];
      const jatimBali = [
        "surabaya",
        "malang",
        "kediri",
        "jember",
        "banyuwangi",
        "sidoarjo",
        "gresik",
        "denpasar",
        "bali",
        "jawa timur",
      ];
      if (inAny(jabodetabek)) return "INDOGROSIR JABODETABEK";
      if (inAny(jabar)) return "INDOGROSIR JAWA BARAT";
      if (inAny(jatengDIY)) return "INDOGROSIR JAWA TENGAH & DIY";
      if (inAny(jatimBali)) return "INDOGROSIR JAWA TIMUR & BALI";
      return "INDOGROSIR LAIN-LAIN";
    };
    const alias = normalizeIndogrosir(
      item.namaPt,
      item.tujuan,
      String(item.inisial ?? "—"),
    );
    const target = acc.find((g) => g.namaPt === item.namaPt)!;
    if (!target.inisials[alias]) target.inisials[alias] = [];
    if (item.tujuan && String(item.tujuan).trim().length > 0) {
      target.inisials[alias].push({ id: item.id, tujuan: item.tujuan });
    }
    return acc;
  }, []);

  const existingCompanies = Array.from(
    new Set(safeDataRitel.map((item) => item.namaPt)),
  ).sort();
  const allCompanyOptions = Array.from(
    new Set([...Object.keys(companyMapping), ...existingCompanies]),
  ).sort();

  const filteredData = groupedData.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.namaPt.toLowerCase().includes(term) ||
      Object.keys(item.inisials).some((a) => a.toLowerCase().includes(term))
    );
  });

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
      const workbook = XLSX.read(event.target?.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      if (!jsonData.length) {
        setBulkResult({
          text: "File Excel kosong atau tidak ada data di sheet pertama.",
          type: "error",
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
        setBulkResult({
          text: `Format Excel tidak dikenali. Harus ada kolom untuk Nama PT dan Tujuan. Kolom terbaca: ${existingKeys}. Gunakan header: "Nama PT" dan "Tujuan" (atau "Company" / "Destination").`,
          type: "error",
        });
        e.target.value = "";
        return;
      }

      const existingKeySet = new Set(
        safeDataRitel.map(
          (row: any) =>
            `${String(row.namaPt || "")
              .trim()
              .toLowerCase()}|${String(row.inisial || "")
              .trim()
              .toLowerCase()}|${String(row.tujuan || "")
              .trim()
              .toLowerCase()}`,
        ),
      );
      const uploadKeys = jsonData.map((row) => {
        const namaPt = getCellValue(row, namaPtKey);
        const tujuan = getCellValue(row, tujuanKey);
        const inisialKey = findColumnKey(row, inisialAliases);
        const excelInisial = getCellValue(row, inisialKey);
        const inisial = companyMapping[namaPt] ?? (excelInisial || "");
        return `${namaPt.trim().toLowerCase()}|${inisial
          .trim()
          .toLowerCase()}|${tujuan.trim().toLowerCase()}`;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ritel Modern</h1>
          <p className="text-sm text-slate-500 mt-1">Ritel Modern</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload (Excel)
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
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
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((group) => (
              <div
                key={group.displayId}
                className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      {group.namaPt}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {Object.keys(group.inisials).length} inisial
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewAliases({ namaPt: group.namaPt })}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setDeleteCompany(group.namaPt)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                    title="Hapus Company"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editStore && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
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
                    setTimeout(() => {
                      setViewAliases({ namaPt: addStoreFor.namaPt });
                    }, 0);
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
                    setTimeout(() => {
                      setViewAliases({ namaPt: addStoreFor.namaPt });
                    }, 0);
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                    await fetch("/api/ritel", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: deleteStore.id }),
                    });
                    setDeleteStore(null);
                    setDataRitel((prev) =>
                      prev.filter((r) => r.id !== deleteStore.id),
                    );
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                      {pageAliases.map(([alias, stores]) => (
                        <div
                          key={alias}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black tracking-widest uppercase">
                              {alias || "—"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {
                                (stores as { id: string; tujuan: string }[])
                                  .length
                              }{" "}
                              toko
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewAliases(null);
                                setTimeout(() => {
                                  setViewCompany({
                                    namaPt: viewAliases.namaPt,
                                    inisial: alias,
                                    stores: stores as {
                                      id: string;
                                      tujuan: string;
                                    }[],
                                  });
                                }, 0);
                              }}
                              className="p-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                              title="Lihat Toko"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setViewAliases(null);
                                setTimeout(() => {
                                  setAddStoreFor({
                                    namaPt: viewAliases.namaPt,
                                    inisial: alias,
                                  });
                                  setNewStoreForName("");
                                }, 0);
                              }}
                              className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Tambah Toko/DC"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between item-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={22} className="text-blue-600" />
                Tambah Item
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
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Company Name
                </label>
                <Combobox
                  options={allCompanyOptions}
                  value={selectedCompany}
                  onChange={setSelectedCompany}
                  placeholder="Cari atau pilih company..."
                  leftIcon={<Building2 size={16} />}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Inisial
                </label>
                <input
                  name="inisial"
                  type="text"
                  value={inisial}
                  onChange={(e) => setInisial(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <StatefulButton
                  variant="cancel"
                  onClick={() => {
                    setIsModalOpen(false);
                  }}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    const payload = {
                      namaPt: selectedCompany,
                      inisial: inisial,
                    };
                    const result = await saveRitel(payload);
                    setIsModalOpen(false);
                    setSelectedCompany("");
                    setDataRitel((prev) => [result, ...prev]);
                  }}
                  className="flex-1"
                >
                  Simpan Data
                </StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inisial Modal */}
      {editCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditCompany(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Edit Inisial - {editCompany.namaPt}
              </h3>
              <button
                onClick={() => setEditCompany(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
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
                          namaPt: editCompany.namaPt,
                          inisial: editCompany.inisial,
                        }),
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        alert(j?.error || "Gagal update inisial");
                        return;
                      }
                      // Update state
                      setDataRitel((prev) =>
                        prev.map((x: any) =>
                          x.namaPt.toLowerCase() ===
                          editCompany.namaPt.toLowerCase()
                            ? { ...x, inisial: editCompany.inisial }
                            : x,
                        ),
                      );
                      setEditCompany(null);
                    } catch {
                      alert("Gagal update inisial");
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                    setTimeout(() => {
                      setViewAliases({ namaPt: viewCompany.namaPt });
                    }, 0);
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
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2"
                        >
                          <Store size={14} className="text-amber-600" />
                          <span className="text-sm font-bold text-slate-700">
                            {s.tujuan}
                          </span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                    const res = await fetch("/api/ritel", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ namaPt: deleteCompany }),
                    });
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
