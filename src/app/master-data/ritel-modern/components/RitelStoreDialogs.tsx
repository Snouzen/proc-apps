"use client";

import React from "react";
import { X, ChevronLeft } from "lucide-react";
import { StatefulButton } from "@/components/ui/stateful-button";
import { saveRitel } from "@/lib/api";
import { ViewCompanyState } from "./RitelViewStoresModal";

interface RitelStoreDialogsProps {
  // 1. editStore
  editStore: { id: string; tujuan: string; namaPt: string } | null;
  setEditStore: (val: { id: string; tujuan: string; namaPt: string } | null) => void;
  newStoreName: string;
  setNewStoreName: (name: string) => void;

  // 2. addStoreFor
  addStoreFor: { namaPt: string; inisial: string } | null;
  setAddStoreFor: (val: { namaPt: string; inisial: string } | null) => void;
  newStoreForName: string;
  setNewStoreForName: (name: string) => void;

  // 3. deleteStore
  deleteStore: { id: string; tujuan: string; namaPt: string } | null;
  setDeleteStore: (val: { id: string; tujuan: string; namaPt: string } | null) => void;

  // 4. editAlias
  editAlias: { namaPt: string; inisial: string } | null;
  setEditAlias: (val: { namaPt: string; inisial: string } | null) => void;
  newAlias: string;
  setNewAlias: (val: string) => void;

  // 5. deleteCompany
  deleteCompany: string | null;
  setDeleteCompany: (val: string | null) => void;

  // 6. deleteInisial
  deleteInisial: { namaPt: string; inisial: string } | null;
  setDeleteInisial: (val: { namaPt: string; inisial: string } | null) => void;

  // Data & viewCompany synchronization
  dataRitel: any[];
  setDataRitel: React.Dispatch<React.SetStateAction<any[]>>;
  viewCompany: ViewCompanyState | null;
  setViewCompany: React.Dispatch<React.SetStateAction<ViewCompanyState | null>>;
}

