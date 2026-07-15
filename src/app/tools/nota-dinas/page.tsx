"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  Download,
  RotateCcw,
  Eye,
  Edit3,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import {
  NdFormData,
  PiutangRow,
  getDefaultNdFormData,
  generateNdWord,
} from "@/lib/generateNdWord";
import { generateNdPdf } from "@/lib/generateNdPdf";

// --- Field config for the form ---
interface FieldConfig {
  key: keyof Omit<NdFormData, "list_piutang">;
  label: string;
  placeholder: string;
  group: string;
  type?: "text" | "textarea";
}

const fieldConfigs: FieldConfig[] = [
  // Header
  {
    key: "nomor_surat",
    label: "Nomor Surat",
    placeholder: "/DB602/07/2026",
    group: "Header Surat",
  },
  {
    key: "det_perihal",
    label: "Perihal",
    placeholder: "Permohonan Persetujuan Pembukaan Credit Limit...",
    group: "Header Surat",
    type: "textarea",
  },
  // Realisasi Penjualan
  {
    key: "tgl_input",
    label: "Tanggal Input",
    placeholder: "29 Juni 2026",
    group: "Realisasi Penjualan",
  },
  {
    key: "nominal_teks_1",
    label: "Realisasi Penjualan UB Industri",
    placeholder: "Rp650 Miliar",
    group: "Realisasi Penjualan",
  },
  {
    key: "nominal_teks",
    label: "Kontribusi Penjualan Ritel Modern",
    placeholder: "Rp368,31 Miliar",
    group: "Realisasi Penjualan",
  },
  {
    key: "percentage",
    label: "Persentase Kontribusi",
    placeholder: "(56,66%)",
    group: "Realisasi Penjualan",
  },
  {
    key: "qty",
    label: "Qty (Ton)",
    placeholder: "28.912",
    group: "Realisasi Penjualan",
  },
  // Posisi Piutang
  {
    key: "nominal_teks_2",
    label: "Total Piutang Eksternal",
    placeholder: "Rp149,74 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_3",
    label: "Piutang < 30 Hari",
    placeholder: "Rp137,39 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_4",
    label: "Piutang > 30 Hari",
    placeholder: "Rp12,35 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_5",
    label: "Belum Bank Reconcile",
    placeholder: "Rp54,89 Miliar",
    group: "Posisi Piutang",
  },
  {
    key: "nominal_teks_6",
    label: "Saldo Piutang Bersih",
    placeholder: "Rp94,85 Miliar",
    group: "Posisi Piutang",
  },
];

// Group fields for accordion display
function groupFields(fields: FieldConfig[]): Record<string, FieldConfig[]> {
  const grouped: Record<string, FieldConfig[]> = {};
  for (const f of fields) {
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  }
  return grouped;
}

