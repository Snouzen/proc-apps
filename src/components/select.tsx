"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export default function Select({
  options,
  value,
  onChange,
  placeholder,
  leftIcon,
  className,
  disabled,
}: Props) {

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {!!leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 bg-slate-50 rounded-2xl text-sm font-semibold text-left flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent",
            open ? "ring-2 ring-blue-500/20 bg-white border-blue-100" : "hover:bg-slate-100",
            leftIcon ? "pl-11 pr-4" : "px-4",
            disabled && "opacity-60 cursor-not-allowed bg-slate-100",
            className
          )}
        >
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {selectedLabel || placeholder || "Select option"}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-slate-400 transition-transform duration-200",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-30 left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden
                     origin-top animate-in fade-in zoom-in-95 duration-200"
        >
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors",
                  value === opt.value
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-blue-600" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
