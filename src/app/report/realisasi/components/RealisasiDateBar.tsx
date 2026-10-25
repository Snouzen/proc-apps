import React from "react";
import { Calendar, Plus } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";

interface RealisasiDateBarProps {
  selectedDateStr: string;
  onDateChange: (newDate: string) => void;
  minDateStr?: string;
  selectedRecord: any | null;
  matchingDateRecords: any[];
  onSelectRecord: (rec: any) => void;
  recordsCount: number;
  onOpenCreateForDate: (dateStr: string) => void;
}

export default function RealisasiDateBar({
  selectedDateStr,
  onDateChange,
  minDateStr,
  selectedRecord,
  matchingDateRecords,
  onSelectRecord,
  recordsCount,
  onOpenCreateForDate,
}: RealisasiDateBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="pilih-tanggal-rekapan"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar size={14} className="text-[#0B2A59] dark:text-blue-400" />
            Pilih Tanggal:
          </label>
          <DateInputHybrid
            value={selectedDateStr}
            onChange={onDateChange}
            minDate={minDateStr}
            placeholder="Pilih tanggal..."
            className="w-36 sm:w-40"
            inputClassName="py-1 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        {/* Status indicator / info badge */}
        {selectedRecord ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {selectedRecord.items?.length || 0} Mitra Ritel Dilayani
            </span>

            {Array.isArray(selectedRecord.daftarTanggal) &&
              selectedRecord.daftarTanggal.length > 1 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Laporan Rapel ({selectedRecord.daftarTanggal.length} Hari)
                </span>
              )}

            {/* If multiple records exist on the same date, show switcher */}
            {matchingDateRecords.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 px-1.5 font-medium">Versi:</span>
                {matchingDateRecords.map((rec, idx) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectRecord(rec)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      selectedRecord.id === rec.id
                        ? "bg-[#0B2A59] text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                    }`}
                  >
                    #{idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : recordsCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Belum ada rekapan pada tanggal ini
          </span>
        ) : null}
      </div>

      {/* Quick Action Button for selected date */}
      {!selectedRecord && recordsCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenCreateForDate(selectedDateStr)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={13} />
          Buat Rekapan Tanggal Ini
        </button>
      )}
    </div>
  );
}
