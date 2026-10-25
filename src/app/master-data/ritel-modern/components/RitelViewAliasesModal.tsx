"use client";

import PusatOnly from "@/components/PusatOnly";
import React, { useState, useEffect } from "react";
import { Store, Eye, Edit2, Plus, Trash2, X } from "lucide-react";
import { GlobalPagination } from "@/components/global-pagination";
import { EditCompanyState } from "./RitelEditCompanyModal";
import { ViewCompanyState } from "./RitelViewStoresModal";
import RitelLogo from "./RitelLogo";

interface RitelViewAliasesModalProps {
  viewAliases: { namaPt: string } | null;
  setViewAliases: (val: { namaPt: string } | null) => void;
  groupedData: any[];
  dataRitel: any[];
  isPusat: boolean;
  isRm: boolean;
  setViewCompany: (val: ViewCompanyState | null) => void;
  setEditCompany: (val: EditCompanyState | null) => void;
  setAddStoreFor: (val: { namaPt: string; inisial: string } | null) => void;
  setNewStoreForName: (name: string) => void;
  setDeleteInisial: (val: { namaPt: string; inisial: string } | null) => void;
}

export default function RitelViewAliasesModal({
  viewAliases,
  setViewAliases,
  groupedData,
  dataRitel,
  isPusat,
  isRm,
  setViewCompany,
  setEditCompany,
  setAddStoreFor,
  setNewStoreForName,
  setDeleteInisial,
}: RitelViewAliasesModalProps) {
  const [aliasPage, setAliasPage] = useState(1);
  const aliasItemsPerPage = 6;

  useEffect(() => {
    if (viewAliases) setAliasPage(1);
  }, [viewAliases]);

  if (!viewAliases) return null;

  const group = groupedData.find((g) => g.namaPt === viewAliases.namaPt);
  const aliases = group ? Object.entries(group.inisials) : [];
  const totalPages = Math.max(
    1,
    Math.ceil(aliases.length / aliasItemsPerPage)
  );
  const start = (aliasPage - 1) * aliasItemsPerPage;
  const pageAliases = aliases.slice(start, start + aliasItemsPerPage);

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setViewAliases(null)}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
            Inisial - {viewAliases.namaPt}
          </h3>
          <button
            onClick={() => setViewAliases(null)}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pageAliases.length === 0 ? (
              <div className="col-span-1 sm:col-span-2 text-center text-slate-400 py-6 text-sm font-medium">
                Belum ada Inisial terdaftar.
              </div>
            ) : (
              pageAliases.map(([alias, data]: [string, any]) => (
                <div
                  key={alias}
                  className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 p-4 bg-white dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 shadow-sm">
                      <RitelLogo src={data.logoInisial} alt={`logo ${alias || "inisial"}`} variant="alias" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black tracking-widest uppercase inline-block border border-slate-200/50 dark:border-slate-600/50">
                          {alias || "—"}
                        </div>
                        {data.provinsi ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold uppercase tracking-wider border border-blue-200 dark:border-blue-800/50">
                            📍 {data.provinsi}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-medium border border-slate-200/50 dark:border-slate-700">
                            Belum ada provinsi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {data.stores.length} Distribusi Toko
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setViewCompany({
                          namaPt: viewAliases.namaPt,
                          inisial: alias,
                          stores: data.stores,
                        });
                      }}
                      className="p-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                      title="Lihat Toko"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const masterGroup = (dataRitel || []).find(
                          (r) =>
                            r.namaPt === viewAliases.namaPt &&
                            (r.inisial || "—") === alias
                        );
                        setEditCompany({
                          id: masterGroup?.id,
                          namaPt: viewAliases.namaPt,
                          originalNamaPt: viewAliases.namaPt,
                          inisial: alias === "—" ? null : alias,
                          originalInisial: alias === "—" ? null : alias,
                          provinsi:
                            data.provinsi || masterGroup?.provinsi || "",
                          logoPt: masterGroup?.logoPt || null,
                          logoInisial:
                            data.logoInisial || masterGroup?.logoInisial || null,
                          ptOnly: false,
                        });
                      }}
                      className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Edit Data & Logo"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setAddStoreFor({
                          namaPt: viewAliases.namaPt,
                          inisial: alias,
                        });
                        setNewStoreForName("");
                      }}
                      className="p-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      title="Tambah Toko/DC"
                    >
                      <Plus size={14} />
                    </button>
                    {(isPusat || isRm) && (
                      <PusatOnly><button
                        onClick={() => {
                          setTimeout(() => {
                            setDeleteInisial({
                              namaPt: viewAliases.namaPt,
                              inisial: alias,
                            });
                          }, 0);
                        }}
                        className="p-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                        title="Hapus Inisial"
                      >
                        <Trash2 size={14} />
                      </button></PusatOnly>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3">
            <GlobalPagination
              currentPage={aliasPage}
              totalPages={totalPages}
              onPageChange={setAliasPage}
              itemsCount={pageAliases.length}
              totalItems={aliases.length}
              itemName="inisial"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
