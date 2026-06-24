import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CheckCircle2, Save, X, Pencil, ChevronRight } from "lucide-react";
import { PoDateBadge } from "@/components/PoDateBadge";

const helper = createColumnHelper<any>();

export const getChecklistDocsColumns = (formatDate: (d: any) => string): ColumnDef<any, any>[] => [
  helper.display({
    id: "index",
    header: "NO",
    size: 60,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const state = table.getState();
      const pageIndex = state.pagination?.pageIndex || 0;
      const pageSize = state.pagination?.pageSize || 10;
      return (
        <span className="text-slate-500 font-semibold tabular-nums text-sm">
          {pageIndex * pageSize + row.index + 1}
        </span>
      );
    },
  }),
  helper.accessor("company", {
    header: "COMPANY",
    size: 250,
    cell: ({ row }) => (
      <div
        className="w-full truncate font-bold text-slate-800 dark:text-slate-200"
        title={row.original.company || row.original?.RitelModern?.namaPt || "-"}
      >
        {row.original.company || row.original?.RitelModern?.namaPt || "-"}
      </div>
    ),
  }),
  helper.accessor("noPo", {
    header: "NO PO",
    size: 200,
    cell: ({ row }) => (
      <div className="w-full truncate font-semibold text-slate-700 dark:text-slate-300" title={row.original.noPo || "-"}>
        {row.original.noPo || "-"}
      </div>
    ),
  }),
  helper.accessor("noInvoice", {
    header: "NO INVOICE",
    size: 150,
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange, role } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      const canEdit = role === "pusat" || role === "rm";
      if (isEditing && canEdit) {
        return (
          <div className="w-full">
            <input
              type="text"
              placeholder="No Invoice..."
              value={editingRows[id]?.noInvoice ?? ""}
              onChange={(e) => handleFieldChange(id, "noInvoice", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner"
            />
          </div>
        );
      }
      return (
        <span className="text-slate-800 dark:text-slate-200 font-semibold w-full block truncate" title={row.original.noInvoice || "-"}>
          {row.original.noInvoice || "-"}
        </span>
      );
    },
  }),
  helper.accessor("tglPo", {
    header: "TGL PO",
    size: 120,
    cell: ({ row }) => (
      <div className="w-full">
        <PoDateBadge
          dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{formatDate(row.original.tglPo)}</span>}
          type="TAGIH"
          buktiData={row.original.buktiTagih}
        />
      </div>
    ),
  }),
  helper.accessor("expiredTgl", {
    header: "EXPIRED",
    size: 120,
    cell: ({ row }) => (
      <div className="w-full">
        <PoDateBadge
          dateNode={<span className="text-slate-800 dark:text-slate-300 text-[12px] font-medium">{formatDate(row.original.expiredTgl)}</span>}
          type="PAID"
          buktiData={row.original.buktiBayar}
        />
      </div>
    ),
  }),
  helper.accessor("regional", {
    header: "REGIONAL",
    size: 150,
    cell: ({ row }) => {
      const reg = row.original.regional || row.original?.UnitProduksi?.namaRegional || "-";
      return (
        <div className="flex items-center whitespace-nowrap">
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{reg}</span>
        </div>
      );
    },
  }),
  helper.accessor("siteArea", {
    header: "SITE AREA",
    size: 150,
    cell: ({ row }) => {
      const siteArea = row.original?.UnitProduksi?.siteArea || "-";
      return (
        <div className="flex items-center whitespace-nowrap">
          <span className="text-slate-700 dark:text-slate-300 font-semibold">{siteArea}</span>
        </div>
      );
    },
  }),
  helper.accessor("statusTagih", {
    header: "STATUS TAGIH",
    size: 120,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full flex justify-center">
            <label className="flex items-center justify-center cursor-pointer p-2">
              <input
                type="checkbox"
                checked={editingRows[id]?.statusTagih ?? false}
                onChange={(e) => handleFieldChange(id, "statusTagih", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        );
      }
      return (
        <div className="w-full flex justify-center">
          {row.original.statusTagih ? (
            <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" />
          ) : (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      );
    },
  }),
  helper.accessor("buktiTagih", {
    header: "BUKTI TAGIH",
    size: 200,
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full">
            <input
              type="text"
              placeholder="Ref Tagih..."
              value={editingRows[id]?.buktiTagih ?? ""}
              onChange={(e) => handleFieldChange(id, "buktiTagih", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner"
            />
          </div>
        );
      }
      return (
        <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-full" title={row.original.buktiTagih || "-"}>
          {row.original.buktiTagih || "-"}
        </div>
      );
    },
  }),
  helper.accessor("tglkirim", {
    header: "TGL KIRIM",
    size: 120,
    meta: { defaultHidden: true },
    cell: ({ row }) => <span className="text-slate-800 dark:text-slate-300 text-[13px] font-semibold w-full block">{formatDate(row.original.tglkirim)}</span>,
  }),
  helper.accessor("statusKirim", {
    header: "STATUS KIRIM",
    size: 120,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full flex justify-center">
            <label className="flex items-center justify-center cursor-pointer p-2">
              <input
                type="checkbox"
                checked={editingRows[id]?.statusKirim ?? false}
                onChange={(e) => handleFieldChange(id, "statusKirim", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        );
      }
      return (
        <div className="w-full flex justify-center">
          {row.original.statusKirim ? (
            <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" />
          ) : (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      );
    },
  }),
  helper.accessor("buktiKirim", {
    header: "BUKTI KIRIM",
    size: 200,
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full">
            <input
              type="text"
              placeholder="Ref Kirim..."
              value={editingRows[id]?.buktiKirim ?? ""}
              onChange={(e) => handleFieldChange(id, "buktiKirim", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner"
            />
          </div>
        );
      }
      return (
        <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-full" title={row.original.buktiKirim || "-"}>
          {row.original.buktiKirim || "-"}
        </div>
      );
    },
  }),
  helper.accessor("statusSdif", {
    header: "SDIF",
    size: 60,
    meta: { align: "center", defaultHidden: true },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        {row.original.statusSdif ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}
      </div>
    ),
  }),
  helper.accessor("statusPo", {
    header: "PO",
    size: 60,
    meta: { align: "center", defaultHidden: true },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        {row.original.statusPo ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}
      </div>
    ),
  }),
  helper.accessor("statusFp", {
    header: "FP",
    size: 60,
    meta: { align: "center", defaultHidden: true },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        {row.original.statusFp ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}
      </div>
    ),
  }),
  helper.accessor("statusKwi", {
    header: "KWI",
    size: 60,
    meta: { align: "center", defaultHidden: true },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        {row.original.statusKwi ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}
      </div>
    ),
  }),
  helper.accessor("statusInv", {
    header: "INV",
    size: 60,
    meta: { align: "center", defaultHidden: true },
    cell: ({ row }) => (
      <div className="w-full flex justify-center">
        {row.original.statusInv ? <CheckCircle2 size={18} className="text-emerald-500" /> : <span className="text-slate-400">-</span>}
      </div>
    ),
  }),
  helper.accessor("statusBayar", {
    header: "STATUS BAYAR",
    size: 120,
    meta: { align: "center" },
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full flex justify-center">
            <label className="flex items-center justify-center cursor-pointer p-2">
              <input
                type="checkbox"
                checked={editingRows[id]?.statusBayar ?? false}
                onChange={(e) => handleFieldChange(id, "statusBayar", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>
        );
      }
      return (
        <div className="w-full flex justify-center">
          {row.original.statusBayar ? (
            <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" />
          ) : (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      );
    },
  }),
  helper.accessor("buktiBayar", {
    header: "BUKTI BAYAR",
    size: 200,
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleFieldChange } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = isEditAll || !!editingRows[id];
      if (isEditing) {
        return (
          <div className="w-full">
            <input
              type="text"
              placeholder="Ref Bayar..."
              value={editingRows[id]?.buktiBayar ?? ""}
              onChange={(e) => handleFieldChange(id, "buktiBayar", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-inner"
            />
          </div>
        );
      }
      return (
        <div className="text-slate-800 dark:text-slate-200 font-medium truncate w-full" title={row.original.buktiBayar || "-"}>
          {row.original.buktiBayar || "-"}
        </div>
      );
    },
  }),
  helper.accessor("remarks", {
    header: "REMARKS",
    size: 200,
    meta: { defaultHidden: true },
    cell: ({ row }) => (
      <span className="text-slate-800 dark:text-slate-300 text-sm w-full block truncate" title={row.original.remarks || "-"}>
        {row.original.remarks || "-"}
      </span>
    ),
  }),
  helper.accessor("namaSupir", {
    header: "NAMA SUPIR",
    size: 150,
    meta: { defaultHidden: true },
    cell: ({ row }) => (
      <span className="text-slate-800 dark:text-slate-300 text-sm w-full block truncate" title={row.original.namaSupir || "-"}>
        {row.original.namaSupir || "-"}
      </span>
    ),
  }),
  helper.accessor("platNomor", {
    header: "PLAT NOMOR",
    size: 120,
    meta: { defaultHidden: true },
    cell: ({ row }) => (
      <span className="text-slate-800 dark:text-slate-300 text-sm w-full block truncate" title={row.original.platNomor || "-"}>
        {row.original.platNomor || "-"}
      </span>
    ),
  }),
  helper.accessor("tujuanDetail", {
    header: "TUJUAN",
    size: 180,
    meta: { defaultHidden: true },
    cell: ({ row }) => (
      <span className="text-slate-800 dark:text-slate-300 text-sm w-full block truncate" title={row.original.tujuanDetail || "-"}>
        {row.original.tujuanDetail || "-"}
      </span>
    ),
  }),
  helper.accessor("linkPo", {
    header: "LINK PO",
    size: 150,
    meta: { defaultHidden: true },
    cell: ({ row }) => (
      <span className="text-slate-800 dark:text-slate-300 text-sm w-full block truncate" title={row.original.linkPo || "-"}>
        {row.original.linkPo || "-"}
      </span>
    ),
  }),
  helper.display({
    id: "actions",
    header: "ACTIONS",
    size: 100,
    meta: { align: "center", pinned: "right" },
    cell: ({ row, table }) => {
      const { isEditAll, editingRows, handleSave, handleEditToggle, openModal } = table.options.meta as any;
      const id = row.original.id;
      const isEditing = !!editingRows[id] && !isEditAll;
      const saving = editingRows[id]?.saving;
      const error = editingRows[id]?.error;

      return (
        <div className="flex flex-col items-center justify-center gap-1 w-full">
          <div className="flex items-center gap-2">
            {!isEditAll && (
              isEditing ? (
                <>
                  <button
                    onClick={() => handleSave(id)}
                    disabled={saving}
                    className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-all shadow-sm"
                    title="Save"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => handleEditToggle(row.original)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleEditToggle(row.original)}
                  className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all shadow-sm"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
              )
            )}
            <button
              className="p-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm group"
              onClick={() => openModal(row.original)}
              title="View Details"
            >
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {error && <span className="text-[10px] text-rose-500 font-semibold text-center w-full">{error}</span>}
        </div>
      );
    },
  }),
];
