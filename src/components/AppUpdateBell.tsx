"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Bell, CheckCheck, ImageIcon, Smartphone, ShieldCheck, Wrench, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Change the release ID when publishing a new announcement to show the unread indicator again.
const RELEASE_ID = "2026-10-30-01";
const READ_EVENT = "proc-apps:updates-read";
const updateStyles = [
  { icon: ImageIcon, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  { icon: Smartphone, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  { icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
  { icon: Wrench, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
];
const updates = [
  { title: "Optimalisasi Logo Ritel Modern", description: "Penyesuaian ukuran logo agar tampil lebih seragam." },
  { title: "Penyempurnaan Tampilan Mobile", description: "Peningkatan tata letak dan responsivitas pada perangkat mobile." },
  { title: "Pengaturan Hak Akses", description: "Penambahan akses pengelolaan hak pengguna untuk role Pusat." },
  { title: "Perbaikan Bug", description: "Perbaikan sejumlah kendala untuk meningkatkan stabilitas aplikasi." },
];

export default function AppUpdateBell({ userEmail }: { userEmail: string | null }) {
  // Measure the first three entries so wrapping text remains fully readable at every width.
  const listRef = useCallback((node: HTMLUListElement | null) => {
    if (!node) return;
    const visible = Array.from(node.children).slice(0, 3);
    const measure = () => {
      const last = visible[visible.length - 1];
      if (last) node.style.setProperty("--updates-visible-height", Math.ceil(last.getBoundingClientRect().bottom - node.getBoundingClientRect().top + node.scrollTop) + "px");
    };
    measure();
    const observer = new ResizeObserver(measure);
    visible.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  const [open, setOpen] = useState(false);
  const [readInMemory, setReadInMemory] = useState(false);
  const storageKey = userEmail?.trim()
    ? "proc_app_updates_read_" + encodeURIComponent(userEmail.trim().toLowerCase()) : null;
  const storedRead = useSyncExternalStore(
    listener => {
      const onStorage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) listener(); };
      window.addEventListener("storage", onStorage);
      window.addEventListener(READ_EVENT, listener);
      return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(READ_EVENT, listener); };
    },
    () => { try { return !!storageKey && localStorage.getItem(storageKey) === RELEASE_ID; } catch { return false; } },
    () => false,
  );
  const unread = !!storageKey && !storedRead && !readInMemory;
  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (!next || !storageKey) return;
    setReadInMemory(true);
    try { localStorage.setItem(storageKey, RELEASE_ID); window.dispatchEvent(new Event(READ_EVENT)); } catch { /* Still usable when browser storage is unavailable. */ }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={!storageKey}
          aria-label={unread ? "Pembaruan aplikasi, belum dibaca" : "Pembaruan aplikasi"}
          title="Pembaruan Aplikasi"
          className="relative shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400">
          <Bell size={20} aria-hidden="true" />
          {unread && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} collisionPadding={12} aria-label="Pembaruan Aplikasi"
        className="z-[180] w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border-slate-200/80 bg-white p-0 text-slate-800 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-start gap-3 bg-gradient-to-br from-blue-50 via-slate-50 to-white px-5 py-5 dark:from-blue-950/60 dark:via-slate-900 dark:to-slate-900">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/20">
            <Bell size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold tracking-tight">Pembaruan Aplikasi</h2>
            <time dateTime="2026-10-30" className="mt-1 block text-xs text-slate-500 dark:text-slate-400">30 Oktober 2026</time>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">{updates.length} info</span>
        </div>
        <ul ref={listRef} tabIndex={0} aria-label="Daftar pembaruan, gulir untuk melihat lainnya" style={{ maxHeight: "min(var(--updates-visible-height, 336px), max(80px, calc(100dvh - 240px)))" }} className="overflow-y-auto overscroll-contain px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
          {updates.map((update, index) => {
            const { icon: Icon, color } = updateStyles[index] || updateStyles[3];
            return <li key={update.title} className="py-1 first:pt-2">
              <div className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span className={"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + color}><Icon size={17} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1 break-words">
                  <h3 className="text-[13px] font-semibold leading-5">{update.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{update.description}</p>
                </div>
              </div>
            </li>;
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 px-5 py-3 text-[11px] text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCheck size={14} className="text-emerald-500" aria-hidden="true" /> Semua telah dibaca</span>
          {updates.length > 3 && <span className="flex items-center gap-1">Gulir untuk lainnya <ChevronDown size={13} aria-hidden="true" /></span>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
