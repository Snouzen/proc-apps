"use client";

import React from "react";
import {
  Calendar,
  ShoppingCart,
  MapPin,
  CheckCircle2,
  Award,
  Users,
  Truck,
  ShoppingBag,
} from "lucide-react";

export interface WeeklyDocumentationItem {
  id?: string;
  photoUrl: string;
  location: string;
  date: string;
  description: string;
}

export interface WeeklyDailyItem {
  date: string; // YYYY-MM-DD or formatted
  label: string; // e.g. "21 Sep 2026"
  volumeKg: number;
}

export interface WeeklyRetailerItem {
  id?: string;
  namaRitel: string;
  volumeKg: number;
  logoUrl?: string | null;
  provinsi?: string | null;
}

export interface RealisasiWeeklyData {
  startDate: string; // "2026-09-21"
  endDate: string; // "2026-09-26"
  judul?: string;
  subjudul?: string;
  tipeRitel?: string;
  sumberCatatan?: string;

  // Daily volume breakdown (up to 6 days)
  dailyBreakdown: WeeklyDailyItem[];

  // Retailer items (consolidated for the week)
  retailers: WeeklyRetailerItem[];

  // 5 Documentation cards
  documentation: WeeklyDocumentationItem[];

  // Optional overrides
  customTotalKg?: number;
  customJabodetabekKg?: number;
}

// Default Fallback Benchmark Dataset matching the original design
export const DEFAULT_WEEKLY_DATA: RealisasiWeeklyData = {
  startDate: "2026-09-21",
  endDate: "2026-09-26",
  judul: "LAPORAN PROGRES",
  subjudul: "PEMENUHAN BERAS PREMIUM",
  tipeRitel: "DI RITEL MODERN DAN PASAR MODERN",
  sumberCatatan: "Sumber: Realisasi Pelayanan UB Industri, 21 – 26 September 2026.",
  dailyBreakdown: [
    { date: "2026-09-21", label: "21 Sep 2026", volumeKg: 83350 },
    { date: "2026-09-22", label: "22 Sep 2026", volumeKg: 179500 },
    { date: "2026-09-23", label: "23 Sep 2026", volumeKg: 204655 },
    { date: "2026-09-24", label: "24 Sep 2026", volumeKg: 233450 },
    { date: "2026-09-25", label: "25 Sep 2026", volumeKg: 182340 },
    { date: "2026-09-26", label: "26 Sep 2026", volumeKg: 55750 },
  ],
  retailers: [
    { namaRitel: "ALFAMART", volumeKg: 255090, logoUrl: "/img/weekly-ritel/alfamart.png", provinsi: "JABODETABEK" },
    { namaRitel: "INDOMARCO", volumeKg: 118080, logoUrl: "/img/weekly-ritel/indomarco.png", provinsi: "JABODETABEK" },
    { namaRitel: "ALFAMIDI", volumeKg: 116900, logoUrl: "/img/weekly-ritel/alfamidi.png", provinsi: "JABODETABEK" },
    { namaRitel: "INDOGROSIR", volumeKg: 85000, logoUrl: "/img/weekly-ritel/indogrosir.png", provinsi: "JAWA BARAT" },
    { namaRitel: "BORMA", volumeKg: 70000, logoUrl: "/img/weekly-ritel/borma.png", provinsi: "JAWA BARAT" },
    { namaRitel: "YOGYA", volumeKg: 60000, logoUrl: "/img/weekly-ritel/yogya.png", provinsi: "JAWA BARAT" },
    { namaRitel: "HYPERMART", volumeKg: 54250, logoUrl: "/img/weekly-ritel/hypermart.png", provinsi: "JABODETABEK" },
    { namaRitel: "BENGAWAN", volumeKg: 28150, logoUrl: "/img/weekly-ritel/bengawan.png", provinsi: "JAWA TENGAH" },
    { namaRitel: "LOTTE GROSIR", volumeKg: 15000, logoUrl: "/img/weekly-ritel/lotte-grosir.png", provinsi: "JABODETABEK" },
    { namaRitel: "GRAND LUCKY", volumeKg: 14500, logoUrl: "/img/weekly-ritel/grand-lucky.png", provinsi: "JABODETABEK" },
    { namaRitel: "RAMAYANA", volumeKg: 12500, logoUrl: "/img/weekly-ritel/ramayana.png", provinsi: "JAWA TIMUR" },
    { namaRitel: "TIP TOP SUPERMARKET", volumeKg: 12000, logoUrl: "/img/weekly-ritel/tip-top.png", provinsi: "JABODETABEK" },
  ],
  customJabodetabekKg: 148000,
  documentation: [
    {
      photoUrl: "/img/weekly-doc-1.jpg",
      location: "Alfamidi – Jl Swadaya",
      date: "25 September 2026",
      description: "Produk beras premium tersedia di rak ritel modern.",
    },
    {
      photoUrl: "/img/weekly-doc-2.jpg",
      location: "Alfamidi – Jl Swadaya",
      date: "25 September 2026",
      description: "Varian Punokawan dan SPHP tersedia untuk masyarakat.",
    },
    {
      photoUrl: "/img/weekly-doc-3.jpg",
      location: "Foodmart Lippo Mall",
      date: "25 September 2026",
      description: "Display beras premium Punokawan di area promosi.",
    },
    {
      photoUrl: "/img/weekly-doc-4.jpg",
      location: "Yogya Department Store",
      date: "23 September 2026",
      description: "Beras premium tersedia di area beras.",
    },
    {
      photoUrl: "/img/weekly-doc-5.jpg",
      location: "Kecamatan Cibitung, Bekasi",
      date: "23 September 2026",
      description: "Stok beras premium siap melayani kebutuhan masyarakat.",
    },
  ],
};

