"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export function useUnitProduksiData() {
  const refreshTick = useAutoRefreshTick();
  const [dataUnit, setDataUnit] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading((v) => v || dataUnit.length === 0);
    try {
      const res = await fetch("/api/unit-produksi");
      const result = await res.json();
      setDataUnit(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      console.error("Gagal load unit produksi:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dataUnit.length]);

  useEffect(() => {
    loadData();
  }, [refreshTick, loadData]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const safeDataUnit = Array.isArray(dataUnit) ? dataUnit : [];

  const groupedData = useMemo(() => {
    const grouped = safeDataUnit.reduce((acc: any[], item: any) => {
      const regionalName = item?.namaRegional ?? item?.regional ?? "";
      const siteObj = {
        name: item?.siteArea ?? item?.site ?? "",
        alamat: item?.alamat ?? "",
        managerOperasional: item?.managerOperasional ?? "",
      };
      const existingGroup = acc.find((g) => g.nama === regionalName);
      if (existingGroup) {
        existingGroup.sites.push(siteObj);
      } else {
        acc.push({
          id: item?.idRegional ?? regionalName.replace(/\s+/g, "-"),
          nama: regionalName,
          sites: [siteObj],
        });
      }
      return acc;
    }, []);

    // Sort grouped data alphabetically (A-Z) by regional name
    grouped.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
    // Sort sites within each regional alphabetically by site name
    grouped.forEach((group: any) => {
      group.sites.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [safeDataUnit]);

  const regionalOptions = useMemo(() => {
    return Array.from(new Set(groupedData.map((g: any) => g.nama)))
      .filter(Boolean)
      .map((name: string) => ({ value: name, label: name }));
  }, [groupedData]);

  const filteredData = useMemo(() => {
    return groupedData.filter(
      (item: any) =>
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sites.some((s: any) =>
          (s?.name || s || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
    );
  }, [groupedData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return {
    isMounted,
    dataUnit,
    setDataUnit,
    isLoading,
    setIsLoading,
    loadData,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    expandedRows,
    setExpandedRows,
    toggleRow,
    toast,
    setToast,
    showToast,
    groupedData,
    regionalOptions,
    filteredData,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    currentItems,
  };
}
