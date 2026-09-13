"use client";

import React from "react";
import {
  ShoppingCart,
  MapPin,
  Trophy,
  BookOpen,
  Wheat,
} from "lucide-react";

export interface RealisasiItemData {
  id?: string;
  ritelId?: string | null;
  companyName?: string | null;
  provinsi?: string | null;
  namaRitel: string;
  logoUrl?: string | null;
  volumeKg: number;
  urutan?: number;
}

export interface RealisasiData {
  id?: string;
  tanggal: string | Date;
  judul?: string;
  subjudul?: string;
  sumberCatatan?: string;
  items: RealisasiItemData[];
}

export default function RealisasiSlide({
  data,
  slideRef,
}: {
  data: RealisasiData;
  slideRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const items = data.items || [];

  // ── Auto-Calculations ─────────────────────────────────────────────────────
  // 1. Total KG & TON
  const totalKg = items.reduce((sum, it) => sum + Number(it.volumeKg || 0), 0);
  const totalTon = totalKg / 1000;

  // 2. Realisasi Jabodetabek (items with provinsi including "DKI", "JAKARTA", or "JABODETABEK")
  const jabodetabekKg = items
    .filter((it) => {
      const prov = (it.provinsi || "").toUpperCase();
      return (
        prov.includes("JABODETABEK") ||
        prov.includes("DKI") ||
        prov.includes("JAKARTA")
      );
    })
    .reduce((sum, it) => sum + Number(it.volumeKg || 0), 0);

  // 3. Helper: extract island or main region name (first word, with JABODETABEK/DKI/JAKARTA normalized to JAWA)
  const getPulauOrRegion = (prov: string): string => {
    const clean = (prov || "").trim().toUpperCase();
    if (!clean) return "";
    if (
      clean.includes("JABODETABEK") ||
      clean.includes("DKI") ||
      clean.includes("JAKARTA") ||
      clean.startsWith("JAWA")
    ) {
      return "JAWA";
    }
    const firstWord = clean.split(/[\s-]+/)[0];
    if (firstWord === "JABODETABEK" || firstWord === "DKI" || firstWord === "JAKARTA") {
      return "JAWA";
    }
    return firstWord;
  };

  // 4. Unique Regionals (Pulau / Region grouping, with Jabodetabek as distinct regional)
  const uniqueRegionalNames = Array.from(
    new Set(
      items
        .map((it) => {
          const prov = (it.provinsi || "").trim().toUpperCase();
          if (!prov) return "";
          if (
            prov.includes("JABODETABEK") ||
            prov.includes("DKI") ||
            prov.includes("JAKARTA")
          ) {
            return "JABODETABEK";
          }
          return getPulauOrRegion(prov);
        })
        .filter(Boolean)
    )
  );
  const jumlahRegional =
    uniqueRegionalNames.length > 0 ? uniqueRegionalNames.length : 1;
  const regionalSubtitle =
    uniqueRegionalNames.length > 0
      ? `(${uniqueRegionalNames.join(", ")})`
      : "";

  // 5. Cakupan Wilayah (pulau / daerah dynamically joined with " - ")
  const uniqueIslands = Array.from(
    new Set(
      items
        .map((it) => (it.provinsi ? getPulauOrRegion(it.provinsi) : ""))
        .filter(Boolean)
    )
  );
  const cakupanWilayahStr =
    uniqueIslands.length > 0 ? uniqueIslands.join(" – ") : "JAWA";

  // 6. Top 3 Volume Realisasi
  const sortedByVolume = [...items]
    .filter((it) => Number(it.volumeKg || 0) > 0)
    .sort((a, b) => Number(b.volumeKg || 0) - Number(a.volumeKg || 0))
    .slice(0, 3);

  // 7. Dynamic Regions for Bottom-Right Matrix (grouping by actual entered provinces)
  const dynamicRegionMap = new Map<string, typeof items>();
  items.forEach((it) => {
    const prov = (it.provinsi || "").trim().toUpperCase();
    if (!prov) return;
    if (!dynamicRegionMap.has(prov)) {
      dynamicRegionMap.set(prov, []);
    }
    const existing = dynamicRegionMap.get(prov)!;
    if (
      !existing.some(
        (e) =>
          e.namaRitel.trim().toLowerCase() === it.namaRitel.trim().toLowerCase()
      )
    ) {
      existing.push(it);
    }
  });

  const dynamicRegions = Array.from(dynamicRegionMap.entries()).map(
    ([regionName, regItems]) => ({
      key: regionName,
      label: regionName,
      items: regItems,
    })
  );

  // 8. Adaptive grid & card sizing for Middle Section (Mitra Ritel Yang Dilayani)
  const n = items.length;
  let gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
  let cardHeightClass = "min-h-[105px]";
  let logoHeightClass = "h-11";
  let logoImgClass = "max-h-9";
  let nameTextClass = "text-[11px]";
  let volTextClass = "text-xs";
  let paddingClass = "p-2.5";

  if (n <= 4) {
    gridColsClass =
      n === 1
        ? "grid-cols-1 max-w-xs mx-auto"
        : n === 2
        ? "grid-cols-2 max-w-md mx-auto"
        : n === 3
        ? "grid-cols-3 max-w-2xl mx-auto"
        : "grid-cols-2 sm:grid-cols-4";
    cardHeightClass = "min-h-[120px]";
    logoHeightClass = "h-14";
    logoImgClass = "max-h-12";
    nameTextClass = "text-xs font-semibold";
    volTextClass = "text-sm";
    paddingClass = "p-3.5";
  } else if (n <= 6) {
    gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-6";
    cardHeightClass = "min-h-[110px]";
    logoHeightClass = "h-12";
    logoImgClass = "max-h-10";
    nameTextClass = "text-[11px]";
    volTextClass = "text-xs";
    paddingClass = "p-3";
  } else if (n <= 12) {
    gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    cardHeightClass = "min-h-[100px]";
    logoHeightClass = "h-10";
    logoImgClass = "max-h-8";
    nameTextClass = "text-[11px]";
    volTextClass = "text-xs";
    paddingClass = "p-2.5";
  } else if (n <= 18) {
    gridColsClass = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6";
    cardHeightClass = "min-h-[85px]";
    logoHeightClass = "h-8";
    logoImgClass = "max-h-7";
    nameTextClass = "text-[10px]";
    volTextClass = "text-[11px]";
    paddingClass = "p-2";
  } else {
    // > 18 items
    gridColsClass = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";
    cardHeightClass = "min-h-[75px]";
    logoHeightClass = "h-7";
    logoImgClass = "max-h-6";
    nameTextClass = "text-[9px]";
    volTextClass = "text-[10px]";
    paddingClass = "p-1.5";
  }

  // Format Date
  const dateObj = new Date(data.tanggal);
  const dateFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "7 September 2026";

  const dayFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("id-ID", { weekday: "long" })
    : "Senin";

  const formatNumber = (num: number) =>
    num ? Math.round(num).toLocaleString("id-ID") : "0";

  // Dynamic font scale helpers to ensure cards stay dense and handle large digit inputs smoothly
  const getDynamicNumberFontSize = (valStr: string) => {
    const len = valStr.length;
    if (len <= 7) return "text-2xl sm:text-3xl xl:text-[34px]";
    if (len <= 9) return "text-xl sm:text-2xl xl:text-[28px]";
    if (len <= 11) return "text-lg sm:text-xl xl:text-2xl";
    return "text-base sm:text-lg xl:text-xl";
  };

  const getDynamicUnitFontSize = (valStr: string) => {
    const len = valStr.length;
    if (len <= 7) return "text-sm sm:text-base xl:text-lg";
    if (len <= 9) return "text-xs sm:text-sm xl:text-base";
    return "text-[11px] sm:text-xs";
  };

  const getDynamicRegionalFontSize = (valStr: string) => {
    const len = valStr.length;
    if (len <= 2) return "text-3xl sm:text-4xl xl:text-[42px]";
    if (len <= 4) return "text-2xl sm:text-3xl xl:text-[32px]";
    return "text-xl sm:text-2xl xl:text-[26px]";
  };

  const getDynamicCakupanFontSize = (valStr: string) => {
    const len = valStr.length;
    if (len <= 16) return "text-xs sm:text-sm xl:text-base";
    if (len <= 24) return "text-[11px] sm:text-xs xl:text-sm";
    return "text-[10px] sm:text-[11px] xl:text-xs";
  };

  const totalKgStr = formatNumber(totalKg);
  const totalTonFormatted = totalTon.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const jabodetabekKgStr = formatNumber(jabodetabekKg);

  return (
    <div
      ref={slideRef}
      className="font-slide font-normal w-full bg-white text-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 overflow-hidden select-none relative"
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      {/* ── TOP-RIGHT BACKGROUND ILLUSTRATION (Smooth Corner Background) ──── */}
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
          src="/img/pangan-vol-2.jpeg"
          alt="Pangan Berkualitas untuk Negeri"
          className="w-full h-full object-cover object-right-top"
        />
      </div>

      {/* ── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between pb-2 sm:pb-3 gap-3">
        {/* Left: Bulog Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="https://rzjlkpumrsjpafduhlgt.supabase.co/storage/v1/object/public/logo-img/logo-bulog/logo-bulog.png"
            alt="Bulog Logo"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* Center: Main Title & Date */}
        <div className="text-center flex-1 max-w-xl mx-auto px-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0B2A59] tracking-tight uppercase">
            {data.judul || "PROGRES PEMENUHAN RITEL MODERN"}
          </h1>
          <div className="inline-block relative mt-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#0B2A59] tracking-normal uppercase">
              {data.subjudul || `REALISASI PELAYANAN ${dateFormatted.toUpperCase()}`}
            </h2>
            <div className="h-0.5 bg-amber-500 w-full mt-0.5 rounded-full" />
          </div>
          <p className="text-[10px] sm:text-xs font-normal text-slate-600 tracking-wider mt-1 uppercase">
            DUKUNGAN PASOKAN PANGAN UNTUK INDONESIA LEBIH MAJU
          </p>
        </div>

        {/* Right: Transparent balancing spacer matching Bulog Logo */}
        <div className="w-32 sm:w-40 lg:w-44 shrink-0 hidden md:block pointer-events-none" />
      </div>

      {/* ── 5 SUMMARY METRIC CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[0.95fr_1.5fr_1.1fr_1.15fr_1.3fr] gap-2 xl:gap-2.5 mt-2.5 sm:mt-3 items-stretch">
        {/* Card 1: Dari Bumi Indonesia untuk Keluarga Indonesia (Bleed flush to Left Edge, expanded top & bottom) */}
        <div className="relative -ml-6 sm:-ml-8 -mr-3 sm:-mr-5 -mt-2.5 sm:-mt-3.5 -mb-1.5 sm:-mb-2 z-0 rounded-r-2xl overflow-hidden h-[calc(100%+1rem)] sm:h-[calc(100%+1.375rem)] min-h-[114px] sm:min-h-[124px] xl:min-h-[130px] flex items-center select-none shadow-xs">
          <img
            src="/img/bumi-indonesia.png"
            alt="Dari Bumi Indonesia untuk Keluarga Indonesia"
            className="w-full h-full object-cover object-left select-none pointer-events-none"
            style={{
              maskImage:
                "linear-gradient(to right, black 0%, black 72%, rgba(0,0,0,0.5) 88%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 0%, black 72%, rgba(0,0,0,0.5) 88%, transparent 100%)",
            }}
          />
        </div>

        {/* Card 2: Total Realisasi (Smoothly elevated on top of Card 1's gradasi background) */}
        <div className="relative z-10 bg-[#0B2A59] text-white rounded-2xl p-2.5 sm:p-3 xl:p-3.5 flex items-center gap-2.5 xl:gap-3.5 shadow-xl border border-blue-900/40 h-full min-h-[102px] sm:min-h-[110px] xl:min-h-[116px]">
          {/* Box Icon with Gold/Amber Circular Ring */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 xl:w-15 xl:h-15 rounded-full bg-[#0B2A59] border-[2.5px] border-[#F5A623] flex items-center justify-center shrink-0 shadow-inner">
            <img src="/img/box-icon.png" alt="Box" className="w-7 h-7 sm:w-8 sm:h-8 xl:w-9 xl:h-9 object-contain" />
          </div>

          {/* Total Realisasi Text Block (Dense, bold, centered) */}
          <div className="min-w-0 text-center flex flex-col items-center flex-1">
            <p className="text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-[#F5A623] uppercase tracking-wider leading-none">
              TOTAL REALISASI
            </p>
            <div className="flex items-baseline justify-center gap-0.5 sm:gap-1 my-0.5 sm:my-1">
              <span className={`${getDynamicNumberFontSize(totalKgStr)} font-black tracking-tight text-white leading-none`}>
                {totalKgStr}
              </span>
              <span className={`${getDynamicUnitFontSize(totalKgStr)} font-black text-white ml-0.5 sm:ml-1`}>
                KG
              </span>
            </div>
            <p className={`${totalTonFormatted.length > 10 ? "text-[9px] sm:text-[10px] xl:text-[11px]" : "text-[10px] sm:text-[11px] xl:text-xs"} font-semibold text-white/90 leading-none`}>
              ({totalTonFormatted} TON)
            </p>
          </div>
        </div>

        {/* Card 3: Realisasi Jabodetabek */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 xl:p-3.5 flex items-center gap-2.5 xl:gap-3.5 shadow-sm">
          <div className="w-13 h-13 sm:w-14 sm:h-14 xl:w-15 xl:h-15 rounded-full bg-[#0B2A59] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShoppingCart size={24} className="xl:hidden" strokeWidth={2.5} />
            <ShoppingCart size={27} className="hidden xl:block" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-[#0B2A59] uppercase tracking-wider leading-tight">
              REALISASI<br />JABODETABEK
            </p>
            <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1 sm:mt-1.5">
              <span className={`${getDynamicNumberFontSize(jabodetabekKgStr)} font-black text-[#0B2A59] tracking-tight leading-none`}>
                {jabodetabekKgStr}
              </span>
              <span className={`${getDynamicUnitFontSize(jabodetabekKgStr)} font-black text-[#0B2A59] ml-0.5 sm:ml-1`}>
                KG
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Jumlah Regional */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 xl:p-3.5 flex items-center gap-2.5 xl:gap-3.5 shadow-sm">
          <div className="w-13 h-13 sm:w-14 sm:h-14 xl:w-15 xl:h-15 rounded-full bg-[#0B2A59] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin size={24} className="xl:hidden" strokeWidth={2.5} />
            <MapPin size={27} className="hidden xl:block" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-[#0B2A59] uppercase tracking-wider whitespace-nowrap leading-none">
              JUMLAH REGIONAL
            </p>
            <div className="flex items-baseline gap-1 mt-0.5 sm:mt-1">
              <span className={`${getDynamicRegionalFontSize(String(jumlahRegional))} font-black text-[#0B2A59] tracking-tight leading-none`}>
                {jumlahRegional}
              </span>
              <span className="text-xs sm:text-sm xl:text-base font-black text-[#0B2A59] uppercase ml-1">
                REGIONAL
              </span>
            </div>
            {regionalSubtitle && (
              <p className="text-[9px] sm:text-[10px] xl:text-[11px] font-bold text-[#0B2A59] uppercase truncate mt-1 leading-tight" title={regionalSubtitle}>
                {regionalSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Card 5: Cakupan Wilayah */}
        <div className="sm:col-span-2 lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 xl:p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 xl:gap-2.5">
            <img
              src="/img/indonesia-map.png"
              alt="Peta Wilayah Indonesia"
              className="w-14 sm:w-16 xl:w-20 h-auto shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] xl:text-xs font-extrabold text-[#0B2A59] uppercase tracking-wider leading-tight">
                CAKUPAN WILAYAH
              </p>
              <p
                className={`${getDynamicCakupanFontSize(cakupanWilayahStr)} font-black text-[#0B2A59] tracking-tight truncate mt-0.5 leading-tight`}
                title={cakupanWilayahStr}
              >
                {cakupanWilayahStr}
              </p>
            </div>
          </div>
          <div className="mt-1 sm:mt-1.5 text-center">
            <p className="text-[8px] sm:text-[9px] xl:text-[10px] font-bold text-[#0B2A59] uppercase leading-tight truncate">
              MELAYANI BERBAGAI RITEL MODERN
            </p>
            <p className="text-[8px] sm:text-[9px] xl:text-[10px] font-bold text-[#0B2A59] uppercase leading-tight truncate">
              DI BERBAGAI DAERAH
            </p>
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION: MITRA RITEL YANG DILAYANI ─────────────────────── */}
      <div className="mt-3 sm:mt-3.5 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner Title */}
        <div className="bg-[#0B2A59] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              MITRA RITEL YANG DILAYANI
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-normal">
            <Wheat size={14} />
            <span>BERSAMA MEMPERKUAT RANTAI PASOK PANGAN NASIONAL</span>
          </div>
        </div>

        {/* Dynamic Mitra Ritel Cards Grid */}
        <div className="p-3 bg-slate-50/50">
          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              Belum ada data mitra ritel yang diinput.
            </div>
          ) : (
            <div className={`grid ${gridColsClass} gap-2.5`}>
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`bg-white rounded-lg ${paddingClass} border border-slate-200/80 shadow-sm flex flex-col items-center justify-between text-center ${cardHeightClass} hover:border-blue-400 transition-all`}
                >
                  {/* Retailer Logo */}
                  <div className={`${logoHeightClass} w-full flex items-center justify-center mb-1 px-1`}>
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.namaRitel}
                        className={`${logoImgClass} max-w-full object-contain`}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B2A59] font-bold text-xs flex items-center justify-center">
                        {item.namaRitel.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Retailer Name */}
                  <p
                    className={`${nameTextClass} font-medium text-slate-700 uppercase tracking-tight line-clamp-1`}
                    title={item.namaRitel}
                  >
                    {item.namaRitel}
                  </p>

                  {/* Volume KG */}
                  <p className={`${volTextClass} font-bold text-[#0B2A59] tracking-tight mt-0.5`}>
                    {formatNumber(item.volumeKg)} KG
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: TOP 3 & CAKUPAN WILAYAH ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-4">
        {/* Left Column: Top 3 Volume Realisasi (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-2 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              TOP 3 VOLUME REALISASI
            </span>
          </div>

          <div className="p-3 grid grid-cols-3 gap-2 flex-1 items-center">
            {sortedByVolume.map((topItem, topIdx) => {
              const rankStyles = [
                {
                  badge: "bg-amber-500 text-white",
                  border: "border-amber-300",
                },
                {
                  badge: "bg-slate-400 text-white",
                  border: "border-slate-300",
                },
                {
                  badge: "bg-amber-700 text-white",
                  border: "border-amber-600",
                },
              ];
              const st = rankStyles[topIdx] || rankStyles[0];

              return (
                <div
                  key={topItem.id || topIdx}
                  className={`bg-slate-50/80 rounded-lg p-2 border ${st.border} flex flex-col items-center text-center h-full justify-between shadow-sm`}
                >
                  {/* Rank Badge */}
                  <span
                    className={`w-5 h-5 rounded-full ${st.badge} font-bold text-xs flex items-center justify-center shadow-sm`}
                  >
                    {topIdx + 1}
                  </span>

                  {/* Logo */}
                  <div className="h-8 w-full flex items-center justify-center my-1">
                    {topItem.logoUrl ? (
                      <img
                        src={topItem.logoUrl}
                        alt={topItem.namaRitel}
                        className="max-h-7 max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span className="text-[10px] font-normal text-slate-600">
                        {topItem.namaRitel}
                      </span>
                    )}
                  </div>

                  {/* Name & KG */}
                  <div>
                    <p className="text-[10px] font-medium text-slate-800 uppercase truncate max-w-[80px]">
                      {topItem.namaRitel}
                    </p>
                    <p className="text-[11px] font-bold text-[#0B2A59]">
                      {formatNumber(topItem.volumeKg)} KG
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Placeholders if fewer than 3 */}
            {Array.from({ length: Math.max(0, 3 - sortedByVolume.length) }).map(
              (_, pIdx) => (
                <div
                  key={`top-empty-${pIdx}`}
                  className="bg-slate-50/40 rounded-lg p-2 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 text-[10px] h-full"
                >
                  -
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Cakupan Wilayah dan Mitra Ritel (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-[#0B2A59] text-white px-3.5 py-2 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              CAKUPAN WILAYAH DAN MITRA RITEL
            </span>
          </div>

          {dynamicRegions.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs italic flex-1 flex items-center justify-center">
              Belum ada data cakupan wilayah yang diinput.
            </div>
          ) : (
            <div
              className="grid divide-x divide-slate-100 p-2 flex-1 bg-slate-50/40 text-[10px] overflow-x-auto"
              style={{
                gridTemplateColumns:
                  dynamicRegions.length <= 6
                    ? `repeat(${dynamicRegions.length}, minmax(0, 1fr))`
                    : `repeat(${dynamicRegions.length}, minmax(120px, 1fr))`,
              }}
            >
              {dynamicRegions.map((reg) => (
                <div key={reg.key} className="px-2 flex flex-col min-w-0">
                  {/* Column Header */}
                  <div
                    className="bg-amber-500/10 text-[#0B2A59] font-bold uppercase text-center py-1 px-1 rounded mb-2 tracking-tight text-[9px] truncate"
                    title={reg.label}
                  >
                    {reg.label}
                  </div>

                  {/* Ritel List */}
                  <div className="space-y-1.5 flex-1">
                    {reg.items.map((r, rIdx) => (
                      <div
                        key={r.id || rIdx}
                        className="flex items-center gap-1.5 bg-white p-1 rounded border border-slate-200/60 shadow-2xs min-w-0"
                      >
                        {r.logoUrl ? (
                          <img
                            src={r.logoUrl}
                            alt=""
                            className="h-4 w-4 object-contain shrink-0"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded bg-blue-100 text-[#0B2A59] font-bold text-[8px] flex items-center justify-center shrink-0">
                            {r.namaRitel.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className="font-normal text-slate-800 text-[9px] truncate"
                          title={r.namaRitel}
                        >
                          {r.namaRitel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER BANNER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-3.5 mt-4 border-t border-slate-100 text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 text-amber-700 font-normal italic">
          <Wheat size={14} className="text-amber-500" />
          <span>Sinergi untuk Ketahanan Pangan dan Kesejahteraan Petani</span>
        </div>

        <div className="font-normal text-slate-600">
          {data.sumberCatatan ||
            `Sumber: Realisasi Pelayanan UB Industri, ${dayFormatted} ${dateFormatted}.`}
        </div>
      </div>
    </div>
  );
}
