import React from "react";
import { Zap, Building2, Eye, Edit2, Trash2 } from "lucide-react";

const highlightText = (text: string, query: string) => {
  if (!query) return text;
  const parts = String(text).split(new RegExp(`(${query})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-black rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
};

interface RitelTableProps {
  isLoading: boolean;
  loadError: string | null;
  groupedData: any[];
  currentItems: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  canEdit: boolean;
  isRm: boolean;
  setViewAliases: (val: any) => void;
  setEditCompany: (val: any) => void;
  setDeleteCompany: (val: any) => void;
  filteredData: any[];
  indexOfFirstItem: number;
  indexOfLastItem: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

export default function RitelTable({
  isLoading,
  loadError,
  groupedData,
  currentItems,
  searchTerm,
  setSearchTerm,
  setCurrentPage,
  canEdit,
  isRm,
  setViewAliases,
  setEditCompany,
  setDeleteCompany,
  filteredData,
  indexOfFirstItem,
  indexOfLastItem,
  currentPage,
  totalPages,
  itemsPerPage,
}: RitelTableProps) {
  return (
    <>
      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Gagal load data:</strong> {loadError}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md">
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Cari Nama PT atau Inisial..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm dark:text-slate-200"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-neutral-900">
                <svg className="absolute w-20 h-20" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="6"
                    fill="none"
                    className="stroke-neutral-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    className="stroke-amber-500 ldr-dash"
                  />
                </svg>
                <div className="ldr-flicker text-amber-500">
                  <Zap size={24} />
                </div>
              </div>
            </div>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            {loadError ? "—" : "Belum ada data di database."}
          </div>
        ) : (
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {currentItems.map((group) => (
              <div
                key={group.displayId}
                className="group relative bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden"
              >
                {/* Logo Area - Large & Clear */}
                <div className="relative h-[130px] w-full bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-center p-6 overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                  
                  {group.logoPt ? (
                    <img
                      src={group.logoPt}
                      alt={group.namaPt}
                      className="max-h-full max-w-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Building2 size={40} className="text-slate-400" />
                    </div>
                  )}

                  {/* Badge Inisial - Top Right */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 tabular-nums">
                      {Object.keys(group.inisials).length}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Inisial</span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-[12px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={group.namaPt}>
                      {highlightText(group.namaPt, searchTerm)}
                    </h3>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700/50 gap-2">
                    <button
                      onClick={() => setViewAliases({ namaPt: group.namaPt })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all duration-300 shadow-lg shadow-slate-200 dark:shadow-indigo-900/20 hover:shadow-indigo-100 dark:hover:shadow-indigo-500/30 active:scale-95"
                    >
                      <Eye size={14} strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase tracking-widest">View Details</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => {
                            const firstAlias = Object.keys(group.inisials)[0];
                            const firstData = group.inisials[firstAlias];
                            setEditCompany({
                              id: group.displayId,
                              namaPt: group.namaPt,
                              originalNamaPt: group.namaPt,
                              inisial: null,
                              originalInisial: null,
                              logoPt: group.logoPt,
                              ptOnly: true
                            });
                          }}
                          className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 hover:bg-amber-500 hover:text-white transition-all duration-300 group/edit"
                          title="Edit Logo / Nama PT"
                        >
                          <Edit2 size={15} strokeWidth={2.5} className="group-hover/edit:rotate-12 transition-transform" />
                        </button>
                      )}

                      {!isRm && (
                        <button
                          onClick={() => setDeleteCompany(group.namaPt)}
                          className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 group/del"
                          title="Hapus Ritel"
                        >
                          <Trash2 size={15} strokeWidth={2.5} className="group-hover/del:scale-110 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filteredData.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {indexOfFirstItem + 1} to{" "}
            {Math.min(indexOfLastItem, filteredData.length)} of{" "}
            {filteredData.length} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
