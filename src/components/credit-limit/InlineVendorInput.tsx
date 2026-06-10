"use client";

import { useState } from "react";

export function InlineVendorInput({
  po,
  onUpdate,
  disabled,
}: {
  po: any;
  onUpdate: (id: string, val: string) => void;
  disabled?: boolean;
}) {
  const [val, setVal] = useState(po.kodeVendor || "");
  const [loading, setLoading] = useState(false);

  const handleBlur = async () => {
    const trimmed = val.trim();
    if (trimmed === (po.kodeVendor || "").trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/po/credit-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: po.id,
          action: "updateKodeVendor",
          kodeVendor: trimmed,
        }),
      });
      if (res.ok) {
        onUpdate(po.id, trimmed);
      } else {
        setVal(po.kodeVendor || "");
      }
    } catch (e) {
      setVal(po.kodeVendor || "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-28">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        placeholder={disabled ? "-" : "Ketik..."}
        className="w-full px-2 py-1.5 text-xs font-bold text-center uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:text-slate-200 transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
        disabled={loading || disabled}
      />
      {loading && (
        <div className="absolute right-2 top-2.5 w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
