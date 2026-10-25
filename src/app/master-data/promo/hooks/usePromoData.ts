"use client";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Promo } from "../types";

export const formatRp = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);
};

export const formatNumber = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val);
};

export function usePromoData() {
  const [isMounted, setIsMounted] = useState(false);
  const [isGroupedMode, setIsGroupedMode] = useState(true);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    Swal.fire({
      icon: type,
      title: message,
      toast: true,
      position: "top-end",
      timer: 2500,
      showConfirmButton: false,
      background: "#fff",
      color: "#0f172a",
      customClass: {
        popup: "rounded-2xl border border-slate-100 shadow-xl",
      },
    });
  };

  useEffect(() => {
    setIsMounted(true);

    // Fetch retailers for Dropdown Select
    fetch("/api/ritel")
      .then((res) => res.json())
      .then((res) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        // Deduplicate by name to prevent confusing UI in the selector
        const unique = [];
        const seen = new Set();
        for (const r of data) {
          if (!seen.has(r.namaPt.trim().toUpperCase())) {
            seen.add(r.namaPt.trim().toUpperCase());
            unique.push(r);
          }
        }
        setRetailers(unique);
      });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL("/api/promo", window.location.origin);
      if (selectedRetailerId) {
        url.searchParams.set("ritelId", selectedRetailerId);
      }
      const res = await fetch(url.toString());
      const json = await res.json();
      setIsGroupedMode(json.isGrouped);
      setPromos(json.data || []);
      setCurrentPage(1);
    } catch {
      setPromos([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRetailerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (
    deleteConfirmId: string | null,
    setDeleteConfirmId: (val: string | null) => void
  ) => {
    if (!deleteConfirmId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/promo?id=${encodeURIComponent(deleteConfirmId)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Gagal menghapus promo");

      showToast("success", "Promo berhasil dihapus");
      setPromos((prev) => prev.filter((p) => p.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (ritelId: string, ritelName: string) => {
    const result = await Swal.fire({
      title: "Hapus Seluruh Data Promo?",
      html: `Semua data promo untuk <b class="font-bold">${ritelName}</b> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Hapus Semua!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-[32px] font-sans",
        confirmButton:
          "rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest",
        cancelButton:
          "rounded-xl px-6 py-3 font-black uppercase text-[11px] tracking-widest",
      },
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/promo?ritelId=${ritelId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Gagal menghapus data grup");
        showToast("success", "Seluruh data promo peritel berhasil dihapus");
        loadData();
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Error");
        setIsLoading(false);
      }
    }
  };

  const filtered = promos.filter((p: any) => {
    if (isGroupedMode && !selectedRetailerId) {
      return p.namaPt?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return (p.nomor + p.kegiatan + p.id)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  // Pagination Logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  return {
    isMounted,
    isGroupedMode,
    selectedRetailerId,
    setSelectedRetailerId,
    retailers,
    searchTerm,
    setSearchTerm,
    promos,
    setPromos,
    isLoading,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    saving,
    setSaving,
    showToast,
    loadData,
    handleDelete,
    handleDeleteGroup,
    filtered,
    totalItems,
    totalPages,
    safePage,
    indexOfFirstItem,
    indexOfLastItem,
    currentItems,
  };
}