const formatNumber = (num: number) =>
  num ? Math.round(num).toLocaleString("id-ID") : "0";

const formatTon = (num: number) =>
  num
    ? num.toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0,00";

// Helper: Format date range for header and badges
const formatWeeklyRangeText = (startDateStr: string, endDateStr: string) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      fullBadge: "21 – 26 SEPTEMBER 2026",
      shortLabel: "21–26 SEP 2026",
    };
  }

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonthName = start.toLocaleDateString("id-ID", { month: "long" });
  const endMonthName = end.toLocaleDateString("id-ID", { month: "long" });
  const startMonthShort = start.toLocaleDateString("id-ID", { month: "short" });
  const endMonthShort = end.toLocaleDateString("id-ID", { month: "short" });
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear && start.getMonth() === end.getMonth()) {
    return {
      fullBadge: `${startDay} – ${endDay} ${startMonthName.toUpperCase()} ${startYear}`,
      shortLabel: `${startDay}–${endDay} ${startMonthShort.toUpperCase()} ${startYear}`,
    };
  } else if (startYear === endYear) {
    return {
      fullBadge: `${startDay} ${startMonthName.toUpperCase()} – ${endDay} ${endMonthName.toUpperCase()} ${startYear}`,
      shortLabel: `${startDay} ${startMonthShort.toUpperCase()} – ${endDay} ${endMonthShort.toUpperCase()} ${startYear}`,
    };
  } else {
    return {
      fullBadge: `${startDay} ${startMonthName.toUpperCase()} ${startYear} – ${endDay} ${endMonthName.toUpperCase()} ${endYear}`,
      shortLabel: `${startDay} ${startMonthShort.toUpperCase()} ${startYear} – ${endDay} ${endMonthShort.toUpperCase()} ${endYear}`,
    };
  }
};

