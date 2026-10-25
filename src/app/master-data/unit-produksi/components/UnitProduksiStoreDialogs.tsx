"use client";

import React from "react";
import { X, Globe2, MapPin, Edit2 } from "lucide-react";
import SmoothSelect from "@/components/ui/smooth-select";
import { StatefulButton } from "@/components/ui/stateful-button";

interface UnitProduksiStoreDialogsProps {
  deleteRegional: string | null;
  setDeleteRegional: (val: string | null) => void;
  editSite: {
    regional: string;
    site: string;
    alamat: string;
    managerOperasional?: string;
  } | null;
  setEditSite: (val: any) => void;
  newRegionalName: string;
  setNewRegionalName: (val: string) => void;
  newSiteName: string;
  setNewSiteName: (val: string) => void;
  newSiteAlamat: string;
  setNewSiteAlamat: (val: string) => void;
  newSiteManager: string;
  setNewSiteManager: (val: string) => void;
  regionalOptions: any[];
  deleteSite: { regional: string; site: string } | null;
  setDeleteSite: (val: any) => void;
  loadData: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function UnitProduksiStoreDialogs({
  deleteRegional,
  setDeleteRegional,
  editSite,
  setEditSite,
  newRegionalName,
  setNewRegionalName,
  newSiteName,
  setNewSiteName,
  newSiteAlamat,
  setNewSiteAlamat,
  newSiteManager,
  setNewSiteManager,
  regionalOptions,
  deleteSite,
  setDeleteSite,
  loadData,
  showToast,
}: UnitProduksiStoreDialogsProps) {
  return (
    <>
      {/* Delete Regional Confirm */}
      {deleteRegional && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteRegional(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-500/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus semua site di {deleteRegional}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini akan menghapus seluruh site pada regional tersebut.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteRegional(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/unit-produksi?namaRegional=${encodeURIComponent(
                        deleteRegional!
                      )}`,
                      {
                        method: "DELETE",
                      }
                    );

                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({}));
                      throw new Error(
                        errorData.error ||
                          errorData.message ||
                          "Gagal menghapus data. Regional mungkin masih digunakan."
                      );
                    }

                    showToast("Data regional berhasil dihapus!");
                    await loadData();
                  } catch (error: any) {
                    console.error("Delete Regional Error:", error);
                    showToast(
                      error.message || "Gagal menghapus regional",
                      "error"
                    );
                  } finally {
                    setDeleteRegional(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {editSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditSite(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Edit Site Area
              </h3>
              <button
                onClick={() => setEditSite(null)}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="p-6 space-y-5"
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe2 size={12} /> Regional
                  </label>
                  <SmoothSelect
                    value={newRegionalName}
                    onChange={(v) => setNewRegionalName(v)}
                    options={regionalOptions}
                    width={400}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={12} /> Nama Site
                  </label>
                  <input
                    required
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Edit2 size={12} /> Manager Operasional
                  </label>
                  <input
                    type="text"
                    value={newSiteManager}
                    onChange={(e) => setNewSiteManager(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Edit2 size={12} /> Alamat Site Area
                  </label>
                  <textarea
                    rows={2}
                    value={newSiteAlamat}
                    onChange={(e) => setNewSiteAlamat(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditSite(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/unit-produksi", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          namaRegional: editSite.regional,
                          siteArea: editSite.site,
                          newRegionalName: newRegionalName,
                          newSiteArea: newSiteName,
                          alamat: newSiteAlamat,
                          managerOperasional: newSiteManager,
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || "Gagal update data");
                      }
                      showToast("Data berhasil diupdate!");
                      setEditSite(null);
                      await loadData();
                    } catch (err: any) {
                      showToast(err.message, "error");
                      throw err;
                    }
                  }}
                  className="flex-1"
                >
                  Simpan
                </StatefulButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Site Confirm */}
      {deleteSite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteSite(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-500/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus site {deleteSite.site}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini akan menghapus site tersebut secara permanen.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteSite(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/unit-produksi?namaRegional=${encodeURIComponent(
                        deleteSite.regional
                      )}&siteArea=${encodeURIComponent(deleteSite.site)}`,
                      { method: "DELETE" }
                    );
                    if (!res.ok) throw new Error("Gagal menghapus data.");
                    showToast("Site berhasil dihapus!");
                    setDeleteSite(null);
                    await loadData();
                  } catch (error: any) {
                    showToast(error.message, "error");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
