"use client";

import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
} from "date-fns";
import { id } from "date-fns/locale";

interface RealisasiDatePickerProps {
  tanggal: string; // YYYY-MM-DD
  tanggalAkhir?: string | null; // YYYY-MM-DD
  daftarTanggal?: string[]; // YYYY-MM-DD[]
  onChange: (data: {
    tanggal: string;
    tanggalAkhir: string | null;
    daftarTanggal: string[];
  }) => void;
  disabledDates?: string[]; // Array of YYYY-MM-DD strings already used in other reports
  className?: string;
  placeholder?: string;
}

export default function RealisasiDatePicker({
  tanggal,
  tanggalAkhir,
  daftarTanggal = [],
  onChange,
  disabledDates = [],
  className = "",
  placeholder = "Pilih tanggal / rapel...",
}: RealisasiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [mode, setMode] = useState<"single" | "range">("single");

  // Temporary selection state while popover is open
  const [tempStart, setTempStart] = useState<string>("");
  const [tempEnd, setTempEnd] = useState<string>("");

  // Sync internal state when opened or props change
  useEffect(() => {
    const start = tanggal ? tanggal.split("T")[0] : "";
    const end = tanggalAkhir ? tanggalAkhir.split("T")[0] : "";
    setTempStart(start);
    setTempEnd(end && end !== start ? end : "");
    if (end && end !== start) {
      setMode("range");
    } else {
      setMode("single");
    }

    if (start) {
      const d = parse(start, "yyyy-MM-dd", new Date());
      if (isValid(d)) setCurrentMonth(d);
    }
  }, [tanggal, tanggalAkhir, isOpen]);

  // Compute all dates in temporary range
  const getSelectedDatesList = (startStr: string, endStr: string): string[] => {
    if (!startStr) return [];
    if (!endStr || startStr === endStr) return [startStr];

    const d1 = parse(startStr, "yyyy-MM-dd", new Date());
    const d2 = parse(endStr, "yyyy-MM-dd", new Date());
    if (!isValid(d1) || !isValid(d2)) return [startStr];

    const [start, end] = isBefore(d1, d2) ? [d1, d2] : [d2, d1];
    return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
  };

  const currentSelectionList = getSelectedDatesList(tempStart, tempEnd);

  // Check if any date in the temporary selection is in disabledDates
  const conflictDates = currentSelectionList.filter((d) =>
    disabledDates.includes(d)
  );
  const hasConflict = conflictDates.length > 0;

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    // Don't allow clicking disabled dates
    if (disabledDates.includes(dateStr)) return;

    if (mode === "single") {
      setTempStart(dateStr);
      setTempEnd("");
    } else {
      // Range mode
      if (!tempStart || (tempStart && tempEnd)) {
        // Start new range
        setTempStart(dateStr);
        setTempEnd("");
      } else {
        // We already have a start, now picking end
        const d1 = parse(tempStart, "yyyy-MM-dd", new Date());
        if (isBefore(date, d1)) {
          // Clicked before start: swap
          setTempStart(dateStr);
          setTempEnd(tempStart);
        } else if (isSameDay(date, d1)) {
          // Clicked same day: single day range
          setTempEnd(dateStr);
        } else {
          setTempEnd(dateStr);
        }
      }
    }
  };

  const handleApplySubmit = () => {
    if (!tempStart || hasConflict) return;

    let finalStart = tempStart;
    let finalEnd: string | null = tempEnd || null;

    if (mode === "range" && tempEnd) {
      const d1 = parse(tempStart, "yyyy-MM-dd", new Date());
      const d2 = parse(tempEnd, "yyyy-MM-dd", new Date());
      if (isBefore(d2, d1)) {
        finalStart = tempEnd;
        finalEnd = tempStart;
      }
    }

    if (finalEnd === finalStart) {
      finalEnd = null;
    }

    const fullList = getSelectedDatesList(finalStart, finalEnd || "");

    onChange({
      tanggal: finalStart,
      tanggalAkhir: finalEnd,
      daftarTanggal: fullList,
    });

    setIsOpen(false);
  };

  // Format label for the input display box
  const formatDisplayValue = () => {
    if (!tanggal) return "";
    const d1 = parse(tanggal.split("T")[0], "yyyy-MM-dd", new Date());
    if (!isValid(d1)) return tanggal;

    if (tanggalAkhir && tanggalAkhir !== tanggal) {
      const d2 = parse(tanggalAkhir.split("T")[0], "yyyy-MM-dd", new Date());
      if (isValid(d2)) {
        const count = daftarTanggal.length > 1 ? daftarTanggal.length : 2;
        return `${format(d1, "dd/MM/yyyy")} – ${format(d2, "dd/MM/yyyy")} (Rapel ${count} Hari)`;
      }
    }

    if (daftarTanggal && daftarTanggal.length > 1) {
      return `${format(d1, "dd/MM/yyyy")} (+${daftarTanggal.length - 1} Hari Rapel)`;
    }

    return `${format(d1, "dd/MM/yyyy")} (${format(d1, "EEEE", { locale: id })})`;
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  return (
    <div className={`relative ${className}`}>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-blue-500 dark:hover:border-blue-400 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar
                size={15}
                className="text-[#0B2A59] dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform"
              />
              <span
                className={`text-xs font-bold truncate ${
                  tanggal
                    ? "text-slate-800 dark:text-slate-100"
                    : "text-slate-400 font-normal"
                }`}
              >
                {formatDisplayValue() || placeholder}
              </span>
            </div>

            {tanggalAkhir && tanggalAkhir !== tanggal && (
              <span className="shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 ml-2">
                Rapel
              </span>
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={6}
            align="start"
            className="z-[9999] w-[310px] p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("single");
                  if (tempStart) setTempEnd("");
                }}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  mode === "single"
                    ? "bg-white dark:bg-slate-800 text-[#0B2A59] dark:text-blue-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                1 Hari (Harian)
              </button>
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  mode === "range"
                    ? "bg-[#0B2A59] text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Rentang Rapel
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex justify-between items-center px-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {format(currentMonth, "MMMM yyyy", { locale: id })}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, i) => (
                <div
                  key={i}
                  className="text-[10px] font-bold text-slate-400 uppercase py-0.5"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading slots */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                )
              )}

              {daysInMonth.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const isToday = isSameDay(date, new Date());
                const isDisabled = disabledDates.includes(dateStr);

                // Range / selection checks
                const isStart = tempStart === dateStr;
                const isEnd = tempEnd === dateStr;
                const isInRange =
                  tempStart &&
                  tempEnd &&
                  currentSelectionList.includes(dateStr);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDayClick(date)}
                    title={
                      isDisabled
                        ? "Tanggal ini sudah memiliki laporan (tidak dapat dipilih)"
                        : undefined
                    }
                    className={`
                      h-8 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all relative
                      ${
                        isDisabled
                          ? "opacity-25 text-slate-400 dark:text-slate-600 cursor-not-allowed line-through bg-slate-50 dark:bg-slate-800/40"
                          : isStart || isEnd
                          ? "bg-[#0B2A59] text-white shadow-sm ring-1 ring-blue-900"
                          : isInRange
                          ? "bg-blue-100 dark:bg-blue-900/60 text-[#0B2A59] dark:text-blue-200 rounded-none first:rounded-l-lg last:rounded-r-lg"
                          : isToday
                          ? "border border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                      }
                    `}
                  >
                    {format(date, "d")}
                  </button>
                );
              })}
            </div>

            {/* Conflict Warning if range passes through disabled dates */}
            {hasConflict && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[10px] font-semibold flex items-start gap-1.5 leading-tight">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Rentang melewati tanggal yang sudah memiliki laporan:{" "}
                  <strong>{conflictDates.join(", ")}</strong>. Silakan pilih rentang lain.
                </span>
              </div>
            )}

            {/* Selection Summary & Submit Button Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="text-[11px] min-w-0">
                <p className="text-[9.5px] text-slate-400 font-medium uppercase leading-tight">
                  {mode === "single" ? "Tanggal Dipilih:" : "Periode Rapel:"}
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {tempStart ? (
                    mode === "range" && tempEnd && tempEnd !== tempStart ? (
                      `${format(parse(tempStart, "yyyy-MM-dd", new Date()), "dd/MM")} – ${format(parse(tempEnd, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")} (${currentSelectionList.length} Hari)`
                    ) : (
                      format(parse(tempStart, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")
                    )
                  ) : (
                    "Belum dipilih"
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplySubmit}
                  disabled={!tempStart || hasConflict}
                  className="flex items-center gap-1 px-3 py-1 bg-[#0B2A59] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  Terapkan
                </button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
