"use client";

import * as XLSX from "xlsx";
import {
  Archive,
  Package,
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { saveProduct } from "@/lib/api";
import { StatefulButton } from "@/components/ui/stateful-button";
import ExcelBulkModal from "@/components/excel-bulk-modal";

export default function ProdukPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkDialog, setBulkDialog] = useState<{
    rows: any[];
    dupeCount: number;
    productKey: string;
    satuanKey: string | null;
  } | null>(null);
  const [openExcelBulk, setOpenExcelBulk] = useState(false);

  const [products, setProducts] = useState<
    { id: string; name: string; satuanKg?: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [newProductSatuanKg, setNewProductSatuanKg] = useState<string>("");
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [viewProduct, setViewProduct] = useState<{
    id: string;
    name: string;
    satuanKg?: number;
  } | null>(null);
  const [editProduct, setEditProduct] = useState<{
    id: string;
    name: string;
    satuanKg?: number;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editSatuan, setEditSatuan] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const satuan = parseFloat(newProductSatuanKg || "1");
    try {
      await saveProduct(newProductName.trim(), isFinite(satuan) ? satuan : 1);
      showToast("success", "Produk berhasil disimpan");
      // reload list
      setIsLoading(true);
      const res = await fetch("/api/product");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data?.data || []);
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
      const r = await fetch("/api/product");
      const data = await r.json();
      setProducts(Array.isArray(data) ? data : data?.data || []);
      setEditProduct(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengupdate produk";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus produk ini?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/product", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Gagal menghapus produk");
      }
      showToast("success", "Produk dihapus");
      setIsLoading(true);
      const r = await fetch("/api/product");
      const data = await r.json();
      setProducts(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus produk";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const workbook = XLSX.read(event.target?.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      if (!rows.length) {
        showToast("error", "File Excel kosong.");
        e.target.value = "";
        return;
      }
      const norm = (s: string) =>
        (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
      const first = rows[0];
      const candidates = [
        "produk",
        "product",
        "nama produk",
        "nama produk (sku)",
      ];
      const productKey =
        Object.keys(first).find((k) => candidates.includes(norm(k))) ?? null;
      const satuanCandidates = [
        "satuan kg",
        "satuan",
        "kg/pcs",
        "kg per pcs",
        "kg",
      ].map(norm);
      const satuanKey =
        Object.keys(first).find((k) => satuanCandidates.includes(norm(k))) ??
        null;
      if (!productKey) {
        const existing = Object.keys(first).join(", ");
        showToast(
          "error",
          `Kolom tidak dikenali. Gunakan header "Produk". Terbaca: ${existing}`,
        );
        e.target.value = "";
        return;
      }
      const existingSet = new Set(
        (products || []).map((p) => (p?.name || "").trim().toLowerCase()),
      );
      const uploadNames = rows
        .map((r) =>
          String(r[productKey] ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      const dupeCount = uploadNames.filter((n) => existingSet.has(n)).length;
      setBulkDialog({
        rows,
        dupeCount,
        productKey,
        satuanKey,
      });
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
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
      // reload list
      setIsLoading(true);
      const res = await fetch("/api/product");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data?.data || []);
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-[420px]">
            <h3 className="font-bold text-slate-800 mb-2">Mengunggah Produk</h3>
            <p className="text-sm text-slate-500 mb-4">
              Memproses {bulkDone}/{bulkTotal}
            </p>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${bulkTotal ? Math.round((bulkDone / bulkTotal) * 100) : 0}%`,
                }}
              />
            </div>
            {bulkErrors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-auto border border-rose-100 bg-rose-50 rounded-lg p-2 text-xs text-rose-700">
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
          <h1 className="text-2xl font-bold text-slate-800">Master Produk</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar SKU Produk</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenExcelBulk(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Bulk Upload
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-sm"
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
          const loadData = async () => {
            try {
              const res = await fetch("/api/product");
              const result = await res.json();
              const list = Array.isArray(result) ? result : result?.data || [];
              setProducts(list);
            } catch {}
          };
          loadData();
        }}
        title="Bulk Upload Produk"
        variant="produk"
      />

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Nama Produk..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-non focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
          />
        </div>
      </div>
      {bulkDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setBulkDialog(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-blue-50/50">
              <h3 className="text-lg font-extrabold text-slate-800">
                Konfirmasi Bulk Upload
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Total {bulkDialog.rows.length} baris. Duplikat terdeteksi:{" "}
                {bulkDialog.dupeCount}.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium text-slate-500">Produk</th>
                      <th className="p-2 font-medium text-slate-500">
                        Satuan (Kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkDialog.rows.slice(0, 5).map((row, i) => {
                      const name = String(
                        row[bulkDialog.productKey] ?? "",
                      ).trim();
                      const satuanRaw = bulkDialog.satuanKey
                        ? Number(row[bulkDialog.satuanKey])
                        : 1;
                      const satuan =
                        isFinite(satuanRaw) && satuanRaw > 0 ? satuanRaw : 1;
                      return (
                        <tr key={i}>
                          <td className="p-2 text-slate-700">{name}</td>
                          <td className="p-2 text-slate-700">{satuan}</td>
                        </tr>
                      );
                    })}
                    {bulkDialog.rows.length > 5 && (
                      <tr>
                        <td
                          colSpan={2}
                          className="p-2 text-center text-slate-400 italic"
                        >
                          ...dan {bulkDialog.rows.length - 5} data lain
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {bulkDialog.dupeCount > 0 ? (
                  <>
                    <button
                      onClick={() => executeProdukBulk(true)}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                    >
                      Replace Duplikat
                    </button>
                    <button
                      onClick={() => executeProdukBulk(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      Skip Duplikat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => executeProdukBulk(false)}
                    className="col-span-2 px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
                  >
                    Submit
                  </button>
                )}
              </div>
              <button
                onClick={() => setBulkDialog(null)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-[13px] uppercase tracking-widest border-b border-gray-50">
                <th className="px-6 py-4 font-semibold w-48">ID Produk</th>
                <th className="px-6 py-4 font-semibold">Nama Produk</th>
                <th className="px-6 py-4 font-semibold text-center">
                  Satuan (Kg/pcs)
                </th>
                <th className="px-6 py-4 font-semibold w-40 text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-5 text-sm" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-5 text-sm" colSpan={4}>
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                currentItems.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5 text-xs font-bold text-slate-400 tracking-tight">
                      <div className="flex items-center gap-2">
                        <span className="font-mono" title={product.id}>
                          {shortId(product.id)}
                        </span>
                        <button
                          onClick={() => handleCopyId(product.id)}
                          className="p-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200"
                          title="Salin ID"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all">
                          <Package size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-800 text-center tabular-nums">
                      {typeof product.satuanKg === "number"
                        ? product.satuanKg
                        : ""}{" "}
                      Kg
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => setViewProduct(product)}
                          className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditProduct(product);
                            setEditName(product.name);
                            setEditSatuan(String(product.satuanKg ?? 1));
                          }}
                          className="px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > itemsPerPage && (
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-sm text-slate-500">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filtered.length)} of {filtered.length}{" "}
              entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Archive size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Tambah Product
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: PUNOKAWAN 5 KG"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-semibold shadow-sm"
                />
                <p className="mt-2 text-[11px] text-gray-400 italic font-medium">
                  * Gunakan nama SKU resmi (satu kolom &apos;Produk&apos; untuk bulk) *
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Satuan KG (Kg per pcs)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="Misal: 5"
                  value={newProductSatuanKg}
                  onChange={(e) => setNewProductSatuanKg(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-semibold shadow-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-4 border border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 text-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewProduct(null)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Archive size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Detail Produk
                </h3>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-400 font-bold uppercase">
                ID
              </div>
              <div className="text-sm font-mono text-slate-700">
                {viewProduct.id}
              </div>
              <div className="text-xs text-slate-400 font-bold uppercase">
                Nama Produk
              </div>
              <div className="text-sm font-bold text-slate-800">
                {viewProduct.name}
              </div>
              <div className="text-xs text-slate-400 font-bold uppercase">
                Satuan (Kg/pcs)
              </div>
              <div className="text-sm font-bold text-slate-800">
                {viewProduct.satuanKg ?? ""}
              </div>
            </div>
          </div>
        </div>
      )}

      {editProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditProduct(null)}
          ></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Archive size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Edit Produk
                </h3>
              </div>
              <button
                onClick={() => setEditProduct(null)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-semibold shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Satuan KG (Kg per pcs)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={editSatuan}
                  onChange={(e) => setEditSatuan(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-sm font-semibold shadow-sm"
                />
              </div>
              <div className="flex gap-3">
                <StatefulButton
                  variant="cancel"
                  onClick={() => {
                    setEditProduct(null);
                  }}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    if (saving) return;
                    await handleUpdate(new Event("submit") as any);
                  }}
                  className="flex-1"
                >
                  Simpan Perubahan
                </StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
