import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check, Search } from "lucide-react";

export function MultiSelectFilterDropdown({
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = options.filter(
    (o) => o && o.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={`relative w-full ${open ? "z-50" : "z-0"}`} ref={wrapperRef}>
      <div
        className={`relative flex min-h-[38px] flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl border ${open ? "border-emerald-500 bg-white dark:bg-slate-800" : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"} ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50" : "hover:border-gray-300 dark:hover:border-slate-700 cursor-text transition-colors"}`}
        onClick={() => !disabled && setOpen(true)}
      >
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 w-full mb-1">
            {value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-md max-w-full overflow-hidden">
                <span className="truncate max-w-[150px]">{v}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter((val) => val !== v));
                    }}
                    className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between w-full">
          <input
            type="text"
            className="flex-1 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal min-w-[50px]"
            placeholder={value.length === 0 ? (placeholder || "Ketik atau pilih...") : "Tambah lagi..."}
            value={inputValue}
            disabled={disabled}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => !disabled && setOpen(true)}
          />
          {!disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0 px-1"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
          <ul className="flex flex-col gap-0.5">
            {value.length > 0 && (
              <li
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer flex items-center transition-colors border-b border-gray-50 dark:border-slate-700 mb-1"
                onClick={() => {
                  setInputValue("");
                  onChange([]);
                }}
              >
                <div className="flex items-center gap-2">
                  <X size={14} />
                  Hapus Semua Pilihan ({value.length})
                </div>
              </li>
            )}

            {inputValue && !options.some((o) => o?.toLowerCase() === inputValue.toLowerCase()) && (
              <li
                className="px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer flex items-center transition-colors mt-1"
                onClick={() => {
                  if (!value.includes(inputValue)) {
                    onChange([...value, inputValue]);
                  }
                  setInputValue("");
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={14} />
                  <span>Tambah <q>{inputValue}</q></span>
                </div>
              </li>
            )}

            {filteredOptions.length > 0 ? (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                {filteredOptions.map((opt, i) => {
                  const isSelected = value.includes(opt);
                  return (
                    <li
                      key={i}
                      onClick={() => {
                        if (isSelected) {
                          onChange(value.filter((v) => v !== opt));
                        } else {
                          onChange([...value, opt]);
                        }
                        setInputValue("");
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{opt}</span>
                      </div>
                    </li>
                  );
                })}
              </>
            ) : (
              !inputValue && <li className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">Tidak ada data yang tersedia</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
