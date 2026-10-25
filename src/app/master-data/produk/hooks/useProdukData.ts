"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAutoRefreshTick } from "@/components/auto-refresh";
import { Product } from "../types";

export function useProdukData() {
  const refreshTick = useAutoRefreshTick();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const shortId = (id: string) =>
    id && id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id;

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast("success", "ID disalin");
    } catch {
      showToast("error", "Gagal menyalin ID");
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading((v) => v || products.length === 0);
    try {
      const res = await fetch("/api/product");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
      else if (Array.isArray(data?.data)) setProducts(data.data);
      else setProducts([]);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    loadData();
  }, [refreshTick, loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus produk ini?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/product?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Gagal menghapus produk");
      }
      showToast("success", "Produk dihapus");
      setIsLoading(true);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus produk";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  return {
    products,
    setProducts,
    isLoading,
    setIsLoading,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    saving,
    setSaving,
    toast,
    setToast,
    showToast,
    shortId,
    handleCopyId,
    loadData,
    handleDelete,
    filtered,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    currentItems,
  };
}