export default function RitelStoreDialogs({
  editStore,
  setEditStore,
  newStoreName,
  setNewStoreName,
  addStoreFor,
  setAddStoreFor,
  newStoreForName,
  setNewStoreForName,
  deleteStore,
  setDeleteStore,
  editAlias,
  setEditAlias,
  newAlias,
  setNewAlias,
  deleteCompany,
  setDeleteCompany,
  deleteInisial,
  setDeleteInisial,
  dataRitel,
  setDataRitel,
  viewCompany,
  setViewCompany,
}: RitelStoreDialogsProps) {
  return (
    <>
      {/* ── 1. Ubah Nama Store ────────────────────────────────────────── */}
      {editStore && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditStore(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Ubah Nama Store
              </h3>
              <button
                onClick={() => setEditStore(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Company:{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editStore.namaPt}
                </span>
              </p>
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
              />
              <div className="flex gap-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditStore(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      await fetch("/api/ritel", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: editStore.id,
                          tujuan: newStoreName,
                        }),
                      });
                      setEditStore(null);
                      setDataRitel((prev) =>
                        prev.map((r) =>
                          r.id === editStore.id
                            ? { ...r, tujuan: newStoreName }
                            : r
                        )
                      );
                      if (viewCompany) {
                        setViewCompany({
                          ...viewCompany,
                          stores: viewCompany.stores.map((s) =>
                            s.id === editStore.id
                              ? { ...s, tujuan: newStoreName }
                              : s
                          ),
                        });
                      }
                    } catch {}
                  }}
                  className="flex-1"
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Tambah Toko/DC ──────────────────────────────────────────── */}
      {addStoreFor && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setAddStoreFor(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddStoreFor(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="text-xs font-bold">Back</span>
                </button>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                  Tambah Toko/DC
                </h3>
              </div>
              <button
                onClick={() => setAddStoreFor(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {addStoreFor.namaPt}
                </span>{" "}
                {addStoreFor.inisial ? `(${addStoreFor.inisial})` : ""}
              </p>
              <input
                type="text"
                placeholder="Nama Toko/DC"
                value={newStoreForName}
                onChange={(e) => setNewStoreForName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
              />
              <div className="flex gap-2 justify-end">
                <StatefulButton
                  variant="cancel"
                  onClick={() => {
                    setAddStoreFor(null);
                  }}
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      const existingGroup = (dataRitel || []).find(
                        (r) =>
                          r.namaPt === addStoreFor.namaPt &&
                          (r.inisial || null) === (addStoreFor.inisial || null)
                      );
                      const payload = {
                        namaPt: addStoreFor.namaPt,
                        inisial: addStoreFor.inisial || null,
                        tujuan: newStoreForName,
                        provinsi: existingGroup?.provinsi || null,
                        logoPt: existingGroup?.logoPt || null,
                        logoInisial: existingGroup?.logoInisial || null,
                      };
                      const result = await saveRitel(payload);
                      setDataRitel((prev) => [result, ...prev]);

                      // Sync with viewCompany if active
                      if (
                        viewCompany &&
                        viewCompany.namaPt === addStoreFor.namaPt &&
                        (viewCompany.inisial || "—") ===
                          (addStoreFor.inisial || "—")
                      ) {
                        setViewCompany({
                          ...viewCompany,
                          stores: [
                            ...viewCompany.stores,
                            { id: result.id, tujuan: result.tujuan },
                          ],
                        });
                      }

                      setAddStoreFor(null);
                      setNewStoreForName("");
                    } catch {}
                  }}
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Hapus Store ────────────────────────────────────────────── */}
      {deleteStore && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteStore(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus Store?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {deleteStore.tujuan} di {deleteStore.namaPt}
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <StatefulButton
                variant="cancel"
                onClick={() => setDeleteStore(null)}
              >
                Batal
              </StatefulButton>
              <StatefulButton
                variant="submit"
                onClick={async () => {
                  try {
                    await fetch(
                      `/api/ritel?id=${encodeURIComponent(deleteStore.id)}`,
                      {
                        method: "DELETE",
                      }
                    );
                    setDeleteStore(null);
                    setDataRitel((prev) =>
                      prev.filter((r) => r.id !== deleteStore.id)
                    );
                    if (viewCompany) {
                      setViewCompany({
                        ...viewCompany,
                        stores: viewCompany.stores.filter(
                          (s) => s.id !== deleteStore.id
                        ),
                      });
                    }
                  } catch {}
                }}
              >
                Hapus
              </StatefulButton>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Ubah Inisial ───────────────────────────────────────────── */}
      {editAlias && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setEditAlias(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Ubah Inisial
              </h3>
              <button
                onClick={() => setEditAlias(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Company:{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {editAlias.namaPt}
                </span>
              </p>
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm dark:text-slate-200"
              />
              <div className="flex gap-2">
                <StatefulButton
                  variant="cancel"
                  onClick={() => setEditAlias(null)}
                  className="flex-1"
                >
                  Batal
                </StatefulButton>
                <StatefulButton
                  variant="submit"
                  onClick={async () => {
                    try {
                      await fetch("/api/ritel/alias", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          namaPt: editAlias.namaPt,
                          inisial: editAlias.inisial,
                          newInisial: newAlias,
                        }),
                      });
                      setEditAlias(null);
                      setDataRitel((prev) =>
                        prev.map((r) =>
                          r.namaPt === editAlias.namaPt &&
                          (r.inisial ?? "—") === editAlias.inisial
                            ? { ...r, inisial: newAlias }
                            : r
                        )
                      );
                    } catch {}
                  }}
                  className="flex-1"
                >
                  Simpan
                </StatefulButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Hapus Company (Semua Store PT) ─────────────────────────── */}
      {deleteCompany && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteCompany(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus semua store untuk {deleteCompany}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteCompany(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/ritel?namaPt=${encodeURIComponent(deleteCompany!)}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      alert(j?.error || "Gagal menghapus data");
                      return;
                    }
                    setDataRitel((prev) =>
                      prev.filter(
                        (x: any) =>
                          x.namaPt.toLowerCase() !==
                          deleteCompany!.toLowerCase()
                      )
                    );
                    setDeleteCompany(null);
                  } catch {
                    alert("Gagal menghapus data");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Hapus Inisial ──────────────────────────────────────────── */}
      {deleteInisial && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteInisial(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-900/10">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Hapus Inisial {deleteInisial.inisial}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tindakan ini akan menghapus secara permanen semua data toko/DC
                yang bernaung di bawah inisial ini.
              </p>
            </div>
            <div className="p-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteInisial(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/ritel?namaPt=${encodeURIComponent(
                        deleteInisial.namaPt
                      )}&inisial=${encodeURIComponent(deleteInisial.inisial)}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      alert(j?.error || "Gagal menghapus data");
                      return;
                    }
                    setDataRitel((prev) =>
                      prev.filter((x: any) => {
                        const ptMatch =
                          x.namaPt.toLowerCase() ===
                          deleteInisial.namaPt.toLowerCase();
                        const xInisial = x.inisial || "—";
                        const inMatch =
                          xInisial.toLowerCase() ===
                          deleteInisial.inisial.toLowerCase();
                        return !(ptMatch && inMatch);
                      })
                    );
                    setDeleteInisial(null);
                  } catch {
                    alert("Gagal menghapus data");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
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
