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

export const formatDatePremium = (d: any) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MEI",
    "JUN",
    "JUL",
    "AGU",
    "SEP",
    "OKT",
    "NOV",
    "DES",
  ];
  return `${dt.getDate().toString().padStart(2, "0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

export const formatCurrencyPremium = (n: any) => {
  const num = Number(n);
  if (!num || isNaN(num)) return "-";
  return `RP ${num.toLocaleString("id-ID")}`;
};

export function useExpiredCalendar() {
  const [role, setRole] = useState<"pusat" | "rm" | "sitearea" | null>(null);
  const [userRegional, setUserRegional] = useState<string | null>(null);
  const [userSiteArea, setUserSiteArea] = useState<string | null>(null);
  const [regionalData, setRegionalData] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const now = new Date();
  const [selectedRegional, setSelectedRegional] = useState("");
  const [selectedSiteArea, setSelectedSiteArea] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const [poData, setPoData] = useState<any[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // Fetch Role & Regions
  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const r = me?.role === "rm" || me?.role === "sitearea" ? me.role : "pusat";
        setRole(r as any);
        setUserRegional(me?.regional || "");
        setUserSiteArea(me?.siteArea || "");

        if (r === "sitearea") {
          setSelectedRegional(me.regional || "");
          setSelectedSiteArea(me.siteArea || "");
        } else if (r === "rm") {
          setSelectedRegional(me.regional || "");
          setSelectedSiteArea("ALL");
        } else {
          setSelectedRegional("ALL");
          setSelectedSiteArea("ALL");
        }
      } catch {
        setRole("pusat");
      }
    })();

    fetch("/api/unit-produksi")
      .then((res) => res.json())
      .then((data) => {
        const grouped = (data || []).reduce((acc: any, curr: any) => {
          if (!curr.namaRegional) return acc;
          if (!acc[curr.namaRegional]) acc[curr.namaRegional] = [];
          if (curr.siteArea && !acc[curr.namaRegional].includes(curr.siteArea))
            acc[curr.namaRegional].push(curr.siteArea);
          return acc;
        }, {});
        setRegionalData(grouped);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch PO Data
  const fetchPOData = useCallback(async () => {
    setPoLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "5000",
        filterBy: "expired",
        month: selectedMonth,
        year: selectedYear,
        includeItems: "true",
      });
      if (selectedRegional && selectedRegional !== "ALL")
        params.set("regional", selectedRegional);
      if (selectedSiteArea && selectedSiteArea !== "ALL")
        params.set("siteArea", selectedSiteArea);

      const res = await fetch(`/api/po?${params.toString()}`);
      const json = await res.json();
      setPoData(json?.data || []);
    } catch {
      setPoData([]);
    } finally {
      setPoLoading(false);
    }
  }, [selectedRegional, selectedSiteArea, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPOData();
  }, [fetchPOData]);

  // Calendar Logic
  const month = Number(selectedMonth);
  const year = Number(selectedYear);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayRaw = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const formatDateKey = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const groupedPOs = useMemo(() => {
    const map: Record<string, any[]> = {};
    poData.forEach((po) => {
      const raw = po.expiredTgl || po.expired;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(po);
    });
    return map;
  }, [poData]);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [inlineSearch, setInlineSearch] = useState("");
  const [inlineDateFrom, setInlineDateFrom] = useState("");
  const [inlineDateTo, setInlineDateTo] = useState("");

  const filteredDetailPOs = useMemo(() => {
    if (!selectedDateKey || !groupedPOs[selectedDateKey]) return [];
    let list = groupedPOs[selectedDateKey];

    if (inlineSearch.trim()) {
      const q = inlineSearch.toLowerCase();
      list = list.filter((po) => {
        const noPo = String(po.noPo || "").toLowerCase();
        const comp = String(po.RitelModern?.namaPt || po.company || "").toLowerCase();
        const ini = String(po.RitelModern?.inisial || "").toLowerCase();
        return noPo.includes(q) || comp.includes(q) || ini.includes(q);
      });
    }
    if (inlineDateFrom) {
      const from = new Date(inlineDateFrom).getTime();
      list = list.filter((po) => po.tglPo && new Date(po.tglPo).getTime() >= from);
    }
    if (inlineDateTo) {
      const to = new Date(inlineDateTo).getTime() + 86399999;
      list = list.filter((po) => po.tglPo && new Date(po.tglPo).getTime() <= to);
    }
    return list;
  }, [selectedDateKey, groupedPOs, inlineSearch, inlineDateFrom, inlineDateTo]);

  // Reset detail states when date changes
  useEffect(() => {
    setInlineSearch("");
    setInlineDateFrom("");
    setInlineDateTo("");
  }, [selectedDateKey]);

  return {
    role,
    userRegional,
    userSiteArea,
    regionalData,
    isLoading,
    now,
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
    month,
    year,
    daysInMonth,
    startOffset,
    formatDateKey,
    groupedPOs,
    selectedDateKey,
    setSelectedDateKey,
    inlineSearch,
    setInlineSearch,
    inlineDateFrom,
    setInlineDateFrom,
    inlineDateTo,
    setInlineDateTo,
    filteredDetailPOs,
  };
}
