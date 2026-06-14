"use client";

import { useMemo, useState } from "react";
import PODetailModal from "@/components/po-detail-modal";
import { Search } from "lucide-react";
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import * as Popover from "@radix-ui/react-popover";
import { GlobalPagination } from "@/components/global-pagination";
import { CustomSelect } from "@/components/ui/custom-select";
import { PoDateBadge } from "@/components/PoDateBadge";

import { useAuthData } from "@/hooks/useAuthData";
import { useMasterUnits } from "@/hooks/useMasterUnits";
import { usePoDetailModal } from "@/hooks/usePoDetailModal";
import { useNeedAssignTable, NeedAssignRow } from "@/hooks/useNeedAssignTable";

export default function NeedAssignPage() {
  const { role, regional } = useAuthData();
  const { unitData: units } = useMasterUnits();
  
  const tableState = useNeedAssignTable({ role, regional });
  const detailModal = usePoDetailModal({ role, regional });

  const [hoveredPoId, setHoveredPoId] = useState<string | null>(null);

  const formatDate = (d: any) => {
    const date = d ? new Date(d) : null;
    if (!date || isNaN(date.getTime())) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleDateString("id-ID", { month: "short" });
    const year = date.getFullYear().toString();
    return `${day} ${month} ${year}`;
  };

  const filteredRows = useMemo(() => tableState.rows, [tableState.rows]);
  const totalPages = Math.max(1, Math.ceil(tableState.total / tableState.rowsPerPage));

  const keyify = (s: any) =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\bregional\b/g, "reg")
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-z])/g, "$1 $2")
      .replace(/\s+/g, " ");

  const siteOptionsByRegional = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const u of units) {
      const k = keyify(u.namaRegional || "");
      if (!k) continue;
      if (!map[k]) map[k] = [];
      if (u.siteArea) map[k].push(u.siteArea);
    }
    for (const k of Object.keys(map)) {
      map[k] = Array.from(new Set(map[k])).sort();
    }
    return map;
  }, [units]);
  
  const siteRegionalKeys = useMemo(
    () => Object.keys(siteOptionsByRegional),
    [siteOptionsByRegional],
  );

  const columns: ColumnDef<NeedAssignRow>[] = [
    {
      header: "No",
      id: "index",
      cell: ({ row }) => (
        <span className="text-black dark:text-slate-200 font-bold">
          {(tableState.page - 1) * tableState.rowsPerPage + row.index + 1}
        </span>
      ),
    },
    {
      header: "No PO",
      accessorKey: "noPo",
      cell: ({ row }) => (
        <div
          className="font-semibold text-black dark:text-slate-200 uppercase max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.original.noPo || "-")}
        >
          {row.original.noPo || "-"}
        </div>
      ),
    },
    {
      header: "Company",
      accessorKey: "company",
      cell: ({ row }) => (
        <div
          className="text-slate-800 dark:text-slate-200 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.original.company || row.original?.RitelModern?.namaPt || "-")}
        >
          {row.original.company || row.original?.RitelModern?.namaPt || "-"}
        </div>
      ),
    },
    {
      header: "Tujuan (Toko/DC)",
      accessorKey: "tujuanDetail",
      cell: ({ row }) => (
        <div
          className="text-slate-800 dark:text-slate-200 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.original.tujuanDetail || "-")}
        >
          {row.original.tujuanDetail || "-"}
        </div>
      ),
    },
    {
      header: "Regional",
      accessorKey: "regional",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const current =
          tableState.edited[noPo]?.regional ??
          (row.original.regional && row.original.regional !== "UNKNOWN"
            ? row.original.regional
            : "") ??
          "";
          
        if (role === "pusat") {
          return (
            <div className="flex items-center gap-2">
              <CustomSelect
                value={current}
                onChange={(val) =>
                  tableState.setEdited((prev) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: val,
                      error: null,
                      ok: false,
                    },
                  }))
                }
                placeholder={row.original.regional ? "—" : "Pilih…"}
                options={Array.from(new Set(units.map((u) => u.namaRegional)))
                  .filter(Boolean)
                  .sort()
                  .map((opt) => ({ value: opt, label: opt }))}
                onClear={() =>
                  tableState.setEdited((prev) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: "",
                      siteArea: "",
                      error: null,
                    },
                  }))
                }
                className="min-w-[220px]"
              />
            </div>
          );
        }
        
        const lockedRegional =
          (row.original.regional && row.original.regional !== "UNKNOWN"
            ? row.original.regional
            : null) ??
          regional ??
          "";
          
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {lockedRegional || "-"}
          </span>
        );
      },
    },
    {
      header: "Site Area",
      accessorKey: "siteArea",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const currRegionalRaw = tableState.edited[noPo]?.regional ?? row.original.regional ?? "";
        
        const effectiveRegional =
          (regional && regional !== "UNKNOWN" ? regional : null) ||
          (currRegionalRaw && currRegionalRaw !== "UNKNOWN" ? currRegionalRaw : "");
          
        const currentSite = tableState.edited[noPo]?.siteArea ?? row.original.siteArea ?? "";
        
        const regKey = keyify(effectiveRegional);
        const resolvedKey =
          regKey && siteOptionsByRegional[regKey]
            ? regKey
            : siteRegionalKeys.find((k) => (regKey && k.includes(regKey)) || regKey.includes(k)) || regKey;
            
        const options = resolvedKey ? siteOptionsByRegional[resolvedKey] || [] : [];
        const disabled = !effectiveRegional || options.length === 0;

        return (
          <div className="flex items-center gap-2">
            <CustomSelect
              value={currentSite || ""}
              disabled={disabled}
              onChange={(val) =>
                tableState.setEdited((prev) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: val,
                    error: null,
                    ok: false,
                  },
                }))
              }
              placeholder={
                row.original.siteArea
                  ? "—"
                  : disabled
                    ? effectiveRegional
                      ? "Tidak ada site area"
                      : "Regional terkunci"
                    : "Pilih…"
              }
              options={options.map((opt) => ({ value: opt, label: opt }))}
              onClear={() =>
                tableState.setEdited((prev) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: "",
                    error: null,
                  },
                }))
              }
              className="min-w-40"
            />
          </div>
        );
      },
    },
    {
      header: "Tgl PO",
      accessorKey: "tglPo",
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={
            <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
              {formatDate(row.original.tglPo)}
            </span>
          }
          type="TAGIH"
          buktiData={row.original.buktiTagih}
        />
      ),
    },
    {
      header: "Expired",
      accessorKey: "expiredTgl",
      cell: ({ row }) => (
        <PoDateBadge 
          dateNode={
            <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
              {formatDate(row.original.expiredTgl)}
            </span>
          }
          type="PAID"
          buktiData={row.original.buktiBayar}
        />
      ),
    },
    {
      header: "No Invoice",
      accessorKey: "noInvoice",
      cell: ({ row }) => (
        <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap text-[12px]">
          {row.original.noInvoice || "-"}
        </span>
      ),
    },
    {
      header: "Remarks",
      accessorKey: "remarks",
      cell: ({ row }) => {
        const remarks = row.original.remarks;
        if (!remarks) return <span className="text-slate-300 dark:text-slate-500 text-[12px]">-</span>;
        
        return (
          <div className="flex justify-center py-2">
            <Popover.Root 
              open={hoveredPoId === row.original.id} 
              onOpenChange={(open) => !open && setHoveredPoId(null)}
            >
              <Popover.Trigger asChild>
                <div 
                  className="max-w-[120px] cursor-help outline-none"
                  onMouseEnter={() => setHoveredPoId(row.original.id)}
                  onMouseLeave={() => setHoveredPoId(null)}
                >
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 rounded-lg text-[10px] font-bold transition-all duration-300 hover:bg-rose-100/80 truncate w-full shadow-sm">
                    {remarks}
                  </span>
                </div>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content 
                  side="top" 
                  sideOffset={10}
                  collisionPadding={20}
                  className="z-[9999] w-max max-w-[340px] bg-slate-900/95 backdrop-blur-md text-white/95 text-[11px] font-medium px-6 py-4 rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_25px_rgba(225,29,72,0.2)] border border-white/10 animate-in fade-in zoom-in-95 duration-200 outline-none leading-relaxed whitespace-normal break-words"
                >
                  {remarks}
                  <Popover.Arrow className="fill-slate-900/95" width={18} height={9} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      },
    },
    {
      header: "Jml Pcs",
      id: "pcsTotal",
      cell: ({ row }) => {
        const total = (Array.isArray(row.original.Items) ? row.original.Items : []).reduce(
          (acc: number, it: any) => acc + (Number(it?.pcs) || 0),
          0,
        );
        return (
          <span className="text-slate-700 dark:text-slate-200 font-bold text-[12px] tabular-nums whitespace-nowrap inline-block text-right pr-4">
            {total > 0 ? total.toLocaleString("id-ID") : "-"}
          </span>
        );
      },
    },
    {
      header: "Actions",
      cell: ({ row }) => {
        const noPo = row.original.noPo;
        const st = tableState.edited[noPo] || {};
        
        const selectedReg = st.regional !== undefined ? st.regional : row.original.regional;
        const selectedSite = st.siteArea !== undefined ? st.siteArea : row.original.siteArea;
        
        const cleanStr = (val: any) => {
          if (!val) return "";
          const str = String(val).trim();
          if (str.toLowerCase() === "unknown" || str.toLowerCase() === "pilih..." || str.toLowerCase().includes("unit produksi")) return "";
          return str;
        };
        
        const currentReg = cleanStr(selectedReg);
        const currentSite = cleanStr(selectedSite);
        const originalReg = cleanStr(row.original.regional);
        const originalSite = cleanStr(row.original.siteArea);
        
        const hasChanges = currentReg !== originalReg || currentSite !== originalSite;
        const isValid = role === "pusat" ? currentReg !== "" : currentReg !== "" && currentSite !== "";
        const isButtonDisabled = !isValid || !hasChanges || !!st.saving;

        const onAssign = async () => {
          const reg =
            role === "pusat"
              ? tableState.edited[noPo]?.regional ||
                (row.original.regional && row.original.regional !== "UNKNOWN" ? row.original.regional : null)
              : (regional && regional !== "UNKNOWN" ? regional : null) ||
                (row.original.regional && row.original.regional !== "UNKNOWN" ? row.original.regional : null);

          if (!reg) {
            tableState.setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Isi regional dulu" },
            }));
            return;
          }

          if (role === "rm" && !st.siteArea) {
            tableState.setEdited((prev) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Pilih site area" },
            }));
            return;
          }

          tableState.setEdited((prev) => ({
            ...prev,
            [noPo]: { ...(prev[noPo] || {}), saving: true, error: null },
          }));
          
          try {
            const res = await fetch("/api/po/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                noPo, 
                regional: reg,
                siteArea: st.siteArea === "Pilih..." || !st.siteArea ? null : st.siteArea 
              }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error((json as any)?.error || res.statusText);
            
            tableState.setRows((prev) => prev.filter((r) => r.noPo !== noPo));
            tableState.setTotal((prev) => Math.max(0, prev - 1));

            tableState.setEdited((prev) => {
              const next = { ...prev };
              delete next[noPo];
              return next;
            });
          } catch (e: any) {
            tableState.setEdited((prev) => ({
              ...prev,
              [noPo]: {
                ...(prev[noPo] || {}),
                saving: false,
                error: e?.message || "Gagal assign",
              },
            }));
          }
        };

        return (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <button
                disabled={isButtonDisabled}
                onClick={onAssign}
                className={`inline-flex h-9 px-3 items-center justify-center rounded-xl border text-xs font-bold whitespace-nowrap transition-colors duration-150 ${
                  isButtonDisabled
                    ? "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                    : "border-blue-200 dark:border-blue-800 bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                }`}
              >
                {st.saving ? "Saving…" : "Assign"}
              </button>
              <button
                className="inline-flex h-9 px-3 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold whitespace-nowrap"
                onClick={() => detailModal.openModal(row.original)}
              >
                View
              </button>
            </div>
            {st.error && (
              <div className="mt-1 text-[11px] font-semibold text-rose-600">
                {st.error}
              </div>
            )}
            {st.ok && (
              <div className="mt-1 text-[11px] font-semibold text-emerald-600">
                Berhasil
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Need Assign
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-0.5">
            Daftar PO yang menunggu mapping Unit Produksi/Regional.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari PO, Perusahaan..."
            className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            value={tableState.search}
            onChange={(e) => tableState.setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden relative min-h-[400px] flex flex-col">
        {tableState.loading && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300">
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Memuat data...
              </span>
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-300 flex-1 flex flex-col ${tableState.isTransitioning ? "opacity-50" : "opacity-100"}`}>
          <div className="overflow-x-auto w-full flex-1">
            {tableState.error ? (
              <div className="p-8 text-center text-rose-500 font-medium">
                {tableState.error}
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-max xl:min-w-[1400px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 dark:border-slate-800">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4 align-top">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!tableState.loading && filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium"
                      >
                        Tidak ada data yang perlu di-assign
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {!tableState.loading && !tableState.error && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
            Total Data: <span className="text-slate-900 dark:text-slate-100 font-bold">{tableState.total.toLocaleString("id-ID")}</span> baris
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Rows per page
            </span>
            <CustomSelect
              value={tableState.rowsPerPage}
              onChange={(val) => {
                tableState.setRowsPerPage(Number(val));
                tableState.setPage(1);
              }}
              options={[
                { value: 10, label: "10" },
                { value: 25, label: "25" },
                { value: 50, label: "50" },
                { value: 100, label: "100" },
              ]}
              className="w-20 shadow-sm dark:shadow-none"
            />
          </div>

          <GlobalPagination
            currentPage={tableState.page}
            totalPages={totalPages}
            onPageChange={tableState.setPage}
            itemsCount={filteredRows.length}
            totalItems={tableState.total}
            itemName="po"
          />
        </div>
      )}

      <PODetailModal
        open={detailModal.openDetail}
        onClose={() => detailModal.setOpenDetail(false)}
        data={detailModal.detailData}
      />
    </div>
  );
}
