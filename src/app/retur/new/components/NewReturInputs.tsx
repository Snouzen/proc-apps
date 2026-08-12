import React, { useState, useEffect, useMemo, memo } from "react";
import { X, Package, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { id } from "date-fns/locale";

export const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  // Escape regex special characters to prevent RegExp syntax errors
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 text-black px-0.5 rounded-sm font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
};

export const EliteSearchableInput = memo(
  ({
    label,
    placeholder,
    icon: Icon,
    value,
    onSearch,
    onCommit,
    items,
    open,
    onOpenChange,
  }: any) => {
    const [internalVal, setInternalVal] = useState(value || "");
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
      setInternalVal(value || "");
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(internalVal);
      }, 500);
      return () => clearTimeout(timer);
    }, [internalVal, onSearch]);

    useEffect(() => {
      if (!open) {
        setActiveIndex(-1);
      } else if (items.length > 0) {
        setActiveIndex(0);
      } else {
        setActiveIndex(-1);
      }
    }, [open, items.length]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
      onCommit(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p > 0 ? p - 1 : p));
      } else if (e.key === "Enter") {
        if (activeIndex !== -1 && items[activeIndex]) {
          e.preventDefault();
          const selected = items[activeIndex];
          setInternalVal(selected);
          onCommit(selected);
          onOpenChange(false);
        }
      }
    };

    return (
      <div className="space-y-2 overflow-visible">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
          {label}
        </label>
        <Popover.Root open={open} onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <div className="relative group">
              <input
                type="text"
                value={internalVal}
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-2xl transition-all outline-none pr-12 cursor-pointer"
                onChange={handleChange}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {internalVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalVal("");
                      onCommit("");
                    }}
                    className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                <Icon
                  size={18}
                  className="text-slate-300 pointer-events-none"
                />
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[9999] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl dark:shadow-slate-900/50 py-2 w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
              sideOffset={5}
              align="start"
              sticky="always"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {items.map((tj: string, idx: number) => (
                <button
                  key={tj}
                  type="button"
                  onClick={() => {
                    setInternalVal(tj);
                    onCommit(tj);
                    onOpenChange(false);
                  }}
                  className={`w-full px-6 py-3 text-left text-xs font-bold transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 cursor-pointer ${idx === activeIndex ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {highlightMatch(tj, internalVal)}
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  },
);

EliteSearchableInput.displayName = "EliteSearchableInput";

export const EliteProductInput = memo(
  ({
    label,
    placeholder,
    value,
    onSearch,
    onCommit,
    items,
    open,
    onOpenChange,
  }: any) => {
    const [internalVal, setInternalVal] = useState(value || "");
    const [activeIndex, setActiveIndex] = useState(-1);

    useEffect(() => {
      setInternalVal(value || "");
    }, [value]);

    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(internalVal);
      }, 500);
      return () => clearTimeout(timer);
    }, [internalVal, onSearch]);

    useEffect(() => {
      if (!open) {
        setActiveIndex(-1);
      } else if (items.length > 0) {
        setActiveIndex(0);
      } else {
        setActiveIndex(-1);
      }
    }, [open, items.length]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalVal(e.target.value);
      onCommit(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p > 0 ? p - 1 : p));
      } else if (e.key === "Enter") {
        if (activeIndex !== -1 && items[activeIndex]) {
          e.preventDefault();
          const selected = items[activeIndex].name;
          setInternalVal(selected);
          onCommit(selected);
          onOpenChange(false);
        }
      }
    };

    return (
      <div className="space-y-2 overflow-visible">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 cursor-pointer">
          {label}
        </label>
        <Popover.Root open={open} onOpenChange={onOpenChange}>
          <Popover.Trigger asChild>
            <div className="relative group">
              <input
                type="text"
                value={internalVal}
                placeholder={placeholder}
                onKeyDown={handleKeyDown}
                className="w-full px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-2xl transition-all outline-none pr-12 cursor-pointer"
                onChange={handleChange}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {internalVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInternalVal("");
                      onCommit("");
                    }}
                    className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
                <Package
                  size={18}
                  className="text-slate-300 pointer-events-none"
                />
              </div>
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-[9999] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl dark:shadow-slate-900/50 py-2 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
              sideOffset={5}
              align="start"
              sticky="always"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {items.map((p: any, idx: number) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setInternalVal(p.name);
                    onCommit(p.name);
                    onOpenChange(false);
                  }}
                  className={`w-full px-6 py-4 text-left border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-all cursor-pointer group ${idx === activeIndex ? "bg-indigo-600" : "hover:bg-indigo-600"}`}
                >
                  <span
                    className={`text-xs font-bold block transition-all ${idx === activeIndex ? "text-white" : "text-slate-700 dark:text-slate-400 group-hover:text-white dark:group-hover:text-white"}`}
                  >
                    {highlightMatch(p.name, internalVal)}
                  </span>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  },
);

EliteProductInput.displayName = "EliteProductInput";

export function CustomInlineDatePicker({
  value,
  onChange,
  placeholder = "Pilih Tanggal",
  colorScheme = "indigo",
}: {
  value: any;
  onChange: (date: string) => void;
  placeholder?: string;
  colorScheme?: "indigo" | "rose" | "slate";
}) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date(),
  );
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);
  const colors = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 ring-indigo-500/10 dark:ring-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-700",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50 ring-rose-500/10 dark:ring-rose-500/20 hover:border-rose-300 dark:hover:border-rose-700",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 ring-slate-500/10 dark:ring-slate-500/20 hover:border-slate-300 dark:hover:border-slate-600",
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between w-full px-4 py-3 text-xs font-bold rounded-2xl border-2 focus:outline-none focus:ring-4 transition-all shadow-sm bg-white dark:bg-slate-900/50 cursor-pointer ${colors[colorScheme as keyof typeof colors]}`}
        >
          <span
            className={value ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-500 font-medium"}
          >
            {value
              ? format(new Date(value), "dd MMM yyyy", { locale: id })
              : placeholder}
          </span>
          <Calendar
            size={18}
            className={
              colorScheme === "rose" ? "text-rose-400" : "text-indigo-400"
            }
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] w-72 bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-200"
          align="start"
          sideOffset={5}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                setCurrentMonth(subMonths(currentMonth, 1));
              }}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </h4>
            <button
              onClick={(e) => {
                e.preventDefault();
                setCurrentMonth(addMonths(currentMonth, 1));
              }}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {["S", "S", "R", "K", "J", "S", "M"].map((day, i) => (
              <div
                key={i}
                className="text-center text-[9px] font-black text-slate-300 dark:text-slate-500 uppercase py-1"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = value && isSameDay(day, new Date(value));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(day.toISOString());
                    setOpen(false);
                  }}
                  className={`h-8 w-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${!isCurrentMonth ? "text-slate-200 dark:text-slate-700 pointer-events-none" : isSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
          <Popover.Arrow className="fill-white dark:fill-slate-800" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
