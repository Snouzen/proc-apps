import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { PoDateBadge } from "@/components/PoDateBadge";
import { AssignDropdown } from "@/components/assign-dropdown";
import { Eye, Pencil, RefreshCw, CalendarClock } from "lucide-react";

export const toDate = (d: any) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

export const isCompleted = (po: any) => {
  const inv = String(po?.noInvoice || "").trim();
  return inv.length > 0 && inv !== "-" && inv.toLowerCase() !== "unknown";
};

export const daysUntil = (d: Date | null) => {
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export const getCompanyName = (po: any) => {
  const candidates = [
    "company", "companyName", "vendor", "supplier", "namaPt", "retailer", "name",
  ];
  for (const key of candidates) {
    const v = (po as any)[key];
    if (!v) continue;
    if (typeof v === "string" && v.trim().length > 0) return v;
    if (typeof v === "object") {
      if (v?.name) return v.name;
      if (v?.namaPt) return v.namaPt;
    }
  }
  if (po?.RitelModern?.namaPt) return po.RitelModern.namaPt;
  return "-";
};

export const statusText = (po: any) => {
  if (!isCompleted(po)) {
    const du = daysUntil(toDate(po.expiredTgl));
    if (du != null) {
      if (du < 0) return "Expired";
      if (du <= 14) return "Almost Expired";
    }
    return "Active";
  }
  return "Done";
};

export const statusChipClass = (t: string) =>
  t === "Done"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : t === "Almost Expired"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

export const dueFlag = (po: any) => {
  if (isCompleted(po)) return null;
  const du = daysUntil(toDate(po?.expiredTgl));
  if (du == null) return null;
  if (du < 0) return { label: "Expired", className: "bg-rose-200 text-rose-800 ring-1 ring-rose-300" };
  if (du <= 3) return { label: `D-${du}`, className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" };
  if (du <= 7) return { label: `D-${du}`, className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" };
  return null;
};

const helper = createColumnHelper<any>();

export const getDashboardColumns = ({
  role,
  poTableGroup,
  units,
  regional,
  onAssign,
  onEdit,
  onView,
}: {
  role: string | null;
  poTableGroup: string;
  units: any[];
  regional: string | null;
  onAssign: (po: any, unit: any) => void;
  onEdit: (po: any) => void;
  onView: (po: any) => void;
}) => [
  helper.display({
    id: "no",
    header: "NO",
    size: 60,
    meta: { align: "center" },
    cell: (info) => {
      const state = info.table.getState();
      // Use pagination state if manual pagination is enabled, otherwise fallback to local index
      const pageIndex = state.pagination?.pageIndex || 0;
      const pageSize = state.pagination?.pageSize || 10;
      return (
        <span className="text-slate-500 font-semibold tabular-nums text-sm">
          {pageIndex * pageSize + info.row.index + 1}
        </span>
      );
    },
  }),
  helper.accessor((row) => getCompanyName(row), {
    id: "company",
    header: "Company",
    size: 200,
    cell: (info) => (
      <div className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight max-w-[14rem] overflow-x-auto whitespace-nowrap scrollbar-hide" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  helper.accessor((row) => row.noPo || row.nopo || row.poNumber || "-", {
    id: "noPo",
    header: "No PO",
    size: 160,
    cell: (info) => (
      <div className="text-base font-mono font-bold text-slate-800 dark:text-slate-100 max-w-[12rem] overflow-x-auto whitespace-nowrap scrollbar-hide" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  helper.accessor((row) => {
    return typeof row?.pcsTotal === "number" ? row.pcsTotal : (Array.isArray(row?.Items) ? row.Items : []).reduce((acc: number, it: any) => acc + (Number(it?.pcs) || 0), 0);
  }, {
    id: "pcsPo",
    header: "PCS PO",
    size: 100,
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-base font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">
        {Number(info.getValue() || 0).toLocaleString("id-ID")}
      </span>
    ),
  }),
  helper.accessor((row) => {
    return typeof row?.totalNominal === "number" ? row.totalNominal : (Array.isArray(row?.Items) ? row.Items : []).reduce((acc: number, it: any) => acc + (Number(it?.nominal) || 0), 0);
  }, {
    id: "nominal",
    header: "Nominal",
    size: 150,
    meta: { align: "right" },
    cell: (info) => (
      <div className="text-base font-bold text-slate-700 dark:text-slate-200 tabular-nums max-w-[9rem] ml-auto overflow-x-auto whitespace-nowrap scrollbar-hide" title={`Rp ${Number(info.getValue() || 0).toLocaleString("id-ID")}`}>
        {`Rp ${Number(info.getValue() || 0).toLocaleString("id-ID")}`}
      </div>
    ),
  }),
  helper.accessor((row) => toDate(row?.createdAt) || toDate(row?.updatedAt) || toDate(row?.tglPo), {
    id: "submitDate",
    header: "Submit Date",
    size: 130,
    cell: (info) => {
      const dt = info.getValue() as Date | null;
      return <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">{dt ? dt.toLocaleDateString("id-ID") : "-"}</span>;
    },
  }),
  helper.accessor("tglPo", {
    id: "tglPo",
    header: "Tgl PO",
    size: 130,
    cell: (info) => {
      const po = info.row.original;
      return (
        <PoDateBadge 
          dateNode={<span className="block text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">{toDate(po.tglPo)?.toLocaleDateString("id-ID") || "-"}</span>}
          type="TAGIH"
          buktiData={po.buktiTagih}
        />
      );
    },
  }),
  helper.accessor((row) => row.tglkirim || row.tglKirim, {
    id: "tglKirim",
    header: "Tgl Kirim",
    size: 130,
    cell: (info) => {
      const po = info.row.original;
      return <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight whitespace-nowrap">{toDate(po.tglkirim || po.tglKirim)?.toLocaleDateString("id-ID") || "-"}</span>;
    },
  }),
  helper.accessor("expiredTgl", {
    id: "dueDate",
    header: "Tgl Expired",
    size: 130,
    cell: (info) => {
      const po = info.row.original;
      return (
        <PoDateBadge 
          dateNode={<span className="block text-sm font-bold text-red-500 leading-tight whitespace-nowrap">{toDate(po.expiredTgl)?.toLocaleDateString("id-ID") || "-"}</span>}
          type="PAID"
          buktiData={po.buktiBayar}
        />
      );
    },
  }),
  helper.accessor((row) => row?.regional || row?.UnitProduksi?.namaRegional || "-", {
    id: "regional",
    header: "Regional",
    size: 130,
    cell: (info) => (
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[10rem] overflow-x-auto whitespace-nowrap scrollbar-hide" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  helper.accessor((row) => statusText(row), {
    id: "status",
    header: "Status",
    size: 180,
    cell: (info) => {
      const po = info.row.original;
      const text = info.getValue();
      const flag = dueFlag(po);
      return (
        <div className="flex items-center gap-1.5 flex-wrap max-w-[10rem]">
          <span className={`inline-flex items-center gap-2 text-sm font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusChipClass(text)}`}>
            {text}
          </span>
          {flag && <span title="Mendekati due date" className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${flag.className}`}>{flag.label}</span>}
        </div>
      );
    },
  }),
  helper.display({
    id: "actions",
    header: "Actions",
    size: 150,
    meta: { align: "center" },
    cell: (info) => {
      const po = info.row.original;
      return (
        <div className="flex items-center justify-center gap-2" onClick={(e: any) => e.stopPropagation()}>
          {role === "rm" && poTableGroup === "assign" ? (
            <AssignDropdown
              po={po}
              units={units}
              regional={regional}
              onAssigned={(unit: any) => onAssign(po, unit)}
            />
          ) : (
            <>
              {(role === "pusat" || role === "rm" || role === "sitearea") && (
                <button
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm"
                  title="Edit"
                  onClick={(e) => { e.stopPropagation(); onEdit(po); }}
                >
                  <Pencil size={14} className="text-amber-500" />
                </button>
              )}
              <button
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                title="View Detail"
                onClick={(e) => { e.stopPropagation(); onView(po); }}
              >
                <Eye size={16} className="text-slate-600" />
              </button>
              {role === "pusat" && (
                <>
                  <button className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm" title="Update" onClick={(e) => { e.stopPropagation(); onView(po); }}>
                    <RefreshCw size={14} className="text-blue-600" />
                  </button>
                  <button className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-sm" title="Extend" onClick={(e) => { e.stopPropagation(); onView(po); }}>
                    <CalendarClock size={14} className="text-emerald-600" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      );
    },
  }),
];
