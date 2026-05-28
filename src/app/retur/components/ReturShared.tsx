"use client";

import { useState, useMemo, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { format, subMonths, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Search, Package, ChevronDown, X } from "lucide-react";

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
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-500/10 hover:border-indigo-300",
    rose: "text-rose-600 bg-rose-50 border-rose-100 ring-rose-500/10 hover:border-rose-300",
    slate: "text-slate-600 bg-slate-50 border-slate-100 ring-slate-500/10 hover:border-slate-300"
  };

  const activeColor = colors[colorScheme as keyof typeof colors] || colors.indigo;
  const iconColor = colorScheme === 'rose' ? 'text-rose-400' : 'text-indigo-400';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={`flex items-center justify-between w-full min-w-[150px] px-3 py-2.5 text-xs font-bold rounded-xl border-2 focus:outline-none focus:ring-4 transition-all shadow-sm bg-white ${activeColor}`}>
          <span className={value ? "text-slate-700" : "text-slate-300 font-medium"}>
            {value ? format(new Date(value), "dd MMM yyyy", { locale: id }) : placeholder}
          </span>
          <Calendar size={14} className={iconColor} />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-[150] w-72 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 duration-200"
          align="start"
          sideOffset={5}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
              {format(currentMonth, "MMMM yyyy", { locale: id })}
            </h4>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, i) => (
              <div key={i} className="text-center text-[9px] font-black text-slate-300 uppercase py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = value && isSameDay(day, new Date(value));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => {
                    onChange(day.toISOString());
                    setOpen(false);
                  }}
                  className={`
                    h-8 w-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all
                    ${!isCurrentMonth ? 'text-slate-200 pointer-events-none' : 'text-slate-600 hover:bg-slate-50'}
                    ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : ''}
                    ${isTodayDate && !isSelected ? 'text-indigo-600 border border-indigo-100 bg-indigo-50/30' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TableSearchableInput({
  value,
  onCommit,
  items,
  placeholder,
  icon: Icon = Search,
}: {
  value: string;
  onCommit: (val: string) => void;
  items: string[];
  placeholder?: string;
  icon?: any;
}) {
  const [internalVal, setInternalVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setInternalVal(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else if (items.length > 0) {
      setActiveIndex(0); // Auto-highlight first result
    }
  }, [open, items.length]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div className="relative w-full min-w-[200px]">
          <input
            type="text"
            value={internalVal}
            onChange={(e) => {
              setInternalVal(e.target.value);
              onCommit(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (!open) {
                if (e.key === "ArrowDown") setOpen(true);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((p) => (p > 0 ? p - 1 : p));
              } else if (e.key === "Enter") {
                if (activeIndex >= 0 && items[activeIndex]) {
                  e.preventDefault();
                  onCommit(items[activeIndex]);
                  setInternalVal(items[activeIndex]);
                  setOpen(false);
                }
              }
            }}
            className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            <Icon size={14} />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-48 overflow-y-auto w-64 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">
              Tidak ada hasil
            </div>
          ) : (
            items.map((t, idx) => (
              <button
                key={t + idx}
                onClick={() => {
                  onCommit(t);
                  setInternalVal(t);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-tight rounded-xl transition-colors ${activeIndex === idx ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-indigo-50"}`}
              >
                {t}
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function TableProductInput({
  value,
  onCommit,
  items,
  placeholder,
}: {
  value: string;
  onCommit: (val: string) => void;
  items: any[];
  placeholder?: string;
}) {
  const [internalVal, setInternalVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setInternalVal(value);
  }, [value]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else if (items.length > 0) {
      setActiveIndex(0);
    }
  }, [open, items.length]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div className="relative w-full min-w-[200px]">
          <input
            type="text"
            value={internalVal}
            onChange={(e) => {
              setInternalVal(e.target.value);
              onCommit(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (!open) {
                if (e.key === "ArrowDown") setOpen(true);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((p) => (p < items.length - 1 ? p + 1 : p));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((p) => (p > 0 ? p - 1 : p));
              } else if (e.key === "Enter") {
                if (activeIndex >= 0 && items[activeIndex]) {
                  e.preventDefault();
                  onCommit(items[activeIndex].name);
                  setInternalVal(items[activeIndex].name);
                  setOpen(false);
                }
              }
            }}
            className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            <Package size={14} />
          </div>
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-48 overflow-y-auto w-72 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {items.length === 0 ? (
            <div className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">
              Tidak ada produk
            </div>
          ) : (
            items.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  onCommit(p.name);
                  setInternalVal(p.name);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase tracking-tight rounded-xl transition-colors flex items-center justify-between group ${activeIndex === idx ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-emerald-50"}`}
              >
                <span>{p.name}</span>
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function SmoothStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = ["BELUM DIAMBIL", "SUDAH DIAMBIL", "DIMUSNAHKAN"];

  const getColor = (v: string) => {
    if (v === "SUDAH DIAMBIL")
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (v === "DIMUSNAHKAN") return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-rose-50 text-rose-600 border-rose-100";
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`flex items-center justify-between w-full min-w-[150px] px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all shadow-sm ${getColor(value.toUpperCase())} border-transparent hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10`}
        >
          <span>{value || "BELUM DIAMBIL"}</span>
          <ChevronDown
            size={14}
            className={`opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl w-48 p-1 animate-in fade-in zoom-in-95 duration-200"
          sideOffset={5}
          align="start"
        >
          {options.map((opt) => {
              const hoverColor = opt === "SUDAH DIAMBIL" ? "hover:bg-emerald-50 hover:text-emerald-600"
                : opt === "DIMUSNAHKAN" ? "hover:bg-amber-50 hover:text-amber-600"
                : "hover:bg-rose-50 hover:text-rose-600";
              return (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors ${value.toUpperCase() === opt ? "bg-indigo-600 text-white" : `text-slate-600 ${hoverColor}`}`}
              >
                {opt}
              </button>
              );
            })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function SmoothRowSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [10, 25, 50, 100];

  return (
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white/50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
      <span>Tampilkan</span>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
            <span className="tabular-nums font-black text-slate-800">{value}</span>
            <ChevronDown size={12} className={`text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[160] w-24 bg-white rounded-xl shadow-2xl border border-slate-50 p-1 animate-in fade-in zoom-in-95 duration-200" sideOffset={5} align="center">
            {options.map((opt) => (
              <button 
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[10px] font-black rounded-lg transition-all ${value === opt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {opt}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span>data</span>
    </div>
  );
}

export function FilterSelect({
  label,
  placeholder,
  value,
  onCommit,
  items,
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onCommit: (val: string) => void;
  items: string[];
  icon: any;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => (i || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 min-w-[200px]">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 hover:border-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm">
            <div className="flex items-center gap-2.5 truncate">
              <div className={`p-1.5 rounded-lg ${value ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                <Icon size={14} />
              </div>
              <span className={value ? "text-slate-800" : "text-slate-400 font-medium"}>
                {value || placeholder}
              </span>
            </div>
            <ChevronDown size={14} className={`text-slate-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="z-[160] w-[260px] bg-white rounded-3xl shadow-2xl border border-slate-50 p-3 animate-in fade-in zoom-in-95 duration-200" sideOffset={10} align="start">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] focus:ring-0 placeholder:text-slate-300 font-bold"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto scrollbar-hide space-y-1 px-0.5">
              <button 
                onClick={() => { onCommit(""); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-between group"
              >
                Clear Filter
                <X size={14} className="group-hover:rotate-90 transition-transform" />
              </button>
              <div className="h-px bg-slate-50 my-1 mx-2" />
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Results</div>
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => { onCommit(item); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl transition-all ${value === item ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
