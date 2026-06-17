import React from "react";

export function StatusBadge({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-lg font-black text-[9px] border ${
        checked
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800"
      }`}
    >
      {label}
    </span>
  );
}

export function HighlightText({
  text,
  highlight,
}: {
  text: string;
  highlight: string | string[];
}) {
  const hArr = Array.isArray(highlight) ? highlight : [highlight];
  const validH = hArr.map(h => String(h || "").trim()).filter(Boolean);
  if (validH.length === 0) return <>{text}</>;
  
  const escaped = validH.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/20 text-yellow-900 dark:text-yellow-200 px-0.5 rounded"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
