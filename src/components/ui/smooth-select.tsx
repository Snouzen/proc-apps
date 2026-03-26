import React from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

export default function SmoothSelect({
  options,
  value,
  onChange,
  className,
  width = 176,
  disabled = false,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  width?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const current = options.find((o) => o.value === value) || options[0];

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className || ""} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      style={{ width }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full h-10 rounded-xl border border-gray-300 bg-white/90 text-sm font-semibold px-3 pr-9 text-slate-800 transition-all duration-200 ease-out flex items-center justify-between ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-none"
            : "hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-sm hover:shadow"
        }`}
      >
        <span className="truncate">{current?.label || "-"}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`absolute left-0 mt-2 w-full z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`rounded-xl border border-gray-200 bg-white shadow-xl transition-all duration-200 origin-top ${
            open ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                    o.value === value
                      ? "bg-gray-100 text-slate-900"
                      : "text-slate-800 hover:bg-gray-50"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
