import { Pencil, Trash2 } from "lucide-react";
import { usePurchaseOrderTable } from "@/hooks/usePurchaseOrderTable";

interface ColumnDependencies {
  poTable: ReturnType<typeof usePurchaseOrderTable>;
  role: string | null;
  setEditNoPo: (val: string) => void;
  setEditOpen: (val: boolean) => void;
}

export function getPurchaseOrderColumns({
  poTable,
  role,
  setEditNoPo,
  setEditOpen,
}: ColumnDependencies) {
  return [
    {
      key: "no",
      label: "NO",
      align: "center" as const,
      width: "w-12 min-w-[48px]",
      render: (_v: any, _po: any, index: number) => (
        <span className="font-bold text-xs text-slate-500">
          {poTable.perPage === "all"
            ? index + 1
            : (poTable.currentPage - 1) * parseInt(poTable.perPage, 10) + index + 1}
        </span>
      ),
    },
    {
      key: "noPo",
      label: "NO PO",
      width: "w-[150px] min-w-[150px]",
      render: (_v: any, po: any) => (
        <div className="py-2">
          <div className="font-bold text-slate-800 dark:text-slate-100 text-xs whitespace-nowrap">
            {po.noPo}
          </div>
          {po.noInvoice && (
            <div className="text-[10px] font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
              INV: {po.noInvoice}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "tglPo",
      label: "TGL PO",
      width: "w-[110px] min-w-[110px]",
      render: (_v: any, po: any) => (
        <div>
          <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs whitespace-nowrap">
            {po.tglPo
              ? new Date(po.tglPo).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-"}
          </span>
          {po.buktiTagih && po.buktiTagih !== "-" && (
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              TAGIH
            </span>
          )}
        </div>
      ),
    },
    {
      key: "expiredTgl",
      label: "DUE DATE",
      width: "w-[110px] min-w-[110px]",
      render: (_v: any, po: any) => (
        <div>
          <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs whitespace-nowrap">
            {po.expiredTgl
              ? new Date(po.expiredTgl).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-"}
          </span>
          {po.buktiBayar && po.buktiBayar !== "-" && (
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              PAID
            </span>
          )}
        </div>
      ),
    },
    {
      key: "produk",
      label: "PRODUK",
      width: "w-[240px] min-w-[240px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs whitespace-nowrap">
          {Number(po.itemsCount) > 1
            ? `${po.firstProductName || "Item"} (+${Number(po.itemsCount) - 1} lainnya)`
            : po.firstProductName || "-"}
        </span>
      ),
    },
    {
      key: "pcsKirim",
      label: "PCS KIRIM",
      align: "right" as const,
      width: "w-[100px] min-w-[100px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
          {(Number(po.pcsKirimTotal) || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "tujuanDetail",
      label: "TUJUAN DETAIL",
      width: "w-[180px] min-w-[180px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
          {po.tujuanDetail || "-"}
        </span>
      ),
    },
    {
      key: "regional",
      label: "REGIONAL",
      width: "w-[180px] min-w-[180px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
          {po.regional || "-"}
        </span>
      ),
    },
    {
      key: "siteArea",
      label: "SITE AREA",
      width: "w-[140px] min-w-[140px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
          {po.UnitProduksi?.siteArea || "-"}
        </span>
      ),
    },
    {
      key: "totalKg",
      label: "KG",
      align: "right" as const,
      width: "w-[90px] min-w-[90px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
          {(Number(po.totalKg) || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "totalDiscount",
      label: "DISCOUNT",
      align: "right" as const,
      width: "w-[110px] min-w-[110px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
          {(Number(po.totalDiscount) || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "totalNominal",
      label: "NOMINAL",
      align: "right" as const,
      width: "w-[140px] min-w-[140px]",
      render: (_v: any, po: any) => (
        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
          {(Number(po.totalNominal) || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "aksi",
      label: "AKSI",
      align: "center" as const,
      width: "w-[110px] min-w-[110px]",
      render: (_v: any, po: any) => (
        <div className="flex justify-center gap-2">
          <button
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              setEditNoPo(po.noPo);
              setEditOpen(true);
            }}
            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            <Pencil size={16} />
          </button>
          {String(role) !== "magang" && (
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                poTable.setConfirmDelete(po.noPo);
              }}
              className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];
}
