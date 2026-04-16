"use client";

import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Copy,
  TrendingDown,
  Percent,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAutoRefreshTick } from "@/components/auto-refresh";

export default function PromoPage() {
  const refreshTick = useAutoRefreshTick();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPromoName, setNewPromoName] = useState("");
  const [newPromoNominal, setNewPromoNominal] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [promos, setPromos] = useState<
    { id: string; namaPromo: string; nominal: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [viewPromo, setViewPromo] = useState<{
    id: string;
    namaPromo: string;
    nominal: number;
  } | null>(null);

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

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  useEffect(() => {
    const load = async () => {
      if (promos.length === 0) setIsLoading(true);
      try {
        const res = await fetch("/api/promo");
        const json = await res.json();
        setPromos(json.data || []);
      } catch {
        setPromos([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPromo: newPromoName.trim(),
          nominal: Number(newPromoNominal),
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan promo");

      showToast("success", "Promo berhasil disimpan");
      
      // Update data di background tanpa bikin UI Stuck/Loading
      fetch("/api/promo")
        .then(r => r.json())
        .then(json => setPromos(json.data || []));

      setIsModalOpen(false);
      setNewPromoName("");
      setNewPromoNominal("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus promo ini?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/promo?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus promo");
      
      showToast("success", "Promo berhasil dihapus");
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = promos.filter((p) =>
    p.namaPromo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const showingFrom = filtered.length === 0 ? 0 : indexOfFirstItem + 1;
  const showingTo = Math.min(indexOfLastItem, filtered.length);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Master Promo</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar Potongan & Penyesuaian Tagihan</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 text-sm"
        >
          <Plus size={18} />
          Tambah Promo
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="relative max-w-md group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-slate-900 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari Nama Promo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:bg-white transition-all text-sm font-bold"
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto text-[13px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-[0.2em] font-black border-b border-gray-50">
                <th className="px-8 py-5 w-48">ID Promo</th>
                <th className="px-8 py-5">Nama Promo</th>
                <th className="px-8 py-5 text-right">Nominal</th>
                <th className="px-8 py-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold text-slate-700">
              {isLoading ? (
                <tr><td className="px-8 py-10" colSpan={4}>Loading data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-8 py-10 text-slate-300 italic" colSpan={4}>Belum ada data promo.</td></tr>
              ) : (
                currentItems.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-slate-400 font-mono tracking-tighter">
                      <div className="flex items-center gap-2">
                         <span>{shortId(promo.id)}</span>
                         <button onClick={() => handleCopyId(promo.id)} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 transition-all">
                            <Copy size={12} />
                         </button>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span>{promo.namaPromo}</span>
                    </td>
                    <td className="px-8 py-5 text-right text-rose-600 tabular-nums">
                      {formatRp(promo.nominal)}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex gap-2">
                        <button onClick={() => setViewPromo(promo)} className="p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                           <Eye size={16} />
                        </button>
                        <button onClick={() => handleDelete(promo.id)} className="p-2.5 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
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
          <div className="flex items-center justify-between px-8 py-5 bg-slate-50/30">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Showing {showingFrom}-{showingTo} of {filtered.length} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-5 py-2 text-xs font-black bg-white border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-5 py-2 text-xs font-black bg-white border border-slate-100 rounded-xl disabled:opacity-30 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add Promo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                  <Percent size={20} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800">Tambah Promo</h3>
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Master Data Setting</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-300 hover:text-rose-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nama Promo</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Promo Ramadhan 2024"
                  value={newPromoName}
                  onChange={(e) => setNewPromoName(e.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl focus:ring-8 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Input Nominal Rp..."
                  value={newPromoNominal ? formatRp(Number(newPromoNominal)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    setNewPromoNominal(rawValue);
                  }}
                  className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl focus:ring-8 focus:ring-slate-900/5 focus:bg-white transition-all font-bold text-slate-700 text-3xl tabular-nums"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black hover:bg-slate-200 transition-all text-xs uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95 text-xs uppercase disabled:opacity-50"
                >
                  {saving ? "Simpan..." : "Simpan Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Detail */}
      {viewPromo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewPromo(null)}></div>
           <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Detail Master Promo</h2>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase block mb-1">Promo ID</label>
                    <p className="font-mono text-sm text-slate-500 break-all">{viewPromo.id}</p>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase block mb-1">Nama Promo</label>
                    <p className="text-xl font-black text-slate-800">{viewPromo.namaPromo}</p>
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-300 uppercase block mb-1">Standard Nominal</label>
                    <p className="text-3xl font-black text-rose-600">{formatRp(viewPromo.nominal)}</p>
                 </div>
              </div>
              <button 
                onClick={() => setViewPromo(null)}
                className="mt-10 w-full py-4 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-all text-xs"
              >
                TUTUP
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
