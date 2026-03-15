"use client";

import * as XLSX from "xlsx";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Edit2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { saveUnitProduksi } from "@/lib/api"; // Pastikan fungsi ini ada di api.ts
import { StatefulButton } from "@/components/ui/stateful-button";
import ExcelBulkModal from "@/components/excel-bulk-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export default function UnitProduksiPage() {
  const refreshTick = useAutoRefreshTick();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewRegional, setViewRegional] = useState<{
    nama: string;
    sites: string[];
  } | null>(null);
  const [deleteRegional, setDeleteRegional] = useState<string | null>(null);
  const [contextRegional, setContextRegional] = useState<string | null>(null);
  const [viewPage, setViewPage] = useState(1);
  useEffect(() => {
    if (viewRegional) setViewPage(1);
  }, [viewRegional]);
  const [bulkDialog, setBulkDialog] = useState<{
    rows: any[];
    dupeCount: number;
    regKey: string | null;
    siteKey: string | null;
  } | null>(null);

  const [selectedRegional, setSelectedRegional] = useState("");
  const [siteName, setSiteName] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  // Data State dari Database (Gue asumsikan lu ambil data lewat useEffect nanti)
  const [dataUnit, setDataUnit] = useState<any[]>([]);
  const [editSite, setEditSite] = useState<{
    regional: string;
    site: string;
  } | null>(null);
  const [deleteSite, setDeleteSite] = useState<{
    regional: string;
    site: string;
  } | null>(null);
  const [newSiteName, setNewSiteName] = useState("");

  // 1. Helper: Cari Header Excel secara fleksibel
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

  // Normalisasi nama regional agar konsisten ke 3 pilihan tetap
  const normalizeRegional = (value: string): string => {
    const v = value.trim().toLowerCase().replace(/\s+/g, " ");
    // Deteksi angka/regional dan kota kunci
    const has1 = /(^|\s)1(\s|$)/.test(v) || v.includes("reg 1");
    const has2 = /(^|\s)2(\s|$)/.test(v) || v.includes("reg 2");
    const has3 = /(^|\s)3(\s|$)/.test(v) || v.includes("reg 3");
    const bdg = v.includes("bandung");
    const sby = v.includes("surabaya");
    const mks = v.includes("makassar");

    if (has1 || bdg) return "REG 1 BANDUNG";
    if (has2 || sby) return "REG 2 SURABAYA";
    if (has3 || mks) return "REG 3 MAKASSAR";
    // Fallback: coba regex "reg x <nama>"
    const m = v.match(/reg\s*([123])/);
    if (m) {
      if (m[1] === "1") return "REG 1 BANDUNG";
      if (m[1] === "2") return "REG 2 SURABAYA";
      if (m[1] === "3") return "REG 3 MAKASSAR";
    }
    // Jika tidak terdeteksi, kembalikan apa adanya (akan tetap tampil)
    return value;
  };

  // 2. Load Data (Opsional, sesuaikan dengan endpoint lu)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading((v) => v || dataUnit.length === 0);
      try {
        const res = await fetch("/api/unit-produksi");
        const result = await res.json();
        setDataUnit(Array.isArray(result) ? result : result.data || []);
      } catch (err) {
        console.error("Gagal load unit produksi:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshTick]);

  // 3. Logic Pengelompokan Data (Regional -> Sites)
  const safeDataUnit = Array.isArray(dataUnit) ? dataUnit : [];
  const baseRegions = [
    { id: "REG-1-BANDUNG", nama: "REG 1 BANDUNG", sites: [] as string[] },
    { id: "REG-2-SURABAYA", nama: "REG 2 SURABAYA", sites: [] as string[] },
    { id: "REG-3-MAKASSAR", nama: "REG 3 MAKASSAR", sites: [] as string[] },
  ];

  const groupedData = safeDataUnit.reduce(
    (acc: any[], item: any) => {
      const regionalName = item?.namaRegional ?? item?.regional ?? "";
      const site = item?.siteArea ?? item?.site ?? "";
      const existingGroup = acc.find((g) => g.nama === regionalName);
      if (existingGroup) {
        existingGroup.sites.push(site);
      } else {
        acc.push({
          id: item?.idRegional ?? regionalName.replace(/\s+/g, "-"), // gunakan id jika ada
          nama: regionalName,
          sites: [site],
        });
      }
      return acc;
    },
    [...baseRegions],
  );

  // 4. Search & Pagination Logic
  const filteredData = groupedData.filter(
    (item: any) =>
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sites.some((s: string) =>
        s.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const workbook = XLSX.read(event.target?.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      if (!jsonData.length) return alert("File Kosong!");

      const regionalAliases = ["regional", "region", "reg"];
      const siteAreaAliases = [
        "site area",
        "sitearea",
        "lokasi",
        "unit",
        "site",
      ];

      const regKey = findColumnKey(jsonData[0], regionalAliases);
      const siteKey = findColumnKey(jsonData[0], siteAreaAliases);

      if (!regKey || !siteKey) {
        alert("Format Excel Salah! Gunakan Header 'Regional' dan 'Site Area'");
        return;
      }

      const existingKeySet = new Set(
        (safeDataUnit || []).map(
          (row: any) =>
            `${String(row.namaRegional || row.regional || "")
              .trim()
              .toLowerCase()}|${String(row.siteArea || row.site || "")
              .trim()
              .toLowerCase()}`,
        ),
      );
      const uploadKeys = jsonData.map((row) => {
        const r = normalizeRegional(getCellValue(row, regKey));
        const s = getCellValue(row, siteKey);
        return `${r.trim().toLowerCase()}|${s.trim().toLowerCase()}`;
      });
      const dupeCount = uploadKeys.filter((k) => existingKeySet.has(k)).length;
      setBulkDialog({
        rows: jsonData,
        dupeCount,
        regKey,
        siteKey,
      });

      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };
  const executeUnitBulk = async (replaceDupes: boolean) => {
    if (!bulkDialog) return;
    const { rows, dupeCount, regKey, siteKey } = bulkDialog;
    const existingKeySet = new Set(
      (Array.isArray(dataUnit) ? dataUnit : []).map(
        (row: any) =>
          `${String(row.namaRegional || row.regional || "")
            .trim()
            .toLowerCase()}|${String(row.siteArea || row.site || "")
            .trim()
            .toLowerCase()}`,
      ),
    );
    setIsLoading(true);
    try {
      for (const row of rows) {
        const payload = {
          regional: normalizeRegional(getCellValue(row, regKey)),
          siteArea: getCellValue(row, siteKey),
        };
        const key = `${payload.regional.trim().toLowerCase()}|${payload.siteArea
          .trim()
          .toLowerCase()}`;
        const isDupe = existingKeySet.has(key);
        if (isDupe && !replaceDupes) {
          continue;
        }
        if (isDupe && replaceDupes) {
          try {
            await fetch("/api/unit-produksi", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                namaRegional: payload.regional,
                siteArea: payload.siteArea,
              }),
            });
          } catch {}
        }
        await saveUnitProduksi(payload);
      }
      alert(
        `Bulk Upload selesai.\nDuplikat: ${dupeCount}.\nMode: ${replaceDupes ? "REPLACE" : "SKIP"}.`,
      );
      window.location.reload();
    } catch (error) {
      alert("Terjadi kesalahan saat upload.");
    } finally {
      setIsLoading(false);
      setBulkDialog(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveUnitProduksi({
        regional: selectedRegional,
        siteArea: siteName,
      });
      alert("Site berhasil ditambahkan!");
      setIsModalOpen(false);
      setSelectedRegional("");
      setSiteName("");
      window.location.reload();
    } catch (error) {
      alert("Gagal simpan data");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Unit Produksi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola Regional dan Site Area
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Add New Site
          </button>
        </div>
      </div>

      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          const loadData = async () => {
            try {
              const res = await fetch("/api/unit-produksi");
              const result = await res.json();
              setDataUnit(Array.isArray(result) ? result : result.data || []);
            } catch {}
          };
          loadData();
        }}
        title="Bulk Upload Unit Produksi"
        variant="unit"
      />
      {/* Search Bar (diseragamkan seperti halaman Produk/Ritel) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Regional atau Site..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-non focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-[13px] uppercase tracking-widest border-b border-gray-50">
                <th className="px-6 py-4 font-semibold w-32">ID</th>
                <th className="px-6 py-4 font-semibold">Nama Regional</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    {isLoading ? (
                      <div className="py-6 flex items-center justify-center">
                        <div className="scale-75">
                          {/* Inline loader */}
                          <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-neutral-900">
                            <svg
                              className="absolute w-20 h-20"
                              viewBox="0 0 100 100"
                            >
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
                              <MapPin size={24} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      "Data tidak ditemukan."
                    )}
                  </td>
                </tr>
              ) : (
                currentItems.map((reg) => (
                  <React.Fragment key={reg.id}>
                    <tr className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-5 text-sm font-medium text-slate-400">
                        {reg.id.substring(0, 10)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleRow(reg.id)}
                            className="text-gray-400 hover:text-blue-600 transition-all"
                          >
                            {expandedRows.includes(reg.id) ? (
                              <ChevronDown
                                size={20}
                                className="text-blue-600"
                              />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                          <span
                            className="text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => toggleRow(reg.id)}
                          >
                            {reg.nama}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() =>
                              setViewRegional({
                                nama: reg.nama,
                                sites: reg.sites,
                              })
                            }
                            className="p-2 text-gray-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setContextRegional(reg.nama);
                              setSelectedRegional(reg.nama);
                              setSiteName("");
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                            title="Tambah Site"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteRegional(reg.nama)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                            title="Hapus Regional"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedRows.includes(reg.id) && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={3} className="px-16 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
                            {reg.sites.map((site: string, index: number) => (
                              <div
                                key={index}
                                className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3 justify-between shadow-sm group hover:border-blue-400 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <MapPin size={16} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">
                                    {site}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditSite({ regional: reg.nama, site });
                                      setNewSiteName(site);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                                    title="Edit Site"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteSite({
                                        regional: reg.nama,
                                        site,
                                      })
                                    }
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                                    title="Hapus Site"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
                        Regional
                      </th>
                      <th className="p-2 font-medium text-slate-500">
                        Site Area
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkDialog.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-slate-700">
                          {normalizeRegional(
                            getCellValue(row, bulkDialog.regKey),
                          )}
                        </td>
                        <td className="p-2 text-slate-700">
                          {getCellValue(row, bulkDialog.siteKey)}
                        </td>
                      </tr>
                    ))}
                    {bulkDialog.rows.length > 5 && (
                      <tr>
                        <td
                          colSpan={2}
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
                      onClick={() => executeUnitBulk(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                    >
                      Replace Duplikat
                    </button>
                    <button
                      onClick={() => executeUnitBulk(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      Skip Duplikat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => executeUnitBulk(false)}
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

      {editSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditSite(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Ubah Nama Site
              </h3>
              <button
                onClick={() => setEditSite(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Regional: <span className="font-bold">{editSite.regional}</span>
              </p>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
              <div className="flex gap-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditSite(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      await fetch("/api/unit-produksi", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          namaRegional: editSite.regional,
                          siteArea: editSite.site,
                          newSiteArea: newSiteName,
                        }),
                      });
                      setEditSite(null);
                      setDataUnit((prev) =>
                        prev.map((x) =>
                          String(x?.namaRegional) === editSite.regional &&
                          String(x?.siteArea) === editSite.site
                            ? { ...x, siteArea: newSiteName }
                            : x,
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

      {deleteSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteSite(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus Site?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {deleteSite.site} di {deleteSite.regional}
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <StatefulButton
                variant="cancel"
                onClick={() => setDeleteSite(null)}
              >
                Batal
              </StatefulButton>
              <StatefulButton
                variant="submit"
                onClick={async () => {
                  try {
                    await fetch("/api/unit-produksi", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        namaRegional: deleteSite.regional,
                        siteArea: deleteSite.site,
                      }),
                    });
                    setDeleteSite(null);
                    setDataUnit((prev) =>
                      prev.filter(
                        (x) =>
                          !(
                            String(x?.namaRegional) === deleteSite.regional &&
                            String(x?.siteArea) === deleteSite.site
                          ),
                      ),
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

      {/* Pagination UI */}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-slate-800">
                {contextRegional
                  ? `Tambah Site ke ${contextRegional}`
                  : "Tambah Site Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Regional
                </label>
                <select
                  required
                  value={selectedRegional}
                  onChange={(e) => setSelectedRegional(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm appearance-none cursor-pointer"
                  disabled={!!contextRegional}
                >
                  <option value="">Pilih Regional</option>
                  <option value="REG 1 BANDUNG">REG 1 BANDUNG</option>
                  <option value="REG 2 SURABAYA">REG 2 SURABAYA</option>
                  <option value="REG 3 MAKASSAR">REG 3 MAKASSAR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nama Site
                </label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: SPP Kendal"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                    const created = await saveUnitProduksi({
                      regional: selectedRegional,
                      siteArea: siteName,
                    });
                    setIsModalOpen(false);
                    setSelectedRegional("");
                    setSiteName("");
                    setDataUnit((prev) => [...prev, created]);
                  }}
                  className="flex-1"
                >
                  Simpan Site
                </StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewRegional && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewRegional(null)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Regional: {viewRegional.nama}
              </h3>
              <button
                onClick={() => setViewRegional(null)}
                className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {(() => {
                const perPage = 5;
                const total = viewRegional.sites.length;
                const totalPages = Math.max(1, Math.ceil(total / perPage));
                const start = (viewPage - 1) * perPage;
                const end = Math.min(start + perPage, total);
                const pageSites = viewRegional.sites.slice(start, end);
                return (
                  <>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pageSites.map((s, i) => (
                        <li
                          key={`${start}-${i}`}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2"
                        >
                          <MapPin size={14} className="text-blue-600" />
                          <span className="text-sm font-bold text-slate-700">
                            {s}
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

      {/* Delete Confirm */}
      {deleteRegional && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteRegional(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50 bg-rose-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Hapus semua site di {deleteRegional}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus seluruh site pada regional tersebut.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteRegional(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/unit-produksi", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ namaRegional: deleteRegional }),
                    });
                    const j = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      alert(j?.error || "Gagal menghapus data");
                      return;
                    }
                    // Refresh local state
                    setDataUnit((prev) =>
                      prev.filter(
                        (x: any) => x?.namaRegional !== deleteRegional,
                      ),
                    );
                  } catch {
                    alert("Gagal menghapus data");
                  } finally {
                    setDeleteRegional(null);
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
    </div>
  );
}
