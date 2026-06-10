import Link from "next/link";
import { Search, Loader2, X, FileText, ArrowUpRight, Upload, PlusCircle } from "lucide-react";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { usePurchaseOrderTable } from "@/hooks/usePurchaseOrderTable";
import { usePoDetailModal } from "@/hooks/usePoDetailModal";

interface PurchaseOrderHeaderProps {
  globalSearch: ReturnType<typeof useGlobalSearch>;
  poTable: ReturnType<typeof usePurchaseOrderTable>;
  detailModal: ReturnType<typeof usePoDetailModal>;
  setIsBulkOpen: (val: boolean) => void;
}

export function PurchaseOrderHeader({
  globalSearch,
  poTable,
  detailModal,
  setIsBulkOpen,
}: PurchaseOrderHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
      <div>
        <CardTitle className="text-3xl font-black text-slate-800">
          Purchase Order Dashboard
        </CardTitle>
        <CardDescription className="text-slate-500">
          Sistem filter presisi untuk memantau performa per inisial peritel.
        </CardDescription>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Global Search Bar */}
        <div ref={globalSearch.globalSearchRef} className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          <input
            value={globalSearch.globalQuery}
            onChange={(e) => globalSearch.handleGlobalSearch(e.target.value)}
            placeholder="Cari No PO / Invoice..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11"
          />
          {globalSearch.globalQuery && (
            <button
              type="button"
              onClick={globalSearch.closeGlobalSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
            >
              <X size={14} />
            </button>
          )}

          {/* Floating Results Dropdown */}
          {(globalSearch.globalResults !== null || globalSearch.globalLoading) && globalSearch.globalQuery.trim().length >= 2 && (
            <div className="absolute left-0 top-full mt-2 w-[380px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] max-h-[420px] overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {globalSearch.globalLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Mencari...</span>
                </div>
              ) : globalSearch.globalResults && globalSearch.globalResults.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 rounded-t-2xl sticky top-0 border-b border-slate-100">
                    {globalSearch.globalResults.length} hasil ditemukan
                  </div>
                  {globalSearch.globalResults.map((po: any) => (
                    <button
                      key={po.id}
                      type="button"
                      onClick={async () => {
                        globalSearch.closeGlobalSearch();
                        poTable.setLoadingData(true);
                        try {
                          const res = await fetch(`/api/po?noPo=${encodeURIComponent(po.noPo)}&includeItems=true`, { cache: "no-store" });
                          const json = await res.json();
                          const list = Array.isArray(json) ? json : json?.data || [];
                          const summaryRes = await fetch(`/api/po?noPo=${encodeURIComponent(po.noPo)}&summary=true`, { cache: "no-store" });
                          const summaryJson = await summaryRes.json();
                          const summaryList = Array.isArray(summaryJson) ? summaryJson : summaryJson?.data || [];
                          
                          poTable.setManualData(
                            summaryList.length > 0 ? summaryList : list,
                            po.RitelModern?.namaPt || "Pencarian",
                            po.RitelModern?.inisial || ""
                          );
                          
                          if (list.length > 0) {
                            detailModal.openModal(list[0]);
                          }
                        } catch (e) {
                          console.error(e);
                        } finally {
                          poTable.setLoadingData(false);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{po.noPo}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {po.RitelModern?.namaPt || "-"}
                          {po.RitelModern?.inisial ? ` · ${po.RitelModern.inisial}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {po.noInvoice && (
                          <div className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                            INV: {po.noInvoice}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {po.tglPo ? new Date(po.tglPo).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        </div>
                      </div>
                      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Tidak ada hasil untuk &ldquo;{globalSearch.globalQuery}&rdquo;</p>
                  <p className="text-xs text-slate-400 mt-1">Coba kata kunci lain</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 h-11 rounded-xl font-bold"
          onClick={() => setIsBulkOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2 text-blue-600" />
          Bulk Upload
        </Button>
        <Link href="/po">
          <Button className="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white dark:text-white shadow-none h-11 rounded-xl px-5 font-bold">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add PO
          </Button>
        </Link>
      </div>
    </div>
  );
}
