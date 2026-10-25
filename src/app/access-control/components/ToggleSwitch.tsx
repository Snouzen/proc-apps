"use client";

import React from "react";

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
          checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      {label && (
        <span
          className={`text-xs font-bold ${
            checked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
          }`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
