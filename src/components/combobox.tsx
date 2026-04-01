"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  inputClassName?: string;
  disabled?: boolean;
};

export default function Combobox({
  options,
  value,
  onChange,
  placeholder,
  leftIcon,
  inputClassName,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => {
    const q = (value || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);
  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
    }
  }, [value, open, options.length]);
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative transition-all duration-200",
        disabled &&
          "opacity-60 grayscale-[40%] pointer-events-none cursor-not-allowed scale-[0.99]",
      )}
    >
      {!!leftIcon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {leftIcon}
        </div>
      )}
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              setHighlightedIndex(0);
              return;
            }
            setHighlightedIndex((i) =>
              Math.min(i + 1, Math.max(0, filtered.length - 1)),
            );
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
              setOpen(true);
              setHighlightedIndex(Math.max(0, filtered.length - 1));
              return;
            }
            setHighlightedIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === "Enter") {
            if (open && filtered.length > 0) {
              e.preventDefault();
              const pick = filtered[highlightedIndex] ?? filtered[0];
              if (pick) {
                onChange(pick);
                setOpen(false);
              }
            }
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
          leftIcon ? "pl-11 pr-4" : "px-4",
          inputClassName,
        )}
      />
      {open && (
        <div
          className="absolute z-20 left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden
                     origin-top transition-all duration-150 ease-out animate-in fade-in zoom-in"
        >
          {filtered.length > 0 ? (
            <ul className="max-h-56 overflow-auto">
              {filtered.map((opt, idx) => (
                <li
                  key={opt}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2 text-sm cursor-pointer",
                    idx === highlightedIndex
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "hover:bg-slate-50",
                  )}
                >
                  {opt}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400">
              Tidak ada hasil
            </div>
          )}
        </div>
      )}
    </div>
  );
}
