"use client";

const getXLSX = () => import("xlsx");
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
  Globe2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { saveUnitProduksi } from "@/lib/api";
import { StatefulButton } from "@/components/ui/stateful-button";
import ExcelBulkModal from "@/components/excel-bulk-modal";
import { useAutoRefreshTick } from "@/components/auto-refresh";
import SmoothSelect from "@/components/ui/smooth-select";

export default function UnitProduksiPage() {
  const refreshTick = useAutoRefreshTick();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"addSite" | "addRegional">(
    "addSite",
  );
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
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
  const [siteAlamat, setSiteAlamat] = useState("");
  const [viewedSite, setViewedSite] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [openExcelBulk, setOpenExcelBulk] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  // Data State dari Database (Gue asumsikan lu ambil data lewat useEffect nanti)
  const [dataUnit, setDataUnit] = useState<any[]>([]);
  const [editSite, setEditSite] = useState<{
    regional: string;
    site: string;
    alamat: string;
  } | null>(null);
  const [deleteSite, setDeleteSite] = useState<{
    regional: string;
    site: string;
  } | null>(null);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAlamat, setNewSiteAlamat] = useState("");
  const [newRegionalName, setNewRegionalName] = useState("");

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
    if (!value) return "";
    return value.trim().toUpperCase().replace(/\s+/g, " ");
  };

  // 2. Load Data (Opsional, sesuaikan dengan endpoint lu)
  const loadData = React.useCallback(async () => {
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
  }, [dataUnit.length]);

  useEffect(() => {
    loadData();
  }, [refreshTick, loadData]);

  // 3. Logic Pengelompokan Data (Regional -> Sites)
  const safeDataUnit = Array.isArray(dataUnit) ? dataUnit : [];
  const baseRegions = [
    { id: "REG-1-BANDUNG", nama: "REG 1 BANDUNG", sites: [] as string[] },
    { id: "REG-2-SURABAYA", nama: "REG 2 SURABAYA", sites: [] as string[] },
    { id: "REG-3-MAKASSAR", nama: "REG 3 MAKASSAR", sites: [] as string[] },
  ];

  const groupedData = safeDataUnit.reduce((acc: any[], item: any) => {
    const regionalName = item?.namaRegional ?? item?.regional ?? "";
    const siteObj = {
      name: item?.siteArea ?? item?.site ?? "",
      alamat: item?.alamat ?? "",
    };
    const existingGroup = acc.find((g) => g.nama === regionalName);
    if (existingGroup) {
      existingGroup.sites.push(siteObj);
    } else {
      acc.push({
        id: item?.idRegional ?? regionalName.replace(/\s+/g, "-"),
        nama: regionalName,
        sites: [siteObj],
      });
    }
    return acc;
  }, []);

  const regionalOptions = useMemo(() => {
    return Array.from(new Set(groupedData.map((g: any) => g.nama)))
      .filter(Boolean)
      .map((name: string) => ({ value: name, label: name }));
  }, [groupedData]);

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
      const XLSX = await getXLSX();
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
        showToast(
          "Format Excel Salah! Gunakan Header 'Regional' dan 'Site Area'",
          "error",
        );
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
            const delParams = new URLSearchParams({
              namaRegional: payload.regional,
              siteArea: payload.siteArea,
            }); // REFACTOR: DELETE via query params
            await fetch(`/api/unit-produksi?${delParams.toString()}`, {
              method: "DELETE",
            });
          } catch {}
        }
        await saveUnitProduksi(payload);
      }
      showToast(
        `Bulk Upload selesai. Mode: ${replaceDupes ? "REPLACE" : "SKIP"}.`,
      );
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showToast("Terjadi kesalahan saat upload.", "error");
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

  if (!isMounted) return null;

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
            onClick={() => {
              setContextRegional(null);
              setSelectedRegional("");
              setSiteName("");
              setModalMode("addSite");
              setIsModalOpen(true);
            }}
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
                              setModalMode("addSite");
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
                            {reg.sites.map((site: any, index: number) => (
                              <div
                                key={index}
                                className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3 justify-between shadow-sm group hover:border-indigo-400 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <MapPin size={16} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">
                                    {site.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      setViewedSite({
                                        ...site,
                                        regional: reg.nama,
                                      })
                                    }
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all"
                                    title="View Detail"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditSite({
                                        regional: reg.nama,
                                        site: site.name,
                                        alamat: site.alamat,
                                      });
                                      setNewRegionalName(reg.nama);
                                      setNewSiteName(site.name);
                                      setNewSiteAlamat(site.alamat);
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
                                        site: site.name,
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
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 bg-indigo-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Edit Site Area
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    Update Informasi Site
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditSite(null)}
                className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe2 size={12} /> Regional
                </label>
                <SmoothSelect
                  value={newRegionalName}
                  onChange={(v) => setNewRegionalName(v)}
                  options={regionalOptions}
                  width={400}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={12} /> Nama Site Area
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Edit2 size={12} /> Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  value={newSiteAlamat}
                  onChange={(e) => setNewSiteAlamat(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 resize-none"
                  placeholder="Masukkan alamat lengkap gudang/pabrik..."
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                    if (!newRegionalName || !newSiteName) {
                      showToast("Regional dan Site Area wajib diisi!", "error");
                      return;
                    }
                    try {
                      await fetch("/api/unit-produksi", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          namaRegional: editSite.regional,
                          siteArea: editSite.site,
                          newRegionalName: newRegionalName,
                          newSiteArea: newSiteName,
                          alamat: newSiteAlamat,
                        }),
                      });
                      showToast("Data site berhasil diperbarui! 🚀");
                      setEditSite(null);
                      setDataUnit((prev) =>
                        prev.map((x) =>
                          String(x?.namaRegional) === editSite.regional &&
                          String(x?.siteArea) === editSite.site
                            ? {
                                ...x,
                                namaRegional: newRegionalName,
                                siteArea: newSiteName,
                                alamat: newSiteAlamat,
                              }
                            : x,
                        ),
                      );
                      setTimeout(() => window.location.reload(), 800);
                    } catch {
                      showToast("Gagal memperbarui data.", "error");
                    }
                  }}
                  className="flex-1"
                >
                  Simpan Perubahan
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
                    const delParams = new URLSearchParams({
                      namaRegional: deleteSite.regional,
                      siteArea: deleteSite.site,
                    });
                    const res = await fetch(
                      `/api/unit-produksi?${delParams.toString()}`,
                      {
                        method: "DELETE",
                      },
                    );

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(
                        errorData.error ||
                          errorData.message ||
                          "Gagal menghapus site area.",
                      );
                    }

                    showToast("Site area berhasil dihapus!");
                    await loadData(); // Refresh total agar UI sinkron 100%
                  } catch (error: any) {
                    console.error("Delete Site Error:", error);
                    showToast(
                      error.message || "Gagal menghapus site area",
                      "error",
                    );
                  } finally {
                    setDeleteSite(null);
                  }
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
                {modalMode === "addRegional"
                  ? "Tambah Regional Baru"
                  : contextRegional
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
              <div
                className="relative overflow-hidden"
                style={{
                  minHeight:
                    modalMode === "addSite"
                      ? contextRegional
                        ? "160px"
                        : "190px"
                      : "120px",
                }}
              >
                <div
                  className={`transition-all duration-300 transform ${
                    modalMode === "addSite"
                      ? "translate-x-0 opacity-100 relative"
                      : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                  } space-y-5`}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Globe2 size={12} /> Regional
                    </label>
                    <SmoothSelect
                      value={selectedRegional}
                      onChange={(v) => setSelectedRegional(v)}
                      options={regionalOptions}
                      width={400}
                      disabled={!!contextRegional}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={12} /> Nama Site
                    </label>
                    <input
                      required={modalMode === "addSite"}
                      type="text"
                      placeholder="Contoh: SPP Kendal"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Edit2 size={12} /> Alamat Site Area
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Masukkan alamat lengkap gudang/pabrik..."
                      value={siteAlamat}
                      onChange={(e) => setSiteAlamat(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 resize-none"
                    />
                  </div>

                  {!contextRegional && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegional("");
                        setSiteName("");
                        setModalMode("addRegional");
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium block text-center w-full mt-2"
                    >
                      Add Regional
                    </button>
                  )}
                </div>

                <div
                  className={`transition-all duration-300 transform ${
                    modalMode === "addRegional"
                      ? "translate-x-0 opacity-100 relative"
                      : "translate-x-full opacity-0 absolute inset-0 pointer-events-none"
                  } space-y-5`}
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Nama Regional
                    </label>
                    <input
                      required={modalMode === "addRegional"}
                      type="text"
                      placeholder="Contoh: REG 4 KALIMANTAN"
                      value={selectedRegional}
                      onChange={(e) => setSelectedRegional(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRegional("");
                      setSiteName("");
                      setModalMode("addSite");
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
                    if (
                      modalMode === "addSite" &&
                      (!selectedRegional || !siteName)
                    ) {
                      showToast("Regional dan Site Area wajib diisi!", "error");
                      return;
                    }
                    if (modalMode === "addRegional" && !selectedRegional) {
                      showToast("Nama Regional wajib diisi!", "error");
                      return;
                    }
                    try {
                      const payload = {
                        regional: selectedRegional,
                        siteArea: modalMode === "addRegional" ? "-" : siteName,
                        alamat: modalMode === "addRegional" ? "" : siteAlamat,
                      };
                      const created = await saveUnitProduksi(payload);
                      setIsModalOpen(false);
                      setSelectedRegional("");
                      setSiteName("");
                      setSiteAlamat("");

                      // Biar langsung update di UI, pastikan endpoint mengembalikan raw yg benar
                      const isRegionalExist = dataUnit.some(
                        (d) =>
                          String(d?.namaRegional || d?.regional) ===
                          created?.namaRegional,
                      );
                      setDataUnit((prev) => [...prev, created]);

                      showToast(
                        modalMode === "addRegional"
                          ? `Regional '${created?.namaRegional || payload.regional}' berhasil dibuat!`
                          : `Site '${payload.siteArea}' berhasil ditambahkan!`,
                      );

                      setTimeout(() => window.location.reload(), 1000);
                    } catch (err: any) {
                      showToast(
                        err?.message || "Gagal menyimpan data",
                        "error",
                      );
                    }
                  }}
                  className="flex-1"
                >
                  Simpan {modalMode === "addRegional" ? "Regional" : "Site"}
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
                    const res = await fetch(
                      `/api/unit-produksi?namaRegional=${encodeURIComponent(deleteRegional!)}`,
                      {
                        method: "DELETE",
                      },
                    );

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(
                        errorData.error ||
                          errorData.message ||
                          "Gagal menghapus data. Regional mungkin masih digunakan.",
                      );
                    }

                    showToast("Data regional berhasil dihapus!");
                    await loadData(); // Refresh data dari server agar sinkron
                  } catch (error: any) {
                    console.error("Delete Regional Error:", error);
                    showToast(
                      error.message || "Gagal menghapus regional",
                      "error",
                    );
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
      {viewedSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewedSite(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 bg-indigo-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Detail Site Area
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                    {viewedSite.regional}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="p-2 rounded-xl hover:bg-white text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Nama Site Area
                </label>
                <p className="text-xl font-black text-slate-800">
                  {viewedSite.name}
                </p>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Alamat Lengkap
                </label>
                <p className="text-sm font-semibold text-slate-600 leading-relaxed italic">
                  {viewedSite.alamat || "Alamat belum ditambahkan."}
                </p>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Toast Notification */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-[9999] animate-in fade-in slide-in-from-right-10 duration-500">
          <div
            className={`flex items-center gap-4 px-6 py-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border backdrop-blur-md ${
              toast.type === "error"
                ? "bg-rose-50/90 border-rose-100 text-rose-700"
                : "bg-emerald-50/90 border-emerald-100 text-emerald-700"
            }`}
          >
            <div
              className={`p-2 rounded-2xl ${toast.type === "error" ? "bg-rose-100" : "bg-emerald-100"}`}
            >
              {toast.type === "error" ? (
                <AlertCircle size={24} />
              ) : (
                <CheckCircle2 size={24} />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">
                Notification
              </p>
              <p className="text-sm font-black leading-none">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast({ ...toast, show: false })}
              className="ml-4 p-2 hover:bg-black/5 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
