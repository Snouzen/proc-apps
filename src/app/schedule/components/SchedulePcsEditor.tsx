"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";

export function SchedulePcsEditor({ value, max, saving, onSave }: {
  value: number; max: number; saving: boolean;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  if (!editing) return <div className="flex items-center gap-2">
    <span className="text-xs font-bold tabular-nums">{value.toLocaleString("id-ID")}</span>
    {value !== max && <button type="button" aria-label="Edit PCS Kirim" className="p-2 rounded-lg text-indigo-600 border" onClick={() => { setDraft(String(value)); setError(""); setEditing(true); }}><PencilLine size={14} /></button>}
  </div>;
  return <form className="flex flex-col gap-1 w-36" onSubmit={async e => {
    e.preventDefault();
    if (saving) return;
    const amount = Number(draft);
    if (!draft.trim() || !Number.isInteger(amount) || amount < 0 || amount > max) {
      setError(`Isi bilangan bulat 0–${max}.`); return;
    }
    if (await onSave(draft)) setEditing(false);
    else setError("Belum tersimpan. Coba lagi.");
  }}>
    <input aria-label="PCS Kirim" type="number" min={0} max={max} step={1} value={draft} disabled={saving} onChange={e => { setDraft(e.target.value); setError(""); }} className="w-full border rounded-lg p-2 text-xs bg-transparent" />
    {error && <span role="alert" className="text-xs text-rose-600">{error}</span>}
    <div className="flex gap-2 text-xs"><button type="submit" disabled={saving} className="text-indigo-600 p-1">{saving ? "Menyimpan…" : "Simpan"}</button><button type="button" disabled={saving} onClick={() => setEditing(false)} className="p-1">Batal</button></div>
  </form>;
}
