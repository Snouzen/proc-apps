import React from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { NdFormData, PiutangRow } from "@/lib/generateNdWord";
import { fieldConfigs, groupFields } from "../types";

interface NdFormAccordionProps {
  formData: NdFormData;
  handleChange: (key: keyof Omit<NdFormData, "list_piutang">, value: string) => void;
  openGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
  handleAddPiutangRow: () => void;
  handleRemovePiutangRow: (index: number) => void;
  handlePiutangChange: (index: number, field: keyof PiutangRow, value: string) => void;
}

export default function NdFormAccordion({
  formData,
  handleChange,
  openGroups,
  toggleGroup,
  handleAddPiutangRow,
  handleRemovePiutangRow,
  handlePiutangChange,
}: NdFormAccordionProps) {
  const grouped = groupFields(fieldConfigs);

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([group, fields]) => (
        <div
          key={group}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden"
        >
          {/* Group Header */}
          <button
            type="button"
            onClick={() => toggleGroup(group)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
          type="button"
          onClick={() => toggleGroup("Tabel Piutang")}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
                      type="button"
                      onClick={() => handleRemovePiutangRow(index)}
                      className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
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
              type="button"
              onClick={handleAddPiutangRow}
              className="w-full flex justify-center items-center gap-1 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
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
  );
}
