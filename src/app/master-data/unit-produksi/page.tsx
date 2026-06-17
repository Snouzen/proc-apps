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
import dynamic from "next/dynamic";
const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), { ssr: false });
import { useAutoRefreshTick } from "@/components/auto-refresh";
import SmoothSelect from "@/components/ui/smooth-select";
import { DataTable } from "@/components/data-table";

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
  const [siteManager, setSiteManager] = useState("");
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
    managerOperasional?: string;
  } | null>(null);
  const [deleteSite, setDeleteSite] = useState<{
    regional: string;
    site: string;
  } | null>(null);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAlamat, setNewSiteAlamat] = useState("");
  const [newSiteManager, setNewSiteManager] = useState("");
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
      managerOperasional: item?.managerOperasional ?? "",
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

  // Sort grouped data alphabetically (A-Z) by regional name
  groupedData.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
  // Sort sites within each regional alphabetically by site name
  groupedData.forEach((group: any) => {
    group.sites.sort((a: any, b: any) => a.name.localeCompare(b.name));
  });

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
        alamat: siteAlamat,
        managerOperasional: siteManager,
      });
      alert("Site berhasil ditambahkan!");
      setIsModalOpen(false);
      setSelectedRegional("");
      setSiteName("");
      setSiteAlamat("");
      setSiteManager("");
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Unit Produksi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
            suppressHydrationWarning
            onClick={() => {
              setContextRegional(null);
              setSelectedRegional("");
              setSiteName("");
              setModalMode("addSite");
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-sm active:scale-95 text-sm"
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
      <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            size={18}
          />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari Regional atau Site..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <DataTable
          rowKey={(r: any) => r.id}
          columns={[
            {
              key: "id",
              label: "ID",
              width: "w-32",
              render: (_v: any, reg: any) => (
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {reg.id.substring(0, 10)}
                </span>
              )
            },
            {
              key: "nama",
              label: "Nama Regional",
              render: (_v: any, reg: any) => (
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRow(reg.id); }}
                    className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-indigo-400 transition-all"
                  >
                    {expandedRows.includes(reg.id) ? (
                      <ChevronDown size={20} className="text-blue-600 dark:text-indigo-400" />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                  <span
                    className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-indigo-400 transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleRow(reg.id); }}
                  >
                    {reg.nama}
                  </span>
                </div>
              )
            },
            {
              key: "actions",
              label: "Action",
              align: "center",
              width: "w-48",
              render: (_v: any, reg: any) => (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewRegional({
                        nama: reg.nama,
                        sites: reg.sites,
                      });
                    }}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                    title="View"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextRegional(reg.nama);
                      setSelectedRegional(reg.nama);
                      setSiteName("");
                      setModalMode("addSite");
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-indigo-400 rounded-lg hover:bg-blue-50 dark:hover:bg-indigo-500/10 transition-all"
                    title="Tambah Site"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteRegional(reg.nama); }}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400 rounded-lg hover:bg-red-50 dark:hover:bg-rose-500/10 transition-all"
                    title="Hapus Regional"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
          data={currentItems}
          loading={isLoading}
          total={filteredData.length}
          page={currentPage}
          rowsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          emptyMessage="Data tidak ditemukan."
          expandedKeys={new Set(expandedRows)}
          onToggleExpand={(id) => toggleRow(id)}
          renderExpandedRow={(reg: any) => (
            <tr className="bg-slate-50/50 dark:bg-slate-900/50">
              <td colSpan={3} className="px-16 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
                  {reg.sites.map((site: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3 justify-between shadow-sm group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <MapPin size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
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
                          className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
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
                              managerOperasional: site.managerOperasional,
                            });
                            setNewRegionalName(reg.nama);
                            setNewSiteName(site.name);
                            setNewSiteAlamat(site.alamat);
                            setNewSiteManager(site.managerOperasional || "");
                          }}
                          className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
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
                          className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400 rounded-lg hover:bg-red-50 dark:hover:bg-rose-500/10 transition-all"
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
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {modalMode === "addRegional"
                  ? "Tambah Regional Baru"
                  : contextRegional
                    ? `Tambah Site ke ${contextRegional}`
                    : "Tambah Site Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500"
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
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Edit2 size={12} /> Manager Operasional
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Manager (Opsional)"
                      value={siteManager}
                      onChange={(e) => setSiteManager(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Edit2 size={12} /> Alamat Site Area
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Masukkan alamat lengkap gudang/pabrik..."
                      value={siteAlamat}
                      onChange={(e) => setSiteAlamat(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 resize-none"
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
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Nama Regional
                    </label>
                    <input
                      required={modalMode === "addRegional"}
                      type="text"
                      placeholder="Contoh: REG 4 KALIMANTAN"
                      value={selectedRegional}
                      onChange={(e) => setSelectedRegional(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
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
                        managerOperasional: modalMode === "addRegional" ? "" : siteManager,
                      };
                      const created = await saveUnitProduksi(payload);
                      setIsModalOpen(false);
                      setSelectedRegional("");
                      setSiteName("");
                      setSiteAlamat("");
                      setSiteManager("");

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

                      await loadData();
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
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Regional: {viewRegional.nama}
              </h3>
              <button
                onClick={() => setViewRegional(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500"
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
                      {pageSites.map((s: any, i: number) => (
                        <li
                          key={`${start}-${i}`}
                          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2"
                        >
                          <MapPin size={14} className="text-blue-600 dark:text-indigo-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {s.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing {total ? start + 1 : 0}–{end} of {total}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewPage((p) => Math.max(p - 1, 1))}
                          disabled={viewPage === 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setViewPage((p) => Math.min(p + 1, totalPages))
                          }
                          disabled={viewPage === totalPages}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
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
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-500/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus semua site di {deleteRegional}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini akan menghapus seluruh site pada regional tersebut.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteRegional(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
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

      {/* Edit Site Modal */}
      {editSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditSite(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Edit Site Area
              </h3>
              <button
                onClick={() => setEditSite(null)}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-6 space-y-5"
            >
              <div className="space-y-4">
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
                    <MapPin size={12} /> Nama Site
                  </label>
                  <input
                    required
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Edit2 size={12} /> Manager Operasional
                  </label>
                  <input
                    type="text"
                    value={newSiteManager}
                    onChange={(e) => setNewSiteManager(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Edit2 size={12} /> Alamat Site Area
                  </label>
                  <textarea
                    rows={2}
                    value={newSiteAlamat}
                    onChange={(e) => setNewSiteAlamat(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <StatefulButton variant="cancel" onClick={() => setEditSite(null)} className="flex-1">Batal</StatefulButton>
                <StatefulButton variant="submit" onClick={async () => {
                  try {
                    const res = await fetch("/api/unit-produksi", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        namaRegional: editSite.regional,
                        siteArea: editSite.site,
                        newRegionalName: newRegionalName,
                        newSiteArea: newSiteName,
                        alamat: newSiteAlamat,
                        managerOperasional: newSiteManager,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || "Gagal update data");
                    }
                    showToast("Data berhasil diupdate!");
                    setEditSite(null);
                    await loadData();
                  } catch (err: any) {
                    showToast(err.message, "error");
                    throw err; // Lempar ulang error agar StatefulButton bisa memunculkan status "Gagal"
                  }
                }} className="flex-1">Simpan</StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Site Confirm */}
      {deleteSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteSite(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-500/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus site {deleteSite.site}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini akan menghapus site tersebut secara permanen.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteSite(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/unit-produksi?namaRegional=${encodeURIComponent(deleteSite.regional)}&siteArea=${encodeURIComponent(deleteSite.site)}`,
                      { method: "DELETE" }
                    );
                    if (!res.ok) throw new Error("Gagal menghapus data.");
                    showToast("Site berhasil dihapus!");
                    setDeleteSite(null);
                    await loadData();
                  } catch (error: any) {
                    showToast(error.message, "error");
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
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    Detail Site Area
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    {viewedSite.regional}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Nama Site Area
                </label>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {viewedSite.name}
                </p>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Manager Operasional
                </label>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  {viewedSite.managerOperasional || "Manager belum ditambahkan."}
                </p>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Alamat Lengkap
                </label>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  {viewedSite.alamat || "Alamat belum ditambahkan."}
                </p>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/20"
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
