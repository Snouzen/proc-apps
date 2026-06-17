import { ColumnDef } from "@/components/data-table/types";
import { NeedAssignRow } from "@/hooks/useNeedAssignTable";
import { CustomSelect } from "@/components/ui/custom-select";
import { PoDateBadge } from "@/components/PoDateBadge";
import * as Popover from "@radix-ui/react-popover";

interface UseNeedAssignColumnsProps {
  role: string;
  regional: string;
  units: any[];
  tableState: any;
  detailModal: any;
  hoveredPoId: string | null;
  setHoveredPoId: (id: string | null) => void;
  siteOptionsByRegional: Record<string, string[]>;
  siteRegionalKeys: string[];
  keyify: (s: any) => string;
  formatDate: (d: any) => string;
}

export function useNeedAssignColumns({
  role,
  regional,
  units,
  tableState,
  detailModal,
  hoveredPoId,
  setHoveredPoId,
  siteOptionsByRegional,
  siteRegionalKeys,
  keyify,
  formatDate,
}: UseNeedAssignColumnsProps): ColumnDef<NeedAssignRow>[] {
  return [
    {
      label: "No PO",
      key: "noPo",
      width: "w-[160px]",
      render: (_val: any, row: NeedAssignRow) => (
        <div
          className="font-semibold text-black dark:text-slate-200 uppercase max-w-[200px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.noPo || "-")}
        >
          {row.noPo || "-"}
        </div>
      ),
    },
    {
      label: "Company",
      key: "company",
      width: "w-[200px]",
      render: (_val: any, row: NeedAssignRow) => (
        <div
          className="text-slate-800 dark:text-slate-200 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.company || row?.RitelModern?.namaPt || "-")}
        >
          {row.company || row?.RitelModern?.namaPt || "-"}
        </div>
      ),
    },
    {
      label: "Tujuan (Toko/DC)",
      key: "tujuanDetail",
      width: "w-[200px]",
      render: (_val: any, row: NeedAssignRow) => (
        <div
          className="text-slate-800 dark:text-slate-200 font-medium max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
          title={String(row.tujuanDetail || "-")}
        >
          {row.tujuanDetail || "-"}
        </div>
      ),
    },
    {
      label: "Regional",
      key: "regional",
      width: "w-[220px]",
      render: (_val: any, row: NeedAssignRow) => {
        const noPo = row.noPo;
        const current =
          tableState.edited[noPo]?.regional ??
          (row.regional && row.regional !== "UNKNOWN"
            ? row.regional
            : "") ??
          "";

        if (role === "pusat") {
          return (
            <div className="flex items-center gap-2">
              <CustomSelect
                value={current}
                onChange={(val) =>
                  tableState.setEdited((prev: any) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: val,
                      error: null,
                      ok: false,
                    },
                  }))
                }
                placeholder={row.regional ? "—" : "Pilih…"}
                options={Array.from(new Set(units.map((u) => u.namaRegional)))
                  .filter(Boolean)
                  .sort()
                  .map((opt) => ({ value: opt, label: opt }))}
                onClear={() =>
                  tableState.setEdited((prev: any) => ({
                    ...prev,
                    [noPo]: {
                      ...(prev[noPo] || {}),
                      regional: "",
                      siteArea: "",
                      error: null,
                    },
                  }))
                }
                className="w-full"
              />
            </div>
          );
        }

        const lockedRegional =
          (row.regional && row.regional !== "UNKNOWN"
            ? row.regional
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
      label: "Site Area",
      key: "siteArea",
      width: "w-[200px]",
      render: (_val: any, row: NeedAssignRow) => {
        const noPo = row.noPo;
        const currRegionalRaw = tableState.edited[noPo]?.regional ?? row.regional ?? "";

        const effectiveRegional =
          (regional && regional !== "UNKNOWN" ? regional : null) ||
          (currRegionalRaw && currRegionalRaw !== "UNKNOWN" ? currRegionalRaw : "");

        const currentSite = tableState.edited[noPo]?.siteArea ?? row.siteArea ?? "";

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
                tableState.setEdited((prev: any) => ({
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
                row.siteArea
                  ? "—"
                  : disabled
                    ? effectiveRegional
                      ? "Tidak ada site area"
                      : "Regional terkunci"
                    : "Pilih…"
              }
              options={options.map((opt) => ({ value: opt, label: opt }))}
              onClear={() =>
                tableState.setEdited((prev: any) => ({
                  ...prev,
                  [noPo]: {
                    ...(prev[noPo] || {}),
                    siteArea: "",
                    error: null,
                  },
                }))
              }
              className="w-full"
            />
          </div>
        );
      },
    },
    {
      label: "Tgl PO",
      key: "tglPo",
      width: "w-[120px]",
      render: (_val: any, row: NeedAssignRow) => (
        <PoDateBadge
          dateNode={
            <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
              {formatDate(row.tglPo)}
            </span>
          }
          type="TAGIH"
          buktiData={row.buktiTagih}
        />
      ),
    },
    {
      label: "Expired",
      key: "expiredTgl",
      width: "w-[120px]",
      render: (_val: any, row: NeedAssignRow) => (
        <PoDateBadge
          dateNode={
            <span className="text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap text-[12px] min-w-[50px] inline-block text-left">
              {formatDate(row.expiredTgl)}
            </span>
          }
          type="PAID"
          buktiData={row.buktiBayar}
        />
      ),
    },

    {
      label: "Remarks",
      key: "remarks",
      width: "w-[120px]",
      render: (_val: any, row: NeedAssignRow) => {
        const remarks = row.remarks;
        if (!remarks) return <span className="text-slate-300 dark:text-slate-500 text-[12px]">-</span>;

        return (
          <div className="flex justify-center py-2">
            <Popover.Root
              open={hoveredPoId === row.id}
              onOpenChange={(open) => !open && setHoveredPoId(null)}
            >
              <Popover.Trigger asChild>
                <div
                  className="max-w-[120px] cursor-help outline-none"
                  onMouseEnter={() => setHoveredPoId(row.id)}
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
      label: "Jml Pcs",
      key: "pcsTotal",
      width: "w-[100px]",
      align: "right",
      render: (_val: any, row: NeedAssignRow) => {
        const total = (Array.isArray(row.Items) ? row.Items : []).reduce(
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
      label: "Actions",
      key: "actions",
      width: "w-[160px]",
      align: "right",
      render: (_val: any, row: NeedAssignRow) => {
        const noPo = row.noPo;
        const st = tableState.edited[noPo] || {};

        const selectedReg = st.regional !== undefined ? st.regional : row.regional;
        const selectedSite = st.siteArea !== undefined ? st.siteArea : row.siteArea;

        const cleanStr = (val: any) => {
          if (!val) return "";
          const str = String(val).trim();
          if (str.toLowerCase() === "unknown" || str.toLowerCase() === "pilih..." || str.toLowerCase().includes("unit produksi")) return "";
          return str;
        };

        const currentReg = cleanStr(selectedReg);
        const currentSite = cleanStr(selectedSite);
        const originalReg = cleanStr(row.regional);
        const originalSite = cleanStr(row.siteArea);

        const hasChanges = currentReg !== originalReg || currentSite !== originalSite;
        const isValid = role === "pusat" ? currentReg !== "" : currentReg !== "" && currentSite !== "";
        const isButtonDisabled = !isValid || !hasChanges || !!st.saving;

        const onAssign = async () => {
          const reg =
            role === "pusat"
              ? tableState.edited[noPo]?.regional ||
                (row.regional && row.regional !== "UNKNOWN" ? row.regional : null)
              : (regional && regional !== "UNKNOWN" ? regional : null) ||
                (row.regional && row.regional !== "UNKNOWN" ? row.regional : null);

          if (!reg) {
            tableState.setEdited((prev: any) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Isi regional dulu" },
            }));
            return;
          }

          if (role === "rm" && !st.siteArea) {
            tableState.setEdited((prev: any) => ({
              ...prev,
              [noPo]: { ...(prev[noPo] || {}), error: "Pilih site area" },
            }));
            return;
          }

          tableState.setEdited((prev: any) => ({
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

            tableState.setRows((prev: any) => prev.filter((r: any) => r.noPo !== noPo));
            tableState.setTotal((prev: number) => Math.max(0, prev - 1));

            tableState.setEdited((prev: any) => {
              const next = { ...prev };
              delete next[noPo];
              return next;
            });
          } catch (e: any) {
            tableState.setEdited((prev: any) => ({
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
                onClick={() => detailModal.openModal(row)}
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
}
