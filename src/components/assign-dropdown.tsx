import { useState } from "react";
import { UserPlus } from "lucide-react";

export function AssignDropdown({
  po,
  units,
  regional,
  onAssigned,
  onClick,
}: {
  po: any;
  units: any[];
  regional: string | null;
  onAssigned: (unit: any) => void;
  onClick?: (e: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  
  const reg = String(regional || "").toLowerCase();
  
  const syn = (() => {
    if (
      reg.includes("bandung") ||
      reg.includes("reg 1") ||
      reg.includes("regional 1") ||
      reg.includes(" i")
    ) {
      return ["reg 1", "regional 1", "reg i", "regional i", "bandung"];
    }
    if (
      reg.includes("surabaya") ||
      reg.includes("reg 2") ||
      reg.includes("regional 2") ||
      reg.includes(" ii")
    ) {
      return ["reg 2", "regional 2", "reg ii", "regional ii", "surabaya"];
    }
    if (
      reg.includes("makassar") ||
      reg.includes("reg 3") ||
      reg.includes("regional 3") ||
      reg.includes(" iii")
    ) {
      return ["reg 3", "regional 3", "reg iii", "regional iii", "makassar"];
    }
    return reg ? [reg] : [];
  })();
  
  const list = (Array.isArray(units) ? units : []).filter((u: any) => {
    const name = String(u?.namaRegional || "").toLowerCase();
    return syn.length === 0 || syn.some((s) => name.includes(s));
  });
  
  const filtered = list.filter((u: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u?.siteArea || "")
        .toLowerCase()
        .includes(q) ||
      String(u?.namaRegional || "")
        .toLowerCase()
        .includes(q)
    );
  });
  
  const assign = async (unit: any) => {
    setBusy(true);
    try {
      await fetch("/api/po/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPo: po.noPo, siteArea: unit.siteArea }),
      });
      onAssigned(unit);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  
  return (
    <div className="relative inline-block" onClick={onClick}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition-all"
        disabled={busy}
        title="Assign ke Site Area"
      >
        <UserPlus size={16} className={busy ? "opacity-50" : ""} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1">
            <input
              type="text"
              placeholder="Cari site area / regional..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-300 outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-gray-400">
                Tidak ada site area
              </div>
            ) : (
              filtered.map((u: any) => (
                <button
                  key={`${u.idRegional}-${u.siteArea}`}
                  onClick={() => assign(u)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={busy}
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {u.siteArea}
                  </div>
                  <div className="text-xs text-slate-500">{u.namaRegional}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
