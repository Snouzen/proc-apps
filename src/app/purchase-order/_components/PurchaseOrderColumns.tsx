import { Pencil, Trash2 } from "lucide-react";
import { usePurchaseOrderTable } from "@/hooks/usePurchaseOrderTable";
import { createColumnHelper } from "@tanstack/react-table";

interface ColumnDependencies {
  poTable: ReturnType<typeof usePurchaseOrderTable>;
  role: string | null;
  setEditNoPo: (val: string) => void;
  setEditOpen: (val: boolean) => void;
}

const helper = createColumnHelper<any>();

export function getPurchaseOrderColumns({
  poTable,
  role,
  setEditNoPo,
  setEditOpen,
}: ColumnDependencies) {
  return [
    helper.display({
      id: "no",
      header: "NO",
      size: 48,
      meta: { align: "center" },
      cell: (info) => (
        <div className="text-center w-full">
          <span className="font-bold text-xs text-slate-500">
            {poTable.perPage === "all"
              ? info.row.index + 1
              : (poTable.currentPage - 1) * parseInt(poTable.perPage, 10) + info.row.index + 1}
          </span>
        </div>
      ),
    }),
    helper.accessor("noPo", {
      header: "NO PO",
      size: 150,
      cell: (info) => {
        const po = info.row.original;
        return (
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
        );
      },
    }),
    helper.accessor("tglPo", {
      header: "TGL PO",
      size: 110,
      cell: (info) => {
        const po = info.row.original;
        return (
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
        );
      },
    }),
    helper.accessor("expiredTgl", {
      header: "DUE DATE",
      size: 110,
      cell: (info) => {
        const po = info.row.original;
        return (
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
        );
      },
    }),
    helper.accessor((row) => Number(row.itemsCount) > 1 ? `${row.firstProductName || "Item"} (+${Number(row.itemsCount) - 1} lainnya)` : row.firstProductName || "-", {
      id: "produk",
      header: "PRODUK",
      size: 240,
      cell: (info) => {
        return (
          <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs whitespace-nowrap">
            {info.getValue()}
          </span>
        );
      },
    }),
    helper.accessor("pcsKirimTotal", {
      header: "PCS KIRIM",
      size: 100,
      meta: { align: "right" },
      cell: (info) => {
        const po = info.row.original;
        return (
          <div className="text-right w-full">
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
              {(Number(po.pcsKirimTotal) || 0).toLocaleString("id-ID")}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("tujuanDetail", {
      header: "TUJUAN DETAIL",
      size: 180,
      cell: (info) => {
        const po = info.row.original;
        return (
          <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
            {po.tujuanDetail || "-"}
          </span>
        );
      },
    }),
    helper.accessor("regional", {
      header: "REGIONAL",
      size: 180,
      cell: (info) => {
        const po = info.row.original;
        return (
          <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
            {po.regional || "-"}
          </span>
        );
      },
    }),
    helper.accessor("UnitProduksi.siteArea", {
      header: "SITE AREA",
      id: "siteArea",
      size: 140,
      cell: (info) => {
        const po = info.row.original;
        return (
          <span className="text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
            {po.UnitProduksi?.siteArea || "-"}
          </span>
        );
      },
    }),
    helper.accessor("totalKg", {
      header: "KG",
      size: 90,
      meta: { align: "right" },
      cell: (info) => {
        const po = info.row.original;
        return (
          <div className="text-right w-full">
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
              {(Number(po.totalKg) || 0).toLocaleString("id-ID")}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("totalDiscount", {
      header: "DISCOUNT",
      size: 110,
      meta: { align: "right" },
      cell: (info) => {
        const po = info.row.original;
        return (
          <div className="text-right w-full">
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
              {(Number(po.totalDiscount) || 0).toLocaleString("id-ID")}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("totalNominal", {
      header: "NOMINAL",
      size: 140,
      meta: { align: "right" },
      cell: (info) => {
        const po = info.row.original;
        return (
          <div className="text-right w-full">
            <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
              {(Number(po.totalNominal) || 0).toLocaleString("id-ID")}
            </span>
          </div>
        );
      },
    }),
    helper.accessor("createdAt", {
      header: "TANGGAL BUAT",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">
          {info.getValue() ? new Date(info.getValue() as string).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
        </span>
      ),
    }),
    helper.accessor("noInvoice", {
      header: "NO INVOICE",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("noFaktur", {
      header: "NO FAKTUR",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("kodeVendor", {
      header: "KODE VENDOR",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("isNotaDinas", {
      header: "NOTA DINAS",
      size: 120,
      meta: { defaultHidden: true, align: "center" },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() ? "Ya" : "Tidak"}</span>
      ),
    }),
    helper.accessor("noNd", {
      header: "NO ND",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("statusCreditLimit", {
      header: "STATUS CL",
      size: 120,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("remarksCreditLimit", {
      header: "REMARKS CL",
      size: 200,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs truncate max-w-[200px]" title={info.getValue() as string}>{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("remarks", {
      header: "REMARKS PO",
      size: 200,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs truncate max-w-[200px]" title={info.getValue() as string}>{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("tglkirim", {
      header: "TANGGAL KIRIM",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">
          {info.getValue() ? new Date(info.getValue() as string).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
        </span>
      ),
    }),
    helper.accessor("namaSupir", {
      header: "NAMA SUPIR",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor("platNomor", {
      header: "PLAT NOMOR",
      size: 120,
      meta: { defaultHidden: true },
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>
      ),
    }),
    helper.accessor((row) => row.RitelModern?.namaPt, {
      id: "namaPt",
      header: "NAMA PT",
      size: 200,
      meta: { defaultHidden: true },
      cell: (info) => <span className="text-slate-700 dark:text-slate-200 text-xs truncate max-w-[200px]" title={info.getValue() as string}>{info.getValue() || "-"}</span>,
    }),
    helper.accessor((row) => row.RitelModern?.inisial, {
      id: "inisial",
      header: "INISIAL",
      size: 120,
      meta: { defaultHidden: true },
      cell: (info) => <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>,
    }),
    helper.accessor((row) => row.UnitProduksi?.namaRegional, {
      id: "namaRegional",
      header: "NAMA REGIONAL",
      size: 180,
      meta: { defaultHidden: true },
      cell: (info) => <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>,
    }),
    helper.accessor((row) => row.UnitProduksi?.managerOperasional, {
      id: "managerOperasional",
      header: "MANAGER OP",
      size: 180,
      meta: { defaultHidden: true },
      cell: (info) => <span className="text-slate-700 dark:text-slate-200 text-xs">{info.getValue() || "-"}</span>,
    }),
    helper.accessor((row) => row.CreditLimitBatch?.batchCode, {
      id: "batchCode",
      header: "BATCH CL",
      size: 150,
      meta: { defaultHidden: true },
      cell: (info) => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{info.getValue() || "-"}</span>,
    }),
    helper.display({
      id: "aksi",
      header: "AKSI",
      size: 110,
      meta: { align: "center" },
      cell: (info) => {
        const po = info.row.original;
        return (
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
        );
      },
    }),
  ];
}
