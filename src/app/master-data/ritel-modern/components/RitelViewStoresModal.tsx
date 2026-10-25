"use client";

import PusatOnly from "@/components/PusatOnly";
import React, { useState, useEffect } from "react";
import { Store, Edit2, Trash2, X, ChevronLeft } from "lucide-react";

export interface ViewCompanyState {
  namaPt: string;
  inisial: string | null;
  stores: { id: string; tujuan: string }[];
}

interface RitelViewStoresModalProps {
  viewCompany: ViewCompanyState | null;
  setViewCompany: (val: ViewCompanyState | null) => void;
  canEdit: boolean;
  setNewStoreName: (name: string) => void;
  setEditStore: (store: { id: string; tujuan: string; namaPt: string } | null) => void;
  setDeleteStore: (store: { id: string; tujuan: string; namaPt: string } | null) => void;
}

export default function RitelViewStoresModal({
  viewCompany,
  setViewCompany,
  canEdit,
  setNewStoreName,
  setEditStore,
  setDeleteStore,
}: RitelViewStoresModalProps) {
  const [viewPage, setViewPage] = useState(1);

  useEffect(() => {
    if (viewCompany) setViewPage(1);
  }, [viewCompany]);

  if (!viewCompany) return null;

  const perPage = 6;
  const total = viewCompany.stores.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (viewPage - 1) * perPage;
  const end = Math.min(start + perPage, total);
  const pageStores = viewCompany.stores.slice(start, end);

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setViewCompany(null)}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setViewCompany(null)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="text-xs font-bold">Back</span>
            </button>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 truncate">
              {viewCompany.namaPt}{" "}
              {viewCompany.inisial ? `(${viewCompany.inisial})` : ""}
            </h3>
          </div>
          <button
            onClick={() => setViewCompany(null)}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pageStores.map((s) => (
              <li
                key={s.id}
                className="px-4 py-2.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2 group/store-item hover:border-amber-200 dark:hover:border-indigo-500/50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store
                    size={14}
                    className="text-amber-600 dark:text-indigo-400 flex-shrink-0"
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                    {s.tujuan}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setNewStoreName(s.tujuan);
                        setEditStore({
                          id: s.id,
                          tujuan: s.tujuan,
                          namaPt: viewCompany.namaPt,
                        });
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Nama Toko"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                  {canEdit && (
                    <PusatOnly><button
                      onClick={() => {
                        setDeleteStore({
                          id: s.id,
                          tujuan: s.tujuan,
                          namaPt: viewCompany.namaPt,
                        });
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Hapus Toko"
                    >
                      <Trash2 size={13} />
                    </button></PusatOnly>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {total ? start + 1 : 0}–{end} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setViewPage((p) => Math.max(p - 1, 1))}
                disabled={viewPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                Previous
              </button>
              <button
                onClick={() => setViewPage((p) => Math.min(p + 1, totalPages))}
                disabled={viewPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