export default function NotaDinasPage() {
  const [formData, setFormData] = useState<NdFormData>(getDefaultNdFormData());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Header Surat": true,
    "Realisasi Penjualan": true,
    "Posisi Piutang": true,
    "Tabel Piutang": true,
  });
  const [previewMode, setPreviewMode] = useState(true); // true = preview, false = form only (mobile)

  const grouped = groupFields(fieldConfigs);

  const handleChange = useCallback(
    (key: keyof Omit<NdFormData, "list_piutang">, value: string) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setFormData(getDefaultNdFormData());
  }, []);

  const handleAddPiutangRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      list_piutang: [
        ...prev.list_piutang,
        {
          tgl_input: "",
          tbl_1_30: "",
          tbl_2_30: "",
          total: "",
          tbl_cash_in: "",
          tbl_net_piutang: "",
          tbl_sales: "",
          tbl_ars: "",
        },
      ],
    }));
  }, []);

  const handleRemovePiutangRow = useCallback((index: number) => {
    setFormData((prev) => {
      const newRows = [...prev.list_piutang];
      newRows.splice(index, 1);
      return { ...prev, list_piutang: newRows };
    });
  }, []);

  const handlePiutangChange = useCallback((index: number, field: keyof PiutangRow, value: string) => {
    setFormData((prev) => {
      const newRows = [...prev.list_piutang];
      newRows[index] = { ...newRows[index], [field]: value };
      return { ...prev, list_piutang: newRows };
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      await generateNdWord(formData);
    } catch (err: any) {
      alert(err?.message || "Gagal generate dokumen Word");
    } finally {
      setIsGenerating(false);
    }
  }, [formData]);

  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      await generateNdPdf(formData);
    } catch (err: any) {
      alert(err?.message || "Gagal generate dokumen PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [formData]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Nota Dinas Generator
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ND Pengajuan Credit Limit
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile toggle */}
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {previewMode ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isGenerating ? "Generating..." : "Download Word"}</span>
                <span className="sm:hidden">Word</span>
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isGeneratingPdf ? "Generating..." : "Cetak PDF"}</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split Screen Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
          {/* Left: Preview */}
          <div
            className={`lg:flex-1 lg:block ${previewMode ? "block" : "hidden"} overflow-auto`}
          >
            <div className="sticky top-0">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 flex items-start justify-center min-h-[600px] overflow-auto">
                <NdPreview formData={formData} />
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div
            className={`lg:w-[420px] xl:w-[460px] lg:block ${!previewMode ? "block" : "hidden"} overflow-auto`}
          >
            <div className="space-y-3">
              {Object.entries(grouped).map(([group, fields]) => (
                <div
                  key={group}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {group}
                    </span>
                    {openGroups[group] ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Fields */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      openGroups[group]
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                  >
                    <div className="p-4 space-y-4">
                      {fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                            {field.label}
                          </label>
                          {field.type === "textarea" ? (
                            <textarea
                              value={formData[field.key]}
                              onChange={(e) =>
                                handleChange(field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                              rows={2}
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all resize-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                          ) : (
                            <input
                              type="text"
                              value={formData[field.key]}
                              onChange={(e) =>
                                handleChange(field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Dynamic Piutang Table Form */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleGroup("Tabel Piutang")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Tabel Piutang
                  </span>
                  {openGroups["Tabel Piutang"] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    openGroups["Tabel Piutang"]
                      ? "max-h-[3000px] opacity-100"
                      : "max-h-0 opacity-0 overflow-hidden"
                  }`}
                >
                  <div className="p-4 space-y-6">
                    {formData.list_piutang.map((row, index) => (
                      <div key={index} className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 relative">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                          <h4 className="text-xs font-semibold text-slate-500">Baris {index + 1}</h4>
                          {formData.list_piutang.length > 1 && (
                            <button
                              onClick={() => handleRemovePiutangRow(index)}
                              className="text-rose-500 hover:text-rose-600 p-1"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Tanggal / Info</label>
                            <input
                              type="text"
                              value={row.tgl_input}
                              onChange={(e) => handlePiutangChange(index, "tgl_input", e.target.value)}
                              placeholder="29 Juni 2026 atau Sudah Terbayar"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">1 - 30 Hari (Rp)</label>
                            <input
                              type="text"
                              value={row.tbl_1_30}
                              onChange={(e) => handlePiutangChange(index, "tbl_1_30", e.target.value)}
                              placeholder="137.386"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">&gt;30 Hari (Rp)</label>
                            <input
                              type="text"
                              value={row.tbl_2_30}
                              onChange={(e) => handlePiutangChange(index, "tbl_2_30", e.target.value)}
                              placeholder="12.354"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Total (Rp)</label>
                            <input
                              type="text"
                              value={row.total}
                              onChange={(e) => handlePiutangChange(index, "total", e.target.value)}
                              placeholder="149.740"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">CASH IN (Outstndg)</label>
                            <input
                              type="text"
                              value={row.tbl_cash_in}
                              onChange={(e) => handlePiutangChange(index, "tbl_cash_in", e.target.value)}
                              placeholder="54.887"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">NET PIUTANG (Rp)</label>
                            <input
                              type="text"
                              value={row.tbl_net_piutang}
                              onChange={(e) => handlePiutangChange(index, "tbl_net_piutang", e.target.value)}
                              placeholder="94.853"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Sales (Rp)</label>
                            <input
                              type="text"
                              value={row.tbl_sales}
                              onChange={(e) => handlePiutangChange(index, "tbl_sales", e.target.value)}
                              placeholder="650.003"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">%AR vs Sales</label>
                            <input
                              type="text"
                              value={row.tbl_ars}
                              onChange={(e) => handlePiutangChange(index, "tbl_ars", e.target.value)}
                              placeholder="15%"
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-slate-700 dark:text-slate-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleAddPiutangRow}
                      className="w-full flex justify-center items-center gap-1 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Tambah Baris
                    </button>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 rounded-xl p-4">
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>💡 Tips:</strong> Isi semua field yang diperlukan, lalu
                  klik tombol <strong>&quot;Download Word&quot;</strong> untuk
                  men-generate dokumen Nota Dinas. Preview di sebelah kiri akan
                  menunjukkan simulasi isi surat secara realtime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Preview Component (left side) ---
function NdPreview({ formData }: { formData: NdFormData }) {
  const highlight = (val: string, placeholder: string, normal?: boolean) => {
    if (!val)
      return (
        <span className="text-rose-400 italic text-[10px]">
          [{placeholder}]
        </span>
      );
    if (normal) return <span>{val}</span>;
    return <span className="text-blue-700 dark:text-blue-400 font-semibold">{val}</span>;
  };

  return (
    <div
      className="bg-white shadow-2xl rounded-lg w-full max-w-[680px] mx-auto"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        lineHeight: "1.6",
        color: "#1a1a1a",
        aspectRatio: "1/1.414",
        padding: "48px 56px",
        position: "relative",
      }}
    >
      {/* Kop Surat */}
      <div className="text-center mb-4">
        <div
          className="font-bold"
          style={{ fontSize: "18px", letterSpacing: "2px" }}
        >
          NOTA DINAS
        </div>
      </div>

      {/* Header Fields */}
      <div className="mb-4" style={{ fontSize: "12px", paddingLeft: "28%" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td className="align-top" style={{ width: "90px", padding: "1px 0" }}>
                Nomor
              </td>
              <td className="align-top" style={{ width: "16px", padding: "1px 0" }}>
                :
              </td>
              <td className="align-top" style={{ padding: "1px 0" }}>
                {highlight(formData.nomor_surat, "Nomor Surat", true)}
              </td>
            </tr>
            <tr>
              <td className="align-top" style={{ padding: "1px 0" }}>
                Kepada Yth
              </td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top" style={{ padding: "1px 0" }}>
                Direktur Pemasaran
              </td>
            </tr>
            <tr>
              <td className="align-top" style={{ padding: "1px 0" }}>Dari</td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top" style={{ padding: "1px 0" }}>
                GM UB Industri
              </td>
            </tr>
            <tr>
              <td className="align-top" style={{ padding: "1px 0" }}>
                Perihal
              </td>
              <td className="align-top" style={{ padding: "1px 0" }}>:</td>
              <td className="align-top" style={{ padding: "1px 0" }}>
                {highlight(formData.det_perihal, "Perihal", true)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className="mb-4 mt-2"
        style={{
          borderTop: "3px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          height: "6px",
          boxSizing: "border-box",
        }}
      />

      {/* Body */}
      <div style={{ fontSize: "12px", textAlign: "justify" }}>
        <p className="mb-2">
          Sehubungan dengan adanya transaksi penjualan Tunda Bayar dengan Ritel
          Modern di UB Industri, bersama ini kami sampaikan hal-hal sebagai
          berikut:
        </p>

        <ol className="list-decimal pl-5 space-y-2 mb-3">
          <li>
            Seluruh transaksi penjualan dengan Ritel Modern sebagaimana <em>business
            as usual</em> di lingkungan tersebut, dilakukan menggunakan mekanisme
            Tunda Bayar dengan <em>Term of Payment</em> (TOP) maksimal 30 hari kalender
            atau lebih lanjut diatur dalam PJB, dimana hal tersebut juga berlaku bagi Perusahaan lain
            yang menjadi supplier Ritel Modern.
          </li>
          <li>
            Sebagaimana Peraturan Direksi (PD) nomor PD-13/DB100/03/2025 tanggal
            7 Maret 2025 tentang Penjualan Komoditas Komersial tertuang bahwa:
            <div className="mt-2 ml-2 space-y-2">
              <p>
                <strong>Pasal 11 ayat (1)</strong> : Tunda Bayar dapat diberikan kepada saluran penjualan
                Distributor yang dilakukan secara kontrak terpusat, Unit Bisnis Perusahaan, Mitra
                Penjualan Ekspor, <strong>jaringan ritel</strong>, dan Penjualan Langsung selain Pasar Rakyat
                dan perorangan.
              </p>
              <p>
                <strong>Pasal 11 ayat (14)</strong> : Perusahaan dapat melayani transaksi penjualan kepada
                pembeli yang masih memiliki tunggakan pembayaran (hutang penjualan) dengan
                persetujuan Kantor Pusat dengan ketentuan sebagai berikut:
              </p>
              <ol className="list-[lower-alpha] pl-5 space-y-1">
                <li>
                  Merupakan transaksi kontrak terpusat dimana pelayanan penjualannya
                  dilakukan di Kanwil/Kanca;
                </li>
                <li>
                  Transaksi dengan saluran penjualan <strong>ritel modern</strong>/horeka, Kementerian,
                  Lembaga, BUMN/BUMD, Satuan kerja perangkat daerah/instansi lainnya, Unit
                  Bisnis Perusahaan dan Mitra Penjualan Ekspor yang memiliki ketentuan <em>term
                  of payment</em> (TOP) dan diatur dalam PJB/Kontrak/trading term.
                </li>
              </ol>
            </div>
          </li>
          <li>
            Per tanggal{" "}
            {highlight(formData.tgl_input, "Tanggal")} realisasi
            penjualan UB Industri sebesar{" "}
            {highlight(formData.nominal_teks_1, "Nominal Realisasi")},
            kontribusi penjualan Ritel Modern sebesar{" "}
            {highlight(formData.nominal_teks, "Nominal Ritel Modern")}{" "}
            {highlight(formData.percentage, "Persentase")} atau setara{" "}
            {highlight(formData.qty, "Qty Ton")} Ton Beras Premium.
          </li>
          <li>
            Posisi Piutang ke eksternal (non Perum BULOG) per tanggal{" "}
            {highlight(formData.tgl_input, "Tanggal")} adalah sebesar{" "}
            {highlight(formData.nominal_teks_2, "Piutang Eksternal")}, jumlah
            piutang kurang dari 30 Hari sebesar{" "}
            {highlight(formData.nominal_teks_3, "Piutang < 30hr")} dan jumlah
            piutang lebih dari 30 Hari sebesar{" "}
            {highlight(formData.nominal_teks_4, "Piutang > 30hr")}. Terdapat
            pembayaran yang belum dilakukan <em>bank reconcile</em> sebesar{" "}
            {highlight(formData.nominal_teks_5, "Belum Rekon")}, maka saldo
            piutang bersih adalah sebesar{" "}
            {highlight(formData.nominal_teks_6, "Saldo Bersih")}. Rincian piutang sebagai
            berikut (dalam jutaan rupiah):
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-[9px] text-center" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr className="bg-[#daeef3]">
                    <th colSpan={4} className="border border-slate-800 p-1 font-semibold">AGED RECEIVABLE EKSTERN</th>
                    <th className="border border-slate-800 p-1 font-semibold">CASH IN (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold">NET PIUTANG (INC UNRECONCILE)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Sales</th>
                    <th rowSpan={2} className="border border-slate-800 p-1 font-semibold w-[60px]">%AR vs<br/>SALES</th>
                  </tr>
                  <tr className="bg-[#daeef3]">
                    <th className="border border-slate-800 p-1 font-semibold">TANGGAL</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">1 - 30 HARI (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">&gt;30 Hari (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold w-[70px]">Total (Rp)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Outstanding Payment<br/>(UNRECONCILE)</th>
                    <th className="border border-slate-800 p-1 font-semibold">Rp</th>
                    <th className="border border-slate-800 p-1 font-semibold">Rp</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.list_piutang.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-800 p-1 text-left whitespace-nowrap">{highlight(row.tgl_input, "Tgl/Info", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_1_30, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_2_30, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.total, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_cash_in, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_net_piutang, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_sales, "-", true)}</td>
                      <td className="border border-slate-800 p-1">{highlight(row.tbl_ars, "-", true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Kondisi Piutang lebih dari 30 Hari dikarenakan beberapa hal yaitu
              adanya proses rekonsiliasi uang masuk, adanya kekurangan kelengkapan
              dokumen seperti Faktur Pajak (sentralisasi Kantor Pusat), Manajemen Retur, Invoice, Surat Jalan
              dan Kwitansi sehingga mengakibatkan keterlambatan penagihan.
            </p>
          </li>
          <li>
            Adapun proses penagihan dan koordinasi terus dilakukan agar proses
            pembayaran segera terealisasi.
          </li>
          <li>
            Melanjutkan <em>Purchase Order</em> dari Ritel Modern, terdapat pesanan yang
            memerlukan persetujuan pembukaan <em>Credit Limit</em> pada ERP BULOG diantaranya:
            <div className="mt-2 text-slate-400 italic text-[10px]">
              [Data Batch Credit Limit - akan diintegrasikan]
            </div>
          </li>
        </ol>

        <p className="mb-2">
          Sehubungan dengan hal tersebut di atas, kami mohon persetujuan Bapak
          untuk pembukaan credit limit PO tersebut pada ERP BULOG.
        </p>
        <p className="mb-4">
          Demikian disampaikan, atas persetujuan Bapak kami ucapkan terima kasih.
        </p>
      </div>

      {/* Footer - Signature */}
      <div className="mt-6" style={{ fontSize: "12px" }}>
        <div className="text-right">
          <p className="mb-8">Jakarta, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {formData.tgl_input ? formData.tgl_input.split(" ")[1] : ""} 2026</p>
          <p className="font-bold">FRIMA AGUNG NITIPRAJA</p>
          <p>GM UB Industri</p>
        </div>
      </div>

      {/* Tembusan */}
      <div className="mt-4" style={{ fontSize: "12px" }}>
        <p className="font-bold mb-1">Tembusan Yth:</p>
        <ol className="list-decimal pl-4 text-slate-600">
          <li>Ka SPI Wilayah Kanpus</li>
          <li>Kadiv Penjualan Pasar Umum</li>
          <li>Kadiv TI</li>
        </ol>
      </div>
    </div>
  );
}
