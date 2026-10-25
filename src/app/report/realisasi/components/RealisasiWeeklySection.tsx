import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  Edit2,
  Download,
  Loader2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import DateInputHybrid from "@/components/DateInputHybrid";
import { generateRealisasiPdf } from "@/lib/generateRealisasiPdf";
import RealisasiWeeklySlide, {
  DEFAULT_WEEKLY_DATA,
  RealisasiWeeklyData,
  WeeklyDocumentationItem,
} from "./RealisasiWeeklySlide";
import RealisasiWeeklyFormSplit from "./RealisasiWeeklyFormSplit";
import { formatDateToYYYYMMDD } from "../types";

interface RealisasiWeeklySectionProps {
  records: any[];
}

export default function RealisasiWeeklySection({
  records,
}: RealisasiWeeklySectionProps) {
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>("2026-09-21");
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>("2026-09-26");
  const [weeklyDocs, setWeeklyDocs] = useState<WeeklyDocumentationItem[]>(
    DEFAULT_WEEKLY_DATA.documentation
  );
  const [isWeeklySplitOpen, setIsWeeklySplitOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const weeklySlideRef = useRef<HTMLDivElement>(null);

  // Load saved weekly docs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("proc_weekly_docs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWeeklyDocs(parsed);
        }
      }
    } catch {}
  }, []);

  const isRecordCoveringDate = (rec: any, dateStr: string): boolean => {
    if (!dateStr || !rec) return false;
    if (Array.isArray(rec.daftarTanggal) && rec.daftarTanggal.length > 0) {
      return rec.daftarTanggal.some((d: string) => d.split("T")[0] === dateStr);
    }
    return formatDateToYYYYMMDD(rec.tanggal) === dateStr;
  };

  const handleWeeklyStartDateChange = (newStart: string) => {
    if (!newStart) return;
    setWeeklyStartDate(newStart);

    const dt = new Date(newStart + "T00:00:00");
    if (!isNaN(dt.getTime())) {
      const maxEnd = new Date(dt);
      maxEnd.setDate(maxEnd.getDate() + 5);
      const maxEndStr = maxEnd.toISOString().split("T")[0];

      if (!weeklyEndDate || weeklyEndDate < newStart || weeklyEndDate > maxEndStr) {
        setWeeklyEndDate(maxEndStr);
      }
    }
  };

  const handleWeeklyEndDateChange = (newEnd: string) => {
    if (!newEnd) return;
    if (newEnd < weeklyStartDate) {
      setWeeklyStartDate(newEnd);
      setWeeklyEndDate(newEnd);
      return;
    }
    const startDt = new Date(weeklyStartDate + "T00:00:00");
    const endDt = new Date(newEnd + "T00:00:00");
    const diffDays = Math.round(
      (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 5) {
      const maxEnd = new Date(startDt);
      maxEnd.setDate(maxEnd.getDate() + 5);
      setWeeklyEndDate(maxEnd.toISOString().split("T")[0]);
      Swal.fire({
        title: "Maksimal 6 Hari",
        text: "Rentang tanggal laporan mingguan dibatasi maksimal 6 hari.",
        icon: "info",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      setWeeklyEndDate(newEnd);
    }
  };

  const setWeeklyPreset = (type: "sample" | "current" | "previous") => {
    if (type === "sample") {
      setWeeklyStartDate("2026-09-21");
      setWeeklyEndDate("2026-09-26");
      return;
    }
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + diffToMon);

    if (type === "previous") {
      monday.setDate(monday.getDate() - 7);
    }

    const saturday = new Date(monday);
    saturday.setDate(saturday.getDate() + 5);

    setWeeklyStartDate(monday.toISOString().split("T")[0]);
    setWeeklyEndDate(saturday.toISOString().split("T")[0]);
  };

  const handleSaveWeeklyDocs = () => {
    try {
      localStorage.setItem("proc_weekly_docs", JSON.stringify(weeklyDocs));
    } catch {}
    setIsWeeklySplitOpen(false);
    Swal.fire({
      title: "Tersimpan!",
      text: "Dokumentasi mingguan berhasil diperbarui.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleResetWeeklyDocs = () => {
    setWeeklyDocs(DEFAULT_WEEKLY_DATA.documentation);
    try {
      localStorage.removeItem("proc_weekly_docs");
    } catch {}
    Swal.fire({
      title: "Direset!",
      text: "Dokumentasi dikembalikan ke default.",
      icon: "info",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleExportWeeklyPdf = async () => {
    if (!weeklySlideRef.current) {
      Swal.fire("Perhatian", "Tidak ada slide mingguan yang aktif untuk di-export.", "warning");
      return;
    }

    setExportingPdf(true);
    try {
      const fileName = `Laporan_Mingguan_Realisasi_${weeklyStartDate}_sd_${weeklyEndDate}.pdf`;
      await generateRealisasiPdf({
        element: weeklySlideRef.current,
        fileName,
      });

      Swal.fire({
        title: "Export Berhasil!",
        text: `File ${fileName} berhasil diunduh.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error("Export PDF error:", err);
      Swal.fire("Gagal Export PDF", err.message || "Terjadi kesalahan saat generate PDF.", "error");
    } finally {
      setExportingPdf(false);
    }
  };

  const weeklyData = useMemo<RealisasiWeeklyData>(() => {
    if (!weeklyStartDate || !weeklyEndDate) return DEFAULT_WEEKLY_DATA;

    const start = new Date(weeklyStartDate + "T00:00:00");
    const end = new Date(weeklyEndDate + "T00:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return DEFAULT_WEEKLY_DATA;
    }

    const daysList: string[] = [];
    const curr = new Date(start);
    while (curr <= end && daysList.length < 6) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      daysList.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    const dailyBreakdown: { date: string; label: string; volumeKg: number }[] = [];
    const retailerMap = new Map<string, {
      namaRitel: string;
      volumeKg: number;
      logoUrl: string | null;
      provinsi: string | null;
    }>();

    let totalVolumeFromRecords = 0;

    daysList.forEach((dStr) => {
      const dayDate = new Date(dStr + "T00:00:00");
      const dayLabel = dayDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const matching = records.filter((r) => isRecordCoveringDate(r, dStr));
      let daySum = 0;

      matching.forEach((r) => {
        (r.items || []).forEach((it: any) => {
          const vol = Number(it.volumeKg || 0);
          daySum += vol;
          totalVolumeFromRecords += vol;

          const cleanName = (it.namaRitel || "").trim();
          if (!cleanName) return;
          const key = cleanName.toLowerCase();

          if (!retailerMap.has(key)) {
            retailerMap.set(key, {
              namaRitel: cleanName,
              volumeKg: vol,
              logoUrl: it.logoUrl || null,
              provinsi: it.provinsi || null,
            });
          } else {
            const ex = retailerMap.get(key)!;
            ex.volumeKg += vol;
            if (!ex.logoUrl && it.logoUrl) ex.logoUrl = it.logoUrl;
            if (!ex.provinsi && it.provinsi) ex.provinsi = it.provinsi;
          }
        });
      });

      dailyBreakdown.push({
        date: dStr,
        label: dayLabel,
        volumeKg: daySum,
      });
    });

    if (totalVolumeFromRecords > 0) {
      const retailers = Array.from(retailerMap.values());
      return {
        startDate: weeklyStartDate,
        endDate: weeklyEndDate,
        judul: "LAPORAN PROGRES",
        subjudul: "PEMENUHAN BERAS PREMIUM",
        tipeRitel: "DI RITEL MODERN DAN PASAR MODERN",
        dailyBreakdown,
        retailers,
        documentation: weeklyDocs,
      };
    }

    return {
      ...DEFAULT_WEEKLY_DATA,
      startDate: weeklyStartDate,
      endDate: weeklyEndDate,
      documentation: weeklyDocs,
    };
  }, [weeklyStartDate, weeklyEndDate, records, weeklyDocs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Laporan Mingguan Pemenuhan
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              16:9 Executive Weekly Slide
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Rekapan kinerja 1 minggu: realisasi harian, top 3 volume, mitra ritel kumulatif, dan dokumentasi lapangan
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isWeeklySplitOpen ? (
            <button
              type="button"
              onClick={() => setIsWeeklySplitOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B2A59] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Edit2 size={13} />
              Edit Dokumentasi Lapangan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsWeeklySplitOpen(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
            >
              <X size={14} />
              Tutup Split Input
            </button>
          )}

          <button
            type="button"
            onClick={handleExportWeeklyPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {exportingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exporting PDF...
              </>
            ) : (
              <>
                <Download size={14} />
                Export PDF Mingguan (1 Slide)
              </>
            )}
          </button>
        </div>
      </div>

      {!isWeeklySplitOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#0B2A59] dark:text-blue-400" />
                Periode Minggu:
              </label>

              <DateInputHybrid
                value={weeklyStartDate}
                onChange={handleWeeklyStartDateChange}
                placeholder="Mulai..."
                className="w-36 sm:w-40"
                inputClassName="py-1 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />

              <span className="text-xs text-slate-400 font-bold">s/d</span>

              <DateInputHybrid
                value={weeklyEndDate}
                onChange={handleWeeklyEndDateChange}
                placeholder="Selesai..."
                className="w-36 sm:w-40"
                inputClassName="py-1 px-2.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-[#0B2A59] dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                {weeklyData.dailyBreakdown.length} Hari (Maks. 6 Hari)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Pilihan Cepat:</span>
            <button
              type="button"
              onClick={() => setWeeklyPreset("sample")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
            >
              21–26 Sep (Sample)
            </button>
            <button
              type="button"
              onClick={() => setWeeklyPreset("current")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setWeeklyPreset("previous")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Minggu Lalu
            </button>
          </div>
        </div>
      )}

      {isWeeklySplitOpen ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          <div className="xl:col-span-5 2xl:col-span-4 sticky top-4">
            <RealisasiWeeklyFormSplit
              docs={weeklyDocs}
              setDocs={setWeeklyDocs}
              onSave={handleSaveWeeklyDocs}
              onCancel={() => setIsWeeklySplitOpen(false)}
              onReset={handleResetWeeklyDocs}
            />
          </div>

          <div className="xl:col-span-7 2xl:col-span-8 space-y-2 overflow-x-auto">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Preview (16:9 Weekly Slide)
              </span>
              <span className="text-[11px] text-slate-400">
                Slide otomatis memperbarui foto dan keterangan saat form di kiri diedit
              </span>
            </div>

            <div className="w-full">
              <RealisasiWeeklySlide
                data={weeklyData}
                slideRef={weeklySlideRef}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full flex justify-center overflow-x-auto py-2">
            <div className="w-full max-w-[1280px]">
              <RealisasiWeeklySlide
                data={weeklyData}
                slideRef={weeklySlideRef}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
