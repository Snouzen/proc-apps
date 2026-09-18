"use client";

import React from "react";
import {
  ShoppingCart,
  MapPin,
  Trophy,
  BookOpen,
  Wheat,
  Leaf,
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
  daftarRegional?: string | null;
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

  // 1b. Consolidated Items per Retailer (akumulasi volume jika ritel sama diinput di beda wilayah)
  // Menjaga urutan kemunculan pertama, menjumlahkan volumeKg, dan mempertahankan logoUrl
  const consolidatedMap = new Map<string, RealisasiItemData>();
  items.forEach((it) => {
    const cleanName = (it.namaRitel || "").trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const vol = Number(it.volumeKg || 0);

    if (!consolidatedMap.has(key)) {
      consolidatedMap.set(key, {
        ...it,
        namaRitel: cleanName,
        volumeKg: vol,
      });
    } else {
      const existing = consolidatedMap.get(key)!;
      existing.volumeKg += vol;
      if (!existing.logoUrl && it.logoUrl) {
        existing.logoUrl = it.logoUrl;
      }
    }
  });
  const consolidatedItems = Array.from(consolidatedMap.values());

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

  // 4. Regionals: Manual input if provided by user, otherwise automatic based on items
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

  const manualRegionalList = (data.daftarRegional || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const jumlahRegional =
    manualRegionalList.length > 0
      ? manualRegionalList.length
      : uniqueRegionalNames.length > 0
      ? uniqueRegionalNames.length
      : 1;

  const rawSubtitle =
    manualRegionalList.length > 0
      ? manualRegionalList.join(", ")
      : uniqueRegionalNames.length > 0
      ? uniqueRegionalNames.join(", ")
      : "";

  const regionalSubtitle = rawSubtitle
    ? rawSubtitle.startsWith("(") && rawSubtitle.endsWith(")")
      ? rawSubtitle.toUpperCase()
      : `(${rawSubtitle.toUpperCase()})`
    : "";

  // 5. Cakupan Wilayah (pulau / daerah dynamically joined with " – ")
  const uniqueIslands = Array.from(
    new Set(
      items
        .map((it) => (it.provinsi ? getPulauOrRegion(it.provinsi) : ""))
        .filter(Boolean)
    )
  );
  const cakupanWilayahStr =
    uniqueIslands.length > 0 ? uniqueIslands.join(" – ") : "JAWA";

  // 6. Top 3 Volume Realisasi (berdasarkan volume terakumulasi per mitra ritel)
  const sortedByVolume = [...consolidatedItems]
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
  const n = consolidatedItems.length;
  let gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
  let cardHeightClass = "min-h-[74px] sm:min-h-[78px] xl:min-h-[82px]";
  let logoHeightClass = "h-7 sm:h-8";
  let logoImgClass = "max-h-7 sm:max-h-8";
  let nameTextClass = "text-[9.5px] sm:text-[10px]";
  let volTextClass = "text-xs sm:text-[13px]";
  let paddingClass = "py-1.5 px-2";

  if (n <= 4) {
    gridColsClass =
      n === 1
        ? "grid-cols-1 max-w-xs mx-auto"
        : n === 2
        ? "grid-cols-2 max-w-md mx-auto"
        : n === 3
        ? "grid-cols-3 max-w-2xl mx-auto"
        : "grid-cols-2 sm:grid-cols-4";
    cardHeightClass = "min-h-[92px] sm:min-h-[98px]";
    logoHeightClass = "h-9 sm:h-10";
    logoImgClass = "max-h-9 sm:max-h-10";
    nameTextClass = "text-xs font-bold";
    volTextClass = "text-sm sm:text-base";
    paddingClass = "p-2.5";
  } else if (n <= 6) {
    gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-6";
    cardHeightClass = "min-h-[82px] sm:min-h-[88px]";
    logoHeightClass = "h-8 sm:h-9";
    logoImgClass = "max-h-8 sm:max-h-9";
    nameTextClass = "text-[10px] sm:text-[11px]";
    volTextClass = "text-xs sm:text-sm";
    paddingClass = "py-2 px-2.5";
  } else if (n <= 12) {
    gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    cardHeightClass = "min-h-[74px] sm:min-h-[78px] xl:min-h-[82px]";
    logoHeightClass = "h-7 sm:h-8";
    logoImgClass = "max-h-7 sm:max-h-8";
    nameTextClass = "text-[9.5px] sm:text-[10px]";
    volTextClass = "text-xs sm:text-[13px]";
    paddingClass = "py-1.5 px-2";
  } else if (n <= 18) {
    gridColsClass = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6";
    cardHeightClass = "min-h-[68px] sm:min-h-[72px]";
    logoHeightClass = "h-6 sm:h-7";
    logoImgClass = "max-h-6 sm:max-h-7";
    nameTextClass = "text-[9px]";
    volTextClass = "text-[11px] sm:text-xs";
    paddingClass = "py-1 px-1.5";
  } else {
    // > 18 items
    gridColsClass = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";
    cardHeightClass = "min-h-[60px] sm:min-h-[64px]";
    logoHeightClass = "h-5 sm:h-6";
    logoImgClass = "max-h-5 sm:max-h-6";
    nameTextClass = "text-[8.5px]";
    volTextClass = "text-[10px]";
    paddingClass = "p-1";
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
    if (len <= 16) return "text-[12px] sm:text-[12.5px] xl:text-[13.5px]";
    if (len <= 24) return "text-[11px] sm:text-[11.5px] xl:text-[12.5px]";
    return "text-[10px] sm:text-[10.5px] xl:text-[11.5px]";
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
          src="/img/pangan-vol-2.png"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[0.95fr_1.5fr_1.1fr_1.15fr_1.3fr] gap-2 xl:gap-2.5 mt-2.5 sm:mt-3 -mr-3 sm:-mr-5 items-stretch">
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
          {/* Universal fade overlay for canvas/PDF renderers lacking mask-image */}
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-white pointer-events-none" />
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
              <p className="text-[8.5px] sm:text-[9.5px] xl:text-[10.5px] font-bold text-[#0B2A59] uppercase break-words line-clamp-2 mt-0.5 leading-normal pb-0.5" title={regionalSubtitle}>
                {regionalSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Card 5: Cakupan Wilayah */}
        <div className="sm:col-span-2 lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 xl:p-3.5 flex flex-col justify-between items-center text-center shadow-sm h-full">
          {/* Top: Judul Cakupan Wilayah */}
          <p className="text-[11px] sm:text-xs xl:text-[13px] font-extrabold text-[#0B2A59] uppercase tracking-wider leading-none">
            CAKUPAN WILAYAH
          </p>

          {/* Middle: Peta Wilayah Indonesia di Tengah */}
          <div className="my-auto py-0.5 flex items-center justify-center w-full flex-1">
            <img
              src="/img/indonesia-map.png"
              alt="Peta Wilayah Indonesia"
              className="w-full max-w-[170px] sm:max-w-[195px] xl:max-w-[215px] h-auto max-h-12 sm:max-h-13 xl:max-h-14 object-contain"
            />
          </div>

          {/* Bottom: Teks Melayani Ritel Modern */}
          <div className="w-full text-center">
            <p className="text-[8px] sm:text-[8.5px] xl:text-[9.5px] font-bold text-[#0B2A59] uppercase leading-normal pb-0.5 truncate">
              MELAYANI RITEL MODERN
            </p>
            <p className="text-[8px] sm:text-[8.5px] xl:text-[9.5px] font-bold text-[#0B2A59] uppercase leading-normal pb-0.5 truncate">
              DI BERBAGAI DAERAH
            </p>
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION: MITRA RITEL YANG DILAYANI ─────────────────────── */}
      <div className="mt-2.5 sm:mt-3 -mx-3 sm:-mx-5 rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        {/* Banner Title */}
        <div className="bg-[#0B2A59] text-white px-4 sm:px-5 py-1.5 sm:py-2 flex items-center justify-between">
          <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider">
            MITRA RITEL YANG DILAYANI
          </span>
          <div className="flex items-center gap-1.5 text-white/95 text-[10px] sm:text-[11px] font-medium tracking-wide">
            <Leaf size={14} className="text-[#F5A623] fill-[#F5A623]/40 shrink-0" />
            <span>BERSAMA MEMPERKUAT RANTAI PASOK PANGAN NASIONAL</span>
          </div>
        </div>

        {/* Dynamic Mitra Ritel Cards Grid */}
        <div className="p-2 sm:p-2.5 bg-slate-50/40">
          {consolidatedItems.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs italic">
              Belum ada data mitra ritel yang diinput.
            </div>
          ) : (
            <div className={`grid ${gridColsClass} gap-1.5 sm:gap-2`}>
              {consolidatedItems.map((item, idx) => (
                <div
                  key={item.id || item.namaRitel || idx}
                  className={`bg-white rounded-xl ${paddingClass} border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center ${cardHeightClass} hover:border-blue-400 transition-all`}
                >
                  {/* Retailer Logo */}
                  <div className={`${logoHeightClass} w-full flex items-center justify-center px-1`}>
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.namaRitel}
                        className={`${logoImgClass} max-w-full object-contain`}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-blue-50 border border-blue-100 text-[#0B2A59] font-black text-[10px] sm:text-xs flex items-center justify-center shadow-2xs">
                        {item.namaRitel.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Retailer Name */}
                  <p
                    className={`${nameTextClass} font-bold text-slate-800 uppercase tracking-tight line-clamp-1 leading-normal pb-0.5 mt-0.5 max-w-full px-0.5`}
                    title={item.namaRitel}
                  >
                    {item.namaRitel}
                  </p>

                  {/* Volume KG */}
                  <p className={`${volTextClass} font-black text-[#0B2A59] tracking-tight leading-none mt-0.5`}>
                    {formatNumber(item.volumeKg)} KG
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: TOP 3 & CAKUPAN WILAYAH ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 mt-2.5 sm:mt-3 -mx-3 sm:-mx-5 items-stretch">
        {/* Left Column: Top 3 Volume Realisasi (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5">
            <Trophy size={15} className="text-[#F5A623] shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-[#F5A623]">
                TOP 3
              </span>
              <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-white">
                VOLUME REALISASI
              </span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 items-stretch">
            {sortedByVolume.map((topItem, topIdx) => {
              const rankStyles = [
                {
                  badge: "bg-[#E5A919] text-white",
                  border: "border-amber-300 ring-1 ring-amber-300/30",
                },
                {
                  badge: "bg-[#8C9AA8] text-white",
                  border: "border-slate-300 ring-1 ring-slate-300/30",
                },
                {
                  badge: "bg-[#A86E4B] text-white",
                  border: "border-[#B87333]/40 ring-1 ring-[#B87333]/20",
                },
              ];
              const st = rankStyles[topIdx] || rankStyles[0];

              return (
                <div
                  key={topItem.id || topIdx}
                  className={`bg-white rounded-xl p-1.5 sm:p-2 border ${st.border} flex flex-col items-center justify-between text-center shadow-2xs h-full`}
                >
                  {/* Rank Badge + Logo side-by-side */}
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full">
                    <span
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${st.badge} font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {topIdx + 1}
                    </span>
                    <div className="h-6 sm:h-7 flex-1 flex items-center justify-center px-0.5">
                      {topItem.logoUrl ? (
                        <img
                          src={topItem.logoUrl}
                          alt={topItem.namaRitel}
                          className="max-h-5 sm:max-h-6 max-w-full object-contain"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-blue-50 border border-blue-100 text-[#0B2A59] font-bold text-[8px] flex items-center justify-center">
                          {topItem.namaRitel.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <p
                    className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-800 uppercase truncate w-full mt-0.5 leading-normal pb-0.5"
                    title={topItem.namaRitel}
                  >
                    {topItem.namaRitel}
                  </p>

                  {/* Volume KG */}
                  <p className="text-xs sm:text-[13px] xl:text-sm font-black text-[#0B2A59] tracking-tight leading-none mt-0.5">
                    {formatNumber(topItem.volumeKg)} KG
                  </p>
                </div>
              );
            })}

            {/* Placeholders if fewer than 3 */}
            {Array.from({ length: Math.max(0, 3 - sortedByVolume.length) }).map(
              (_, pIdx) => (
                <div
                  key={`top-empty-${pIdx}`}
                  className="bg-slate-50/40 rounded-xl p-2 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 text-[10px] h-full"
                >
                  -
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Cakupan Wilayah dan Mitra Ritel (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-[#0B2A59] text-white px-3.5 py-1.5 sm:py-2 flex items-center gap-2">
            <BookOpen size={15} className="text-[#F5A623] shrink-0" />
            <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider">
              CAKUPAN WILAYAH DAN MITRA RITEL
            </span>
          </div>

          {dynamicRegions.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs italic flex-1 flex items-center justify-center">
              Belum ada data cakupan wilayah yang diinput.
            </div>
          ) : (
            <div
              className="grid divide-x divide-slate-200/80 p-1.5 sm:p-2 flex-1 bg-white text-[10px] overflow-x-auto items-stretch"
              style={{
                gridTemplateColumns:
                  dynamicRegions.length <= 6
                    ? `repeat(${dynamicRegions.length}, minmax(0, 1fr))`
                    : `repeat(${dynamicRegions.length}, minmax(110px, 1fr))`,
              }}
            >
              {dynamicRegions.map((reg) => (
                <div key={reg.key} className="px-1.5 sm:px-2 flex flex-col min-w-0 overflow-hidden">
                  {/* Column Header: Warm Beige Banner */}
                  <div
                    className="bg-[#F5EFE6] text-[#0B2A59] font-bold uppercase text-center py-0.5 sm:py-1 px-1 rounded-md mb-1.5 tracking-tight text-[8.5px] sm:text-[9.5px] truncate leading-tight shadow-2xs"
                    title={reg.label}
                  >
                    {reg.label}
                  </div>

                  {/* Ritel List: Tight, borderless rows */}
                  <div className="space-y-1 flex-1">
                    {reg.items.map((r, rIdx) => (
                      <div
                        key={r.id || rIdx}
                        className="flex items-center gap-1.5 py-0.5 min-w-0 overflow-hidden"
                      >
                        {r.logoUrl ? (
                          <img
                            src={r.logoUrl}
                            alt=""
                            className="max-h-4 sm:max-h-4.5 max-w-[45px] sm:max-w-[55px] object-contain shrink-0"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-blue-100 text-[#0B2A59] font-bold text-[8px] flex items-center justify-center shrink-0">
                            {r.namaRitel.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span
                          className="font-semibold text-slate-700 text-[8.5px] sm:text-[9.5px] truncate leading-normal pb-0.5 min-w-0 flex-1 block"
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
      <div className="flex flex-col sm:flex-row items-center justify-between pt-2 sm:pt-2.5 mt-2.5 sm:mt-3 -mx-3 sm:-mx-5 px-1 border-t border-slate-200/80 text-[10.5px] sm:text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 text-amber-800/90 font-medium italic">
          <Leaf size={14} className="text-amber-500 fill-amber-400/40 shrink-0" />
          <span>Sinergi untuk Ketahanan Pangan dan Kesejahteraan Petani</span>
        </div>

        <div className="font-normal text-slate-600 flex items-center">
          <span>
            {data.sumberCatatan ||
              `Sumber: Realisasi Pelayanan UB Industri, ${dayFormatted} ${dateFormatted}.`}
          </span>
          <span className="hidden sm:inline-block w-8 sm:w-10 h-0.5 bg-[#F5A623] rounded-full ml-2" />
        </div>
      </div>
    </div>
  );
}
