"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin } from "lucide-react";

interface UnitProduksiViewModalProps {
  viewRegional: { nama: string; sites: any[] } | null;
  setViewRegional: (val: { nama: string; sites: any[] } | null) => void;
  viewedSite: any | null;
  setViewedSite: (val: any) => void;
}

export default function UnitProduksiViewModal({
  viewRegional,
  setViewRegional,
  viewedSite,
  setViewedSite,
}: UnitProduksiViewModalProps) {
  const [viewPage, setViewPage] = useState(1);

  useEffect(() => {
    if (viewRegional) setViewPage(1);
  }, [viewRegional]);

  return (
    <>
      {/* View Regional Modal */}
      {viewRegional && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewRegional(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                Regional: {viewRegional.nama}
              </h3>
              <button
                onClick={() => setViewRegional(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {(() => {
                const perPage = 5;
                const total = viewRegional.sites.length;
                const totalPages = Math.max(1, Math.ceil(total / perPage));
                const start = (viewPage - 1) * perPage;
                const end = Math.min(start + perPage, total);
                const pageSites = viewRegional.sites.slice(start, end);
                return (
                  <>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pageSites.map((s: any, i: number) => (
                        <li
                          key={`${start}-${i}`}
                          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2"
                        >
                          <MapPin
                            size={14}
                            className="text-blue-600 dark:text-indigo-400"
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {s.name || s}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing {total ? start + 1 : 0}–{end} of {total}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setViewPage((p) => Math.max(p - 1, 1))
                          }
                          disabled={viewPage === 1}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setViewPage((p) => Math.min(p + 1, totalPages))
                          }
                          disabled={viewPage === totalPages}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Viewed Site Detail Modal */}
      {viewedSite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewedSite(null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                    Detail Site Area
                  </h3>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    {viewedSite.regional}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Nama Site Area
                </label>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {viewedSite.name}
                </p>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Manager Operasional
                </label>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  {viewedSite.managerOperasional ||
                    "Manager belum ditambahkan."}
                </p>
              </div>
              <div className="space-y-1 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Alamat Lengkap
                </label>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  {viewedSite.alamat || "Alamat belum ditambahkan."}
                </p>
              </div>
              <button
                onClick={() => setViewedSite(null)}
                className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/20"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
