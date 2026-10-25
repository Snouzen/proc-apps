"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { saveProduct } from "@/lib/api";
import { Product } from "./types";
import { useProdukData } from "./hooks/useProdukData";
import ProdukTable from "./components/ProdukTable";
import ProdukFormModal from "./components/ProdukFormModal";
import ProdukDetailModal from "./components/ProdukDetailModal";
import ProdukEditModal from "./components/ProdukEditModal";
import ProdukBulkConfirmModal, {
  BulkDialogState,
} from "./components/ProdukBulkConfirmModal";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), {
  ssr: false,
});

export default function ProdukPage() {
  const {
    products,
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
    showToast,
    shortId,
    handleCopyId,
    loadData,
    handleDelete,
    filtered,
    currentItems,
  } = useProdukData();

  // Local state for modals & forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductSatuanKg, setNewProductSatuanKg] = useState<string>("");
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editSatuan, setEditSatuan] = useState<string>("");

  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const satuan = parseFloat(newProductSatuanKg || "1");
    try {
      await saveProduct(newProductName.trim(), isFinite(satuan) ? satuan : 1);
      showToast("success", "Produk berhasil disimpan");
      setIsLoading(true);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan produk";
      showToast("error", msg);
      return;
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
      setNewProductName("");
      setNewProductSatuanKg("");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setSaving(true);
    try {
      const satuan = parseFloat(editSatuan || "1");
      const res = await fetch("/api/product", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProduct.id,
          name: editName.trim(),
          satuanKg: isFinite(satuan) ? satuan : 1,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Gagal mengupdate produk");
      }
      showToast("success", "Produk diperbarui");
      setIsLoading(true);
      await loadData();
      setEditProduct(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengupdate produk";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const executeProdukBulk = async (replaceDupes: boolean) => {
    if (!bulkDialog) return;
    const { rows, dupeCount, productKey, satuanKey } = bulkDialog;
    try {
      setBulkDialog(null);
      setBulkRunning(true);
      setBulkErrors([]);
      setBulkTotal(rows.length);
      setBulkDone(0);
      let success = 0;
      const existingSet = new Set(
        (products || []).map((p) => (p?.name || "").trim().toLowerCase()),
      );
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const name = String(r[productKey] ?? "").trim();
        if (!name) {
          setBulkDone((d) => d + 1);
          continue;
        }
        const satuanRaw = satuanKey ? Number(r[satuanKey]) : 1;
        const satuan = isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
        const isDupe = existingSet.has(name.trim().toLowerCase());
        if (isDupe && !replaceDupes) {
          setBulkDone((d) => d + 1);
          continue;
        }
        try {
          await saveProduct(name, satuan);
          success++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Gagal menyimpan";
          setBulkErrors((errs) => [...errs, `${name}: ${msg}`]);
        } finally {
          setBulkDone((d) => d + 1);
        }
      }
      showToast(
        bulkErrors.length === 0 ? "success" : "info",
        `Bulk upload selesai. Berhasil: ${success}, Gagal: ${rows.length - success}. Duplikat: ${dupeCount}. Mode: ${replaceDupes ? "REPLACE" : "SKIP"}`,
      );
      setIsLoading(true);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal upload produk. Cek koneksi / server.");
    } finally {
      setIsLoading(false);
      setBulkRunning(false);
      setBulkDialog(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {bulkRunning && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 w-full max-w-[420px]">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Mengunggah Produk</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Memproses {bulkDone}/{bulkTotal}
            </p>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${bulkTotal ? Math.round((bulkDone / bulkTotal) * 100) : 0}%`,
                }}
              />
            </div>
            {bulkErrors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-auto border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 rounded-lg p-2 text-xs text-rose-700 dark:text-rose-300">
                {bulkErrors.slice(0, 5).map((er, idx) => (
                  <div key={idx}>• {er}</div>
                ))}
                {bulkErrors.length > 5 && (
                  <div>...dan {bulkErrors.length - 5} error lainnya</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Master Produk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar SKU Produk
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            suppressHydrationWarning
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload
          </button>
          <button
            suppressHydrationWarning
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            New product
          </button>
        </div>
      </div>

      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          loadData();
        }}
        title="Bulk Upload Produk"
        variant="produk"
      />

      <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            size={18}
          />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari Nama Produk..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:ring-indigo-500/20 dark:focus:border-indigo-500 transition-all text-sm dark:text-slate-200"
          />
        </div>
      </div>

      <ProdukTable
        currentItems={currentItems}
        isLoading={isLoading}
        totalItems={filtered.length}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        setCurrentPage={setCurrentPage}
        shortId={shortId}
        handleCopyId={handleCopyId}
        setViewProduct={setViewProduct}
        setEditProduct={setEditProduct}
        setEditName={setEditName}
        setEditSatuan={setEditSatuan}
        handleDelete={handleDelete}
      />

      <ProdukFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        newProductName={newProductName}
        setNewProductName={setNewProductName}
        newProductSatuanKg={newProductSatuanKg}
        setNewProductSatuanKg={setNewProductSatuanKg}
        handleSubmit={handleSubmit}
      />

      <ProdukDetailModal
        viewProduct={viewProduct}
        onClose={() => setViewProduct(null)}
      />

      <ProdukEditModal
        editProduct={editProduct}
        onClose={() => setEditProduct(null)}
        editName={editName}
        setEditName={setEditName}
        editSatuan={editSatuan}
        setEditSatuan={setEditSatuan}
        handleUpdate={handleUpdate}
        saving={saving}
      />

      <ProdukBulkConfirmModal
        bulkDialog={bulkDialog}
        setBulkDialog={setBulkDialog}
        executeProdukBulk={executeProdukBulk}
      />
    </div>
  );
}