export default function RealisasiWeeklySlide({
  data,
  slideRef,
}: {
  data: RealisasiWeeklyData;
  slideRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const activeData = data || DEFAULT_WEEKLY_DATA;
  const { fullBadge, shortLabel } = formatWeeklyRangeText(
    activeData.startDate,
    activeData.endDate
  );

  // 1. Daily breakdown & Total Volume
  const dailyItems = activeData.dailyBreakdown || [];
  const daysCount = Math.max(1, dailyItems.length);

  const totalKg =
    typeof activeData.customTotalKg === "number" && activeData.customTotalKg > 0
      ? activeData.customTotalKg
      : dailyItems.length > 0
      ? dailyItems.reduce((acc, it) => acc + Number(it.volumeKg || 0), 0)
      : (activeData.retailers || []).reduce(
          (acc, it) => acc + Number(it.volumeKg || 0),
          0
        );
  const totalTon = totalKg / 1000;

  // 2. Average per day (formula: totalKg / daysCount)
  const avgKg = daysCount > 0 ? Math.round(totalKg / daysCount) : 0;
  const avgTon = avgKg / 1000;

  // 3. Jabodetabek Volume & Percentage
  const jabodetabekKg =
    typeof activeData.customJabodetabekKg === "number" &&
    activeData.customJabodetabekKg > 0
      ? activeData.customJabodetabekKg
      : (activeData.retailers || [])
          .filter((it) => {
            const p = (it.provinsi || "").toUpperCase();
            return (
              p.includes("JABODETABEK") ||
              p.includes("DKI") ||
              p.includes("JAKARTA")
            );
          })
          .reduce((acc, it) => acc + Number(it.volumeKg || 0), 0);
  const jabodetabekTon = jabodetabekKg / 1000;
  const jabodetabekPct =
    totalKg > 0
      ? ((jabodetabekKg / totalKg) * 100).toFixed(1).replace(".", ",")
      : "0,0";

  // 4. Retailers & Top 3
  const sortedRetailers = [...(activeData.retailers || [])].sort(
    (a, b) => Number(b.volumeKg || 0) - Number(a.volumeKg || 0)
  );
  const top3 = sortedRetailers.slice(0, 3);

  // 5. Highlights: Highest & Lowest daily volumes
  let highestDay: WeeklyDailyItem | null = null;
  let lowestDay: WeeklyDailyItem | null = null;
  if (dailyItems.length > 0) {
    const sortedDays = [...dailyItems].sort(
      (a, b) => Number(b.volumeKg || 0) - Number(a.volumeKg || 0)
    );
    highestDay = sortedDays[0];
    lowestDay = sortedDays[sortedDays.length - 1];
  }

  // 6. Documentation (Ensure 5 items)
  const docs = activeData.documentation || [];
  const displayDocs: WeeklyDocumentationItem[] = Array.from({ length: 5 }).map(
    (_, idx) => {
      if (docs[idx]) return docs[idx];
      return {
        photoUrl: `/img/weekly-doc-${idx + 1}.jpg`,
        location: "Mitra Ritel Modern",
        date: "September 2026",
        description: "Ketersediaan beras premium terjamin di gerai ritel modern.",
      };
    }
  );

  return (
    <div
      ref={slideRef}
      className="font-slide font-normal w-full bg-white text-slate-800 p-5 sm:p-7 rounded-xl shadow-lg border border-slate-200 overflow-hidden select-none relative"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      {/* ── TOP-RIGHT BACKGROUND ILLUSTRATION (Consistent with Daily Slide) ── */}
      <div
        className="absolute top-0 right-0 pointer-events-none z-0 select-none overflow-hidden flex justify-end items-start w-[240px] sm:w-[280px] md:w-[310px] lg:w-[340px] xl:w-[370px] h-[105px] sm:h-[118px] md:h-[128px] lg:h-[138px] xl:h-[148px]"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 5%, rgba(0,0,0,0.6) 14%, black 22%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.15) 6%, rgba(0,0,0,0.7) 16%, black 26%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 5%, rgba(0,0,0,0.6) 14%, black 22%), linear-gradient(to top, transparent 0%, rgba(0,0,0,0.15) 6%, rgba(0,0,0,0.7) 16%, black 26%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "destination-in",
        }}
      >
        <img
          src="/img/pangan-vol-2.png"
          alt="Pangan Berkualitas untuk Negeri"
          className="w-full h-full object-cover object-right-top"
        />
      </div>

      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 gap-3">
        {/* Left: Bulog Logo & Tagline */}
        <div className="flex flex-col items-start shrink-0">
          <img
            src="https://rzjlkpumrsjpafduhlgt.supabase.co/storage/v1/object/public/logo-img/logo-bulog/logo-bulog.png"
            alt="Bulog Logo"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <span className="text-[10px] sm:text-[10.5px] font-bold text-[#0B2A59] mt-0.5 tracking-tight">
            Mengantarkan Kebaikan
          </span>
        </div>

        {/* Center: Main Title & Weekly Date Badge */}
        <div className="text-center flex-1 max-w-xl mx-auto px-2">
          <h1 className="text-base sm:text-xl xl:text-2xl font-black text-[#0B2A59] tracking-tight uppercase leading-none">
            {activeData.judul || "LAPORAN PROGRES"}
          </h1>
          <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-[#0B2A59] tracking-tight uppercase leading-tight mt-0.5">
            {activeData.subjudul || "PEMENUHAN BERAS PREMIUM"}
          </h2>
          <p className="text-[11px] sm:text-xs font-bold text-[#0B2A59] tracking-normal uppercase leading-tight">
            {activeData.tipeRitel || "DI RITEL MODERN DAN PASAR MODERN"}
          </p>

          <div className="inline-flex items-center justify-center mt-1 px-5 py-0.5 bg-[#0B2A59] text-white rounded-full text-xs sm:text-[13px] font-bold tracking-wider shadow-xs relative">
            <span>{fullBadge}</span>
            <div className="absolute -bottom-0.5 left-4 right-4 h-0.5 bg-[#F5A623] rounded-full" />
          </div>
        </div>

        {/* Right Spacer (Balancing Logo) */}
        <div className="w-28 sm:w-36 lg:w-40 shrink-0 hidden md:block pointer-events-none" />
      </div>

      {/* ── SECTION 1: NARRATIVE & 4 METRIC CARDS ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1.45fr_1.1fr_1.45fr_1.4fr] gap-2 xl:gap-2.5 mt-2 sm:mt-2.5 items-stretch">
        {/* Left Narrative Box with Gold Left Bar */}
        <div className="flex items-center bg-white border-l-4 border-[#F5A623] pl-2.5 pr-1 py-1">
          <p className="text-[10px] sm:text-[11px] font-medium text-[#0B2A59] leading-relaxed">
            BULOG terus memastikan ketersediaan beras premium di ritel modern
            untuk menjaga keterjangkauan harga dan melayani kebutuhan
            masyarakat.
          </p>
        </div>

        {/* Card 1: TOTAL REALISASI (1 MINGGU) */}
        <div className="bg-white border border-blue-100 rounded-xl p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0B2A59] flex items-center justify-center shrink-0 shadow-xs">
            <img
              src="/img/weekly-sack-icon.png"
              alt="Total Realisasi"
              className="h-5 sm:h-6 w-auto object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-500 uppercase tracking-tight leading-tight">
              TOTAL REALISASI
            </p>
            <p className="text-[8.5px] font-bold text-slate-400 tracking-tight leading-none">
              ({shortLabel})
            </p>
            <p className="text-lg sm:text-xl xl:text-2xl font-black text-[#0B2A59] leading-tight tracking-tight mt-0.5 truncate">
              {formatNumber(totalKg)} KG
            </p>
            <p className="text-[10.5px] sm:text-xs font-bold text-[#0B2A59] leading-none">
              ({formatTon(totalTon)} TON)
            </p>
          </div>
        </div>

        {/* Card 2: RATA-RATA PER HARI */}
        <div className="bg-white border border-blue-100 rounded-xl p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0B2A59] flex items-center justify-center shrink-0 shadow-xs text-[#F5A623]">
            <Calendar size={20} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-500 uppercase tracking-tight leading-tight">
              RATA-RATA
            </p>
            <p className="text-[8.5px] font-bold text-slate-400 tracking-tight leading-none">
              PER HARI
            </p>
            <p className="text-lg sm:text-xl xl:text-2xl font-black text-[#0B2A59] leading-tight tracking-tight mt-0.5 truncate">
              {formatNumber(avgKg)} KG
            </p>
            <p className="text-[10.5px] sm:text-xs font-bold text-[#0B2A59] leading-none">
              ({formatTon(avgTon)} TON)
            </p>
          </div>
        </div>

        {/* Card 3: REALISASI JABODETABEK */}
        <div className="bg-white border border-blue-100 rounded-xl p-2 sm:p-2.5 shadow-2xs flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0B2A59] flex items-center justify-center shrink-0 shadow-xs text-[#F5A623]">
            <ShoppingCart size={20} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-500 uppercase tracking-tight leading-tight">
              REALISASI
            </p>
            <p className="text-[8.5px] font-bold text-slate-400 tracking-tight leading-none">
              JABODETABEK
            </p>
            <p className="text-base sm:text-lg xl:text-xl font-black text-[#0B2A59] leading-tight tracking-tight mt-0.5 truncate">
              {formatNumber(jabodetabekKg)} KG{" "}
              <span className="text-xs sm:text-sm font-bold text-[#0B2A59]">
                ({jabodetabekPct}%)
              </span>
            </p>
            <p className="text-[10.5px] sm:text-xs font-bold text-[#0B2A59] leading-none">
              ({formatTon(jabodetabekTon)} TON)
            </p>
          </div>
        </div>

        {/* Card 4: JUMLAH REGIONAL & CAKUPAN WILAYAH (Hardcoded per user instruction) */}
        <div className="bg-white border border-blue-100 rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <img
              src="/img/indonesia-map.png"
              alt="Indonesia Map"
              className="w-11 h-5 object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight leading-none">
                JUMLAH REGIONAL
              </p>
              <p className="text-xs sm:text-sm font-black text-[#0B2A59] leading-tight">
                3 REGIONAL
              </p>
              <p className="text-[7.5px] text-slate-500 leading-tight truncate">
                Jabodetabek, Jawa Barat, Jawa Timur dan wilayah lainnya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0B2A59] flex items-center justify-center shrink-0">
              <MapPin size={12} className="text-[#0B2A59]" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight leading-none">
                CAKUPAN WILAYAH
              </p>
              <p className="text-[8.5px] font-semibold text-slate-700 leading-tight">
                Melayani ritel modern di berbagai daerah
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: REALISASI HARIAN & TOP 3 VOLUME KUMULATIF ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 xl:gap-2.5 mt-2.5 items-stretch">
        {/* Left: Realisasi Harian (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              REALISASI HARIAN
            </span>
          </div>

          <div className="grid grid-cols-6 divide-x divide-slate-100 p-1.5 flex-1 items-center bg-white">
            {dailyItems.map((day, idx) => {
              const dayTon = Number(day.volumeKg || 0) / 1000;
              return (
                <div
                  key={`daily-${idx}`}
                  className="px-1 py-1 flex flex-col items-center justify-center text-center"
                >
                  <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-500 leading-tight">
                    {day.label}
                  </p>
                  <img
                    src="/img/weekly-sack-icon.png"
                    alt=""
                    className="h-5 sm:h-6 w-auto object-contain my-1"
                  />
                  <p className="text-[9.5px] sm:text-[10.5px] font-black text-[#0B2A59] leading-tight">
                    {formatNumber(day.volumeKg)} KG
                  </p>
                  <p className="text-[8.5px] text-slate-500 font-medium leading-tight">
                    ({formatTon(dayTon)} TON)
                  </p>
                </div>
              );
            })}

            {/* Empty column placeholders if fewer than 6 days */}
            {Array.from({ length: Math.max(0, 6 - dailyItems.length) }).map(
              (_, pIdx) => (
                <div
                  key={`daily-placeholder-${pIdx}`}
                  className="px-1 py-1 flex flex-col items-center justify-center text-center text-slate-300 text-[10px]"
                >
                  -
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Top 3 Volume Realisasi Kumulatif (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              TOP 3 VOLUME REALISASI (KUMULATIF {shortLabel})
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 p-1.5 flex-1 items-center bg-white">
            {top3.map((ritel, idx) => {
              const badgeColors = [
                "bg-[#F5A623] text-white ring-2 ring-amber-300", // Gold #1
                "bg-slate-400 text-white ring-2 ring-slate-200", // Silver #2
                "bg-[#B87333] text-white ring-2 ring-amber-600/40", // Bronze #3
              ];

              return (
                <div
                  key={`top3-${idx}`}
                  className="px-1.5 py-1 flex items-center gap-2 justify-center"
                >
                  {/* Medal Circle Badge */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${badgeColors[idx]}`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0 flex flex-col items-start">
                    {/* Retailer Logo or text */}
                    {ritel.logoUrl ? (
                      <img
                        src={ritel.logoUrl}
                        alt={ritel.namaRitel}
                        className="max-h-5 max-w-[65px] object-contain shrink-0"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="text-[10px] font-black text-[#0B2A59] uppercase truncate">
                        {ritel.namaRitel}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs font-black text-[#0B2A59] tracking-tight leading-none mt-1">
                      {formatNumber(ritel.volumeKg)} KG
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: MITRA RITEL YANG DILAYANI & HIGHLIGHT KEMAJUAN ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 xl:gap-2.5 mt-2.5 items-stretch">
        {/* Left: Mitra Ritel Yang Dilayani Kumulatif (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              MITRA RITEL YANG DILAYANI ({shortLabel})
            </span>
          </div>

          <div className="p-2 flex-1 bg-white">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 items-stretch">
              {sortedRetailers.slice(0, 12).map((r, rIdx) => (
                <div
                  key={r.id || `ritel-${rIdx}`}
                  className="bg-white border border-slate-200/90 rounded-lg p-1.5 flex flex-col items-center justify-between text-center min-h-[64px] shadow-2xs"
                >
                  <div className="h-6 flex items-center justify-center">
                    {r.logoUrl ? (
                      <img
                        src={r.logoUrl}
                        alt={r.namaRitel}
                        className="max-h-5 max-w-[70px] object-contain"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-blue-50 text-[#0B2A59] font-black text-[9px] flex items-center justify-center">
                        {r.namaRitel.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p
                    className="text-[8px] font-bold text-slate-700 uppercase tracking-tight line-clamp-1 mt-0.5"
                    title={r.namaRitel}
                  >
                    {r.namaRitel}
                  </p>
                  <p className="text-[10px] sm:text-[10.5px] font-black text-[#0B2A59] leading-tight">
                    {formatNumber(r.volumeKg)} KG
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Highlight & Kemajuan (4 cols on lg) */}
        <div className="lg:col-span-4 bg-[#0B2A59] text-white rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="px-3.5 py-1.5 flex items-center gap-2 border-b border-blue-900/60 bg-[#081F42]">
            <CheckCircle2 size={15} className="text-[#F5A623] shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              HIGHLIGHT & KEMAJUAN
            </span>
          </div>

          <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1 text-[9px] sm:text-[9.5px]">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Total realisasi {daysCount} hari: {formatTon(totalTon)} ton
              </span>
            </div>

            {highestDay && (
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
                <span className="text-blue-50 leading-tight">
                  Realisasi tertinggi {highestDay.label}:{" "}
                  {formatTon(highestDay.volumeKg / 1000)} ton
                </span>
              </div>
            )}

            {lowestDay && (
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
                <span className="text-blue-50 leading-tight">
                  Realisasi terendah {lowestDay.label}:{" "}
                  {formatTon(lowestDay.volumeKg / 1000)} ton
                </span>
              </div>
            )}

            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Realisasi Jabodetabek: {formatTon(jabodetabekTon)} ton ({jabodetabekPct}%)
              </span>
            </div>

            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Didukung oleh berbagai jaringan ritel modern
              </span>
            </div>

            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Permintaan pasar tetap tinggi
              </span>
            </div>

            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Distribusi terus kami tingkatkan
              </span>
            </div>

            <div className="flex items-start gap-1.5">
              <CheckCircle2 size={12} className="text-[#F5A623] shrink-0 mt-0.5" />
              <span className="text-blue-50 leading-tight">
                Memperluas cakupan wilayah dan mitra ritel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: DOKUMENTASI DI LAPANGAN (5 Photo Cards) ─────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs mt-2.5">
        <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider">
            DOKUMENTASI DI LAPANGAN
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-2 bg-white">
          {displayDocs.map((doc, idx) => (
            <div
              key={`doc-${idx}`}
              className="bg-white border border-slate-100 rounded-lg p-1.5 flex flex-col justify-between shadow-2xs"
            >
              {/* Photo Box */}
              <div className="aspect-[16/10] w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 mb-1 flex items-center justify-center">
                <img
                  src={doc.photoUrl}
                  alt={doc.location}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Location with Pin */}
              <div className="flex items-start gap-1 text-[#0B2A59] font-bold text-[9px] leading-tight">
                <MapPin size={11} className="text-[#F5A623] shrink-0 mt-0.5" />
                <span className="line-clamp-1" title={doc.location}>
                  {doc.location}
                </span>
              </div>

              {/* Date */}
              <p className="text-[8px] text-slate-400 font-medium leading-tight mt-0.5 pl-3.5">
                {doc.date}
              </p>

              {/* Description */}
              <p
                className="text-[8px] text-slate-600 leading-tight line-clamp-2 mt-0.5 pl-3.5"
                title={doc.description}
              >
                {doc.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 5: BRAND VALUE & FOOTER ───────────────────────────────── */}
      <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-col justify-between gap-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          {/* Left Quote */}
          <div className="md:col-span-4 flex items-center gap-2 pl-1">
            <span className="text-2xl sm:text-3xl font-serif text-[#F5A623] leading-none select-none">
              “
            </span>
            <p className="text-[11px] sm:text-xs font-black italic text-[#0B2A59] leading-tight tracking-tight">
              &quot;Ketersediaan Terjaga, Harga Lebih Stabil, Masyarakat Lebih
              Sejahtera&quot;
            </p>
          </div>

          {/* Center 4 Value Pillars */}
          <div className="md:col-span-5 grid grid-cols-4 gap-1.5 text-center">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border border-blue-200 text-[#0B2A59] flex items-center justify-center mb-0.5">
                <Award size={13} />
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-700 leading-tight">
                Kualitas Terjamin
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border border-blue-200 text-[#0B2A59] flex items-center justify-center mb-0.5">
                <Users size={13} />
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-700 leading-tight">
                Pasokan yang Cukup
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border border-blue-200 text-[#0B2A59] flex items-center justify-center mb-0.5">
                <Truck size={13} />
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-700 leading-tight">
                Distribusi Tepat Waktu
              </span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border border-blue-200 text-[#0B2A59] flex items-center justify-center mb-0.5">
                <ShoppingBag size={13} />
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-700 leading-tight">
                Mudah Didapatkan
              </span>
            </div>
          </div>

          {/* Right Rice Bowl Graphic */}
          <div className="md:col-span-3 flex justify-end items-center pr-1">
            <img
              src="/img/weekly-rice-bowl.png"
              alt="Dari Bumi Indonesia untuk Keluarga Indonesia"
              className="h-9 sm:h-11 w-auto object-contain"
            />
          </div>
        </div>

        {/* Bottom Bulog Bar */}
        <div className="bg-[#0B2A59] text-white px-4 py-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1 text-[9.5px] sm:text-[10px]">
          <div className="flex items-center gap-2">
            <img
              src="https://rzjlkpumrsjpafduhlgt.supabase.co/storage/v1/object/public/logo-img/logo-bulog/logo-bulog.png"
              alt="Bulog Logo"
              className="h-4 w-auto brightness-0 invert object-contain"
            />
            <span className="font-semibold tracking-wide">
              Mengantarkan Kebaikan
            </span>
          </div>

          <div className="flex items-center gap-3 font-medium text-blue-200 text-[9px] tracking-wide">
            <span>#PanganBerkualitas</span>
            <span>#BULOGUntukIndonesia</span>
            <span>#MengantarkanKebaikan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
