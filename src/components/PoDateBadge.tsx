import React from "react";

interface PoDateBadgeProps {
  dateNode: React.ReactNode;
  type: "TAGIH" | "PAID";
  buktiData?: string | null;
}

export function PoDateBadge({ dateNode, type, buktiData }: PoDateBadgeProps) {
  const showBadge = buktiData && buktiData !== "-";

  return (
    <div>
      {dateNode}
      {showBadge && (
        <div className="mt-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            {type}
          </span>
        </div>
      )}
    </div>
  );
}
