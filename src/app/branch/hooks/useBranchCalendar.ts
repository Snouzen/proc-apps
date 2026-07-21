import { useState, useEffect, useMemo, useCallback } from "react";
import { getMe } from "@/lib/me";

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const formatDateId = (d: any) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function useBranchCalendar() {
  // ── Role & User State ──
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);

  // ── Dynamic Data ──
  const [regionalData, setRegionalData] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // ── Filter State ──
  const now = new Date();
  const [selectedRegional, setSelectedRegional] = useState("");
  const [selectedSiteArea, setSelectedSiteArea] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  // ── PO Data ──
  const [poData, setPoData] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // ── UI State Below Calendar ──
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // ── State Inline Table ──
  const [inlineSearch, setInlineSearch] = useState("");
  const [inlineDateFrom, setInlineDateFrom] = useState("");
  const [inlineDateTo, setInlineDateTo] = useState("");

  const [selectedDetailPO, setSelectedDetailPO] = useState<any>(null);

  // Reset state saat ganti tanggal
  useEffect(() => {
    setInlineSearch("");
    setInlineDateFrom("");
    setInlineDateTo("");
  }, [selectedDateKey]);

  // ── Fetch Role ──
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const r = me?.role === "rm" || me?.role === "sitearea" 
          ? (me.role as "rm" | "sitearea") 
          : "pusat";
        
        setRole(r as any);

        // Ekstrak data asli & Normalisasi Fallback
        const reg = me?.regional || "";
        const emailPrefix = me?.email ? me.email.split('@')[0].toUpperCase() : "";
        
        // Normalisasi: SPPSUMBAWA -> SPP SUMBAWA, SPBDKI -> SPB DKI
        let formattedSite = emailPrefix;
        if (emailPrefix.startsWith("SPP") && emailPrefix.length > 3) {
            formattedSite = "SPP " + emailPrefix.substring(3);
        } else if (emailPrefix.startsWith("SPB") && emailPrefix.length > 3) {
            formattedSite = "SPB " + emailPrefix.substring(3);
        }

        const site = me?.siteArea || formattedSite;
        
        setUserRegional(reg);
        setUserSiteArea(site);

        // KUNCI STATE ABSOLUT
        if (r === "sitearea") {
          setSelectedRegional(reg);
          setSelectedSiteArea(site); 
        } else if (r === "rm") {
          setSelectedRegional(reg);
          setSelectedSiteArea("ALL");
        } else {
          setSelectedRegional("ALL");
          setSelectedSiteArea("ALL");
        }
      } catch {
        setRole("pusat");
      }
    })();
  }, []);

  // ── Fetch Regional Data from API ──
  const JUNK_VALUES = [
    "unknown",
    "site area belum ada unit produksi",
    "belum ada",
    "n/a",
    "none",
    "-",
    "",
  ];
  const isJunk = (v?: string | null) =>
    !v || JUNK_VALUES.includes(v.trim().toLowerCase());

  const fetchRegions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/unit-produksi", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];

      const grouped = list.reduce(
        (acc: Record<string, string[]>, curr: any) => {
          const reg = curr.namaRegional;
          const site = curr.siteArea;
          // Skip junk regional or junk site area
          if (isJunk(reg)) return acc;
          if (!acc[reg]) acc[reg] = [];
          if (!isJunk(site) && !acc[reg].includes(site)) acc[reg].push(site);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      for (const key of Object.keys(grouped)) {
        grouped[key].sort();
      }

      setRegionalData(grouped);
    } catch {
      setRegionalData({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // ── Fetch PO Data ──
  const fetchPOData = useCallback(async () => {
    setPoLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "5000"); // UX FIX: Large limit for calendar
      params.set("group", "schedule_page");
      params.set("includeUnknown", "true");
      params.set("month", selectedMonth);
      params.set("year", selectedYear);
      if (selectedRegional && selectedRegional !== "ALL")
        params.set("regional", selectedRegional);
      if (selectedSiteArea && selectedSiteArea !== "ALL")
        params.set("siteArea", selectedSiteArea);

      const res = await fetch(`/api/po?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      const list = Array.isArray((json as any)?.data)
        ? (json as any).data
        : Array.isArray(json)
          ? json
          : [];
      setPoData(list);
    } catch {
      setPoData([]);
    } finally {
      setPoLoading(false);
    }
  }, [selectedRegional, selectedSiteArea, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPOData();
    setSelectedDateKey(null); // Reset detail when location changes
  }, [fetchPOData]);

  // ── Derived Options ──
  const regionalOptions = useMemo(() => {
    if (role !== "pusat" && selectedRegional) {
      return [{ value: selectedRegional, label: selectedRegional }];
    }
    
    const base = Object.keys(regionalData).sort().map((r) => ({ value: r, label: r }));
    return [{ value: "ALL", label: "Semua Regional" }, ...base];
  }, [regionalData, role, selectedRegional]);

  const siteAreaOptions = useMemo(() => {
    if (role === "sitearea") {
      const siteLabel = userSiteArea || selectedSiteArea;
      return [{ value: siteLabel, label: siteLabel }];
    }

    if (!selectedRegional || selectedRegional === "ALL") {
      return [{ value: "ALL", label: "Semua Site Area" }];
    }
    
    const sites = regionalData[selectedRegional] || [];
    const base = sites.map((s) => ({ value: s, label: s }));
    return [{ value: "ALL", label: "Semua Site Area" }, ...base];
  }, [selectedRegional, regionalData, role, userSiteArea, selectedSiteArea]);

  const monthOptions = MONTH_NAMES.map((m, i) => ({
    value: String(i + 1),
    label: m,
  }));

  const yearOptions = YEARS.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  // ── Calendar Logic ──
  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() returns 0=Sun, convert to Mon=0 based
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1; // Mon-based

  const formatDateKey = (y: number, m: number, d: number) => {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  // Group POs by tglkirim date string (YYYY-MM-DD)
  const groupedPOs = useMemo(() => {
    const map: Record<string, any[]> = {};
    poData.forEach((po) => {
      const raw = po.tglkirim || po.tglKirim;
      if (!raw) return;

      const d = new Date(raw);
      if (isNaN(d.getTime())) return;

      const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

      if (!map[key]) map[key] = [];
      map[key].push(po);
    });
    return map;
  }, [poData]);

  const totalScheduled = useMemo(() => {
    return poData.filter((po) => po.tglkirim || po.tglKirim).length;
  }, [poData]);

  const totalUnscheduled = poData.filter(
    (po) => !po.tglkirim && !po.tglKirim,
  ).length;

  const filteredDetailPOs = useMemo(() => {
    if (!selectedDateKey || !groupedPOs[selectedDateKey]) return [];
    let list = groupedPOs[selectedDateKey];

    if (inlineSearch.trim()) {
      const q = inlineSearch.toLowerCase();
      list = list.filter((po) => {
        const noPo = String(po.noPo || "").toLowerCase();
        const noInv = String(po.noInvoice || "").toLowerCase();
        const comp = String(
          po.RitelModern?.namaPt || po.company || "",
        ).toLowerCase();
        const ini = String(po.RitelModern?.inisial || "").toLowerCase();
        return (
          noPo.includes(q) ||
          noInv.includes(q) ||
          comp.includes(q) ||
          ini.includes(q)
        );
      });
    }
    if (inlineDateFrom) {
      const from = new Date(inlineDateFrom).getTime();
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() >= from,
      );
    }
    if (inlineDateTo) {
      const to = new Date(inlineDateTo).getTime() + 86399999; // End of day
      list = list.filter(
        (po) => po.tglPo && new Date(po.tglPo).getTime() <= to,
      );
    }
    return list;
  }, [selectedDateKey, groupedPOs, inlineSearch, inlineDateFrom, inlineDateTo]);

  // ── Handlers ──
  const handleRegionalChange = (val: string) => {
    setSelectedRegional(val);
    setSelectedSiteArea("ALL");
    setSelectedDateKey(null);
  };

  const handlePrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(String(m));
    setSelectedYear(String(y));
    setSelectedDateKey(null);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
  };

  const formatDate = (d: any) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
  };

  const formatCurrency = (n: any) => {
    const num = Number(n);
    if (!num || isNaN(num)) return "-";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return {
    role,
    userRegional,
    userSiteArea,
    regionalData,
    isLoading,
    selectedRegional,
    setSelectedRegional,
    selectedSiteArea,
    setSelectedSiteArea,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    poData,
    poLoading,
    selectedDateKey,
    setSelectedDateKey,
    inlineSearch,
    setInlineSearch,
    inlineDateFrom,
    setInlineDateFrom,
    inlineDateTo,
    setInlineDateTo,
    selectedDetailPO,
    setSelectedDetailPO,
    regionalOptions,
    siteAreaOptions,
    monthOptions,
    yearOptions,
    month,
    year,
    daysInMonth,
    startOffset,
    groupedPOs,
    totalScheduled,
    totalUnscheduled,
    filteredDetailPOs,
    handleRegionalChange,
    handlePrevMonth,
    handleNextMonth,
    isToday,
    formatDate,
    formatCurrency,
    formatDateKey,
  };
}
