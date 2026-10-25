"use client";

import { useState, useEffect } from "react";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export const companyMapping: Record<string, string> = {
  "PERUM BULOG - UBSN": "BOSSFOOD",
  "PT GRACIA MITRA SELARAS": "MARKET CITY",
  "PT SUMBER ALFARIA TRIJAYA, TBK": "ALFAMART",
  "PT LUCKY STRATEGIS": "GRAND LUCKY",
  "PT MITRA BELANJA ANDA": "GRAND LUCKY",
  "PT HOKKY TE IT": "GRAND LUCKY",
  "PT LUCKY BERSAMA": "GRAND LUCKY",
  "PT LION SUPER INDO (LSI)": "SUPERINDO",
  "PT TRANS RITEL INDONESIA": "TRANSMART",
  "PT TRANS GROSIR INDONESIA": "GROSERINDO",
  "CV HOKKI FAMILY": "HOKKY SURABAYA",
  "PT HOKKY PRADANA UTAMA": "HOKKY SURABAYA",
  "PT NAGA SWALAYAN": "NAGA SWALAYAN",
  "PT TIP TOP": "TIP TOP",
};

export function useRitelData() {
  const refreshTick = useAutoRefreshTick();
  const [dataRitel, setDataRitel] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const safeDataRitel = Array.isArray(dataRitel) ? dataRitel : [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading((v) => v || dataRitel.length === 0);
      setLoadError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

      try {
        const fetchOnce = async () => {
          const res = await fetch("/api/ritel", {
            signal: controller.signal,
            cache: "no-store",
          });
          let result: unknown;
          try {
            result = await res.json();
          } catch {
            return {
              ok: false,
              statusText: res.statusText,
              error: "Response bukan JSON. Cek API / server.",
              data: null,
            };
          }
          if (!res.ok) {
            const msg =
              (result as { error?: string })?.error ||
              res.statusText ||
              "Gagal mengambil data";
            return {
              ok: false,
              statusText: res.statusText,
              error: msg,
              data: null,
            };
          }
          const list = Array.isArray(result)
            ? result
            : ((result as { data?: unknown[] })?.data ?? []);
          return {
            ok: true,
            statusText: res.statusText,
            error: null,
            data: list,
          };
        };

        let lastErr: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const out = await fetchOnce();
          if (out.ok) {
            setDataRitel(out.data as any[]);
            lastErr = null;
            break;
          }
          lastErr = out.error || "Gagal mengambil data";
          const isMaxClient =
            typeof lastErr === "string" &&
            lastErr.toLowerCase().includes("maxclientsinsessionmode");
          if (!isMaxClient || attempt === 2) break;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
        if (lastErr) {
          if (String(lastErr).toLowerCase().includes("unauthorized")) {
            setLoadError(null);
          } else {
            setLoadError(lastErr);
          }
          if (dataRitel.length === 0) setDataRitel([]);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Gagal load data:", err);
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            setLoadError(
              "Timeout. Database/API tidak merespons. Cek DATABASE_URL dan koneksi."
            );
          } else if (err.message.toLowerCase().includes("unauthorized")) {
            setLoadError(null);
          } else {
            setLoadError(err.message);
          }
        } else {
          setLoadError("Tidak bisa connect ke server. Cek koneksi / database.");
        }
        if (dataRitel.length === 0) setDataRitel([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    loadData();
  }, [refreshTick]);

  const groupedData = safeDataRitel.reduce((acc: any[], item: any) => {
    let group = acc.find((g) => g.namaPt === item.namaPt);
    if (!group) {
      group = {
        displayId: item.id,
        namaPt: item.namaPt,
        logoPt: item.logoPt,
        inisials: {} as Record<
          string,
          {
            logoInisial?: string | null;
            provinsi?: string | null;
            stores: { id: string; tujuan: string }[];
          }
        >,
      };
      acc.push(group);
    }

    if (item.logoPt && !group.logoPt) group.logoPt = item.logoPt;

    const alias = String(item.inisial ?? "—");
    const hasStore = item.tujuan && String(item.tujuan).trim().length > 0;

    if (alias !== "—" || hasStore) {
      if (!group.inisials[alias]) {
        group.inisials[alias] = {
          logoInisial: item.logoInisial,
          provinsi: item.provinsi,
          stores: [],
        };
      }
      if (item.logoInisial && !group.inisials[alias].logoInisial) {
        group.inisials[alias].logoInisial = item.logoInisial;
      }
      if (item.provinsi && !group.inisials[alias].provinsi) {
        group.inisials[alias].provinsi = item.provinsi;
      }
      if (hasStore) {
        group.inisials[alias].stores.push({ id: item.id, tujuan: item.tujuan });
      }
    }
    return acc;
  }, []);

  const existingCompanies = Array.from(
    new Set(safeDataRitel.map((item) => item.namaPt))
  ).sort();

  const allCompanyOptions = Array.from(
    new Set([...Object.keys(companyMapping), ...existingCompanies])
  ).sort();

  const filteredData = groupedData
    .filter((item) => {
      const term = searchTerm.toLowerCase();
      const matchPt = item.namaPt.toLowerCase().includes(term);
      const matchAlias = Object.keys(item.inisials).some((a) =>
        a.toLowerCase().includes(term)
      );
      const matchStore = Object.values(item.inisials).some((data: any) =>
        data.stores.some((s: any) =>
          String(s.tujuan || "")
            .toLowerCase()
            .includes(term)
        )
      );
      return matchPt || matchAlias || matchStore;
    })
    .sort((a, b) => a.namaPt.localeCompare(b.namaPt));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return {
    dataRitel,
    setDataRitel,
    isLoading,
    setIsLoading,
    loadError,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    groupedData,
    filteredData,
    allCompanyOptions,
    currentItems,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    safeDataRitel,
    companyMapping,
  };
}
