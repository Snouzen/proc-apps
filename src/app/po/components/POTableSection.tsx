import React, { useState } from "react";
import { Pencil, Trash2, Save } from "lucide-react";
import DateInputHybrid from "@/components/DateInputHybrid";

export default function POTableSection({
  poDrafts,
  setPoDrafts,
  me,
  submitting,
  formatNumber,
  formatCurrency,
  parseRupiah,
  numberNoSpinner
}: any) {
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editPickerSelected, setEditPickerSelected] = useState<string>("");
  const [deletePickerOpen, setDeletePickerOpen] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Record<string, boolean>>({});

  const openEditDraft = (d: any) => {
    setEditDraft(JSON.parse(JSON.stringify(d)));
  };
  const closeEditDraft = () => {
    setEditDraft(null);
  };
  const saveEditDraft = () => {
    if (!editDraft) return;
    setPoDrafts((prev: any[]) =>
      prev.map((x) => (x.noPo === editDraft.noPo ? editDraft : x)),
    );
    closeEditDraft();
  };

  if (!poDrafts || poDrafts.length === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 lg:col-span-2">
      <h3 className="font-bold text-slate-800 mb-3">
        Daftar PO untuk Company Ini
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Nomor PO</th>
              <th className="px-4 py-3">Nama Produk</th>
              <th className="px-4 py-3 text-right">PCS PO</th>
              <th className="px-4 py-3 text-right">Harga/PCS</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3 text-right">Jumlah Produk</th>
              <th className="px-4 py-3 text-right">Total Tagihan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {poDrafts.map((d: any) => {
              const totalTagih = d.items.reduce(
                (acc: number, it: any) => acc + (Number(it.rpTagih) || 0),
                0,
              );
              return (
                <React.Fragment key={d.noPo}>
                  {d.items.map((it: any, idx: number) => {
                    const hargaPcs = Number(it.hargaPcs) || 0;
                    const pcs = Number(it.pcs) || 0;
                    const nominal = Number(it.nominal) || hargaPcs * pcs || 0;
                    return (
                      <tr
                        key={`${d.noPo}-${it.id || idx}`}
                        className="group hover:bg-slate-50/50"
                      >
                        {idx === 0 && (
                          <td
                            rowSpan={d.items.length}
                            className="px-4 py-3 font-medium text-slate-700 align-top"
                          >
                            {d.noPo}
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-700">
                          {String(it.namaProduk || "-")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(pcs)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(hargaPcs)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(nominal)}
                        </td>
                        {idx === 0 && (
                          <td
                            rowSpan={d.items.length}
                            className="px-4 py-3 text-right align-top"
                          >
                            {d.items.length}
                          </td>
                        )}
                        {idx === 0 && (
                          <td
                            rowSpan={d.items.length}
                            className="px-4 py-3 text-right font-bold align-top"
                          >
                            {new Intl.NumberFormat("id-ID").format(totalTagih)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            title="Edit draft"
            onClick={() => {
              if (poDrafts.length === 0) return;
              setEditPickerSelected(poDrafts[0].noPo);
              setEditPickerOpen(true);
            }}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <Pencil size={16} />
          </button>
          {me?.role === "pusat" && (
            <button
              type="button"
              title="Hapus draft"
              onClick={() => {
                if (poDrafts.length === 0) return;
                const init: Record<string, boolean> = {};
                for (const d of poDrafts) {
                  const items = Array.isArray(d.items) ? d.items : [];
                  for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const k = `${d.noPo}::${it?.id || i}`;
                    init[k] = false;
                  }
                }
                setDeleteSelection(init);
                setDeletePickerOpen(true);
              }}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="px-14 py-4 bg-emerald-600 text-white rounded-[16px] font-black flex items-center gap-2 shadow-2xl shadow-emerald-900/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {submitting ? "Menyimpan..." : "Simpan Data (Semua PO)"}
          </button>
        </div>
      </div>
      {editPickerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
              Pilih PO untuk di-Edit
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
              {poDrafts.map((d: any) => (
                <label
                  key={d.noPo}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="edit-po"
                    checked={editPickerSelected === d.noPo}
                    onChange={() => setEditPickerSelected(d.noPo)}
                  />
                  <span className="font-mono font-semibold">{d.noPo}</span>
                  <span className="text-slate-500 text-xs">
                    • {d.items.length} produk
                  </span>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = poDrafts.find((x: any) => x.noPo === editPickerSelected);
                  if (d) openEditDraft(d);
                  setEditPickerOpen(false);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
                disabled={!editPickerSelected}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
      {deletePickerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-800">
              Pilih PO yang akan dihapus
            </div>
            <div className="p-4">
              {(() => {
                const total = poDrafts.length;
                const selectedItemCount = Object.values(deleteSelection).filter(Boolean).length;
                const selectedPoCount = (() => {
                  const set = new Set<string>();
                  for (const k of Object.keys(deleteSelection)) {
                    if (!deleteSelection[k]) continue;
                    const noPo = k.split("::")[0] || "";
                    if (noPo) set.add(noPo);
                  }
                  return set.size;
                })();
                const totalItemCount = Object.keys(deleteSelection).length;
                const allChecked = totalItemCount > 0 && selectedItemCount === totalItemCount;
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="text-sm text-slate-600">
                      Terpilih: <span className="font-black text-slate-800">{selectedItemCount}</span> item • <span className="font-black text-slate-800">{selectedPoCount}</span> / {total} PO
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => {
                          setDeleteSelection((prev) => {
                            const next: Record<string, boolean> = {};
                            for (const k of Object.keys(prev)) {
                              next[k] = e.target.checked;
                            }
                            return next;
                          });
                        }}
                      />
                      Select all
                    </label>
                  </div>
                );
              })()}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="max-h-[60vh] overflow-auto">
                  <table className="w-full min-w-[1200px] text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      <tr>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">Delete</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">No PO</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">Tgl PO</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">Expired</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">Tujuan</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50">Produk</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">PCS PO</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">PCS Kirim</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">Harga/PCS</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">Nominal</th>
                        <th className="px-4 py-3 sticky top-0 bg-slate-50 text-right">Rp Tagih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poDrafts.map((d: any) => {
                        const rows = Array.isArray(d.items) ? d.items : [];
                        const span = Math.max(rows.length, 1);
                        const tgl = d.tglPo || "-";
                        const exp = d.expiredTgl || "-";
                        const tuj = d.tujuan || "-";
                        return rows.length > 0 ? (
                          rows.map((it: any, idx: number) => {
                            const itemKey = `${d.noPo}::${it?.id || idx}`;
                            const pcs = Number(it?.pcs) || 0;
                            const pcsKirim = Number(it?.pcsKirim) || 0;
                            const hargaPcs = Number(it?.hargaPcs) || 0;
                            const nominal = Number(it?.nominal) || hargaPcs * pcs || 0;
                            const rpTagih = Number(it?.rpTagih) || hargaPcs * pcsKirim || 0;
                            return (
                              <tr key={`${d.noPo}-${it?.id || idx}`}>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="checkbox"
                                    checked={!!deleteSelection[itemKey]}
                                    onChange={(e) =>
                                      setDeleteSelection((prev) => ({
                                        ...prev,
                                        [itemKey]: e.target.checked,
                                      }))
                                    }
                                  />
                                </td>
                                {idx === 0 && (
                                  <td rowSpan={span} className="px-4 py-3 font-mono font-bold text-slate-800 align-top whitespace-nowrap">
                                    {d.noPo}
                                  </td>
                                )}
                                {idx === 0 && (
                                  <td rowSpan={span} className="px-4 py-3 text-slate-700 align-top whitespace-nowrap">
                                    {tgl}
                                  </td>
                                )}
                                {idx === 0 && (
                                  <td rowSpan={span} className="px-4 py-3 text-slate-700 align-top whitespace-nowrap">
                                    {exp}
                                  </td>
                                )}
                                {idx === 0 && (
                                  <td rowSpan={span} className="px-4 py-3 text-slate-700 align-top max-w-[240px] truncate" title={tuj}>
                                    {tuj}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-slate-700 max-w-[320px] truncate" title={String(it?.namaProduk || "")}>
                                  {String(it?.namaProduk || "-")}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatNumber(pcs)}</td>
                                <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatNumber(pcsKirim)}</td>
                                <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatCurrency(hargaPcs)}</td>
                                <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatCurrency(nominal)}</td>
                                <td className="px-4 py-3 text-right font-black text-slate-800">{formatCurrency(rpTagih)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr key={`${d.noPo}-empty`}>
                            <td className="px-4 py-3"><input type="checkbox" checked={false} readOnly disabled /></td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{d.noPo}</td>
                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{tgl}</td>
                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{exp}</td>
                            <td className="px-4 py-3 text-slate-700">{tuj}</td>
                            <td className="px-4 py-3 text-slate-500" colSpan={6}>Tidak ada item</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletePickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const selectedItemKeys = Object.keys(deleteSelection).filter((k) => deleteSelection[k]);
                  if (selectedItemKeys.length === 0) return;
                  const setByPo = new Map<string, Set<string>>();
                  for (const k of selectedItemKeys) {
                    const [noPo, rawId] = k.split("::");
                    if (!noPo || !rawId) continue;
                    if (!setByPo.has(noPo)) setByPo.set(noPo, new Set());
                    setByPo.get(noPo)?.add(rawId);
                  }
                  setPoDrafts((prev: any[]) =>
                    prev.map((d) => {
                      const toRemove = setByPo.get(d.noPo);
                      if (!toRemove) return d;
                      const items = Array.isArray(d.items) ? d.items : [];
                      const kept = items.filter((it: any, idx: number) => {
                        const id = String(it?.id || idx);
                        return !toRemove.has(id);
                      });
                      return { ...d, items: kept };
                    }).filter((d) => Array.isArray(d.items) && d.items.length > 0)
                  );
                  setDeletePickerOpen(false);
                  setDeleteSelection({});
                }}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50"
                disabled={Object.values(deleteSelection).filter(Boolean).length === 0}
              >
                Hapus Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
      {(() => {
        if (!editDraft) return null;
        const d = editDraft!;
        return (
          <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-slate-800">
                  Edit Draft PO • {d.noPo}
                </div>
                <button
                  type="button"
                  onClick={closeEditDraft}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                  Tutup
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                      Tanggal PO
                    </label>
                    <DateInputHybrid
                      value={d.tglPo}
                      onChange={(v) => {
                        setEditDraft((prev: any) => {
                          if (!prev) return prev;
                          const next = { ...prev, tglPo: v };
                          if (v && next.expiredTgl && next.expiredTgl < v) {
                            next.expiredTgl = v;
                          }
                          return next;
                        });
                      }}
                      className="w-full bg-white rounded-xl"
                      placeholder="YYYY-MM-DD"
                      maxDate={d.expiredTgl}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                      Expired PO
                    </label>
                    <DateInputHybrid
                      value={d.expiredTgl}
                      onChange={(v) =>
                        setEditDraft({
                          ...d,
                          expiredTgl: v,
                        })
                      }
                      className="w-full bg-white rounded-xl"
                      placeholder="YYYY-MM-DD"
                      minDate={d.tglPo}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                      Tujuan
                    </label>
                    <input
                      type="text"
                      value={d.tujuan}
                      onChange={(e) =>
                        setEditDraft({
                          ...d,
                          tujuan: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Produk</th>
                          <th className="px-4 py-3 text-right">PCS PO</th>
                          <th className="px-4 py-3 text-right">PCS Kirim</th>
                          <th className="px-4 py-3 text-right">Harga/PCS</th>
                          <th className="px-4 py-3 text-right">Discount</th>
                          <th className="px-4 py-3 text-right">Nominal</th>
                          <th className="px-4 py-3 text-right">Tagih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {d.items.map((it: any, idx: number) => {
                          const pcs = Number(it.pcs) || 0;
                          const pcsKirim = Number(it.pcsKirim) || 0;
                          const hargaPcs = Number(it.hargaPcs) || 0;
                          const disc = parseRupiah(it?.discount);
                          const nominal = Math.max(0, hargaPcs * pcs - disc);
                          const rpTagih = Math.max(0, hargaPcs * pcsKirim - disc);
                          return (
                            <tr key={it.id || idx}>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={it.namaProduk}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const arr = [...d.items];
                                    arr[idx] = { ...arr[idx], namaProduk: v };
                                    setEditDraft({ ...d, items: arr });
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={pcs}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const arr = [...d.items];
                                    const discNow = parseRupiah(arr[idx]?.discount);
                                    arr[idx] = {
                                      ...arr[idx],
                                      pcs: v,
                                      nominal: Math.max(0, v * (Number(it.hargaPcs) || 0) - discNow),
                                    };
                                    setEditDraft({ ...d, items: arr });
                                  }}
                                  className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={pcsKirim}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const arr = [...d.items];
                                    const discNow = parseRupiah(arr[idx]?.discount);
                                    arr[idx] = {
                                      ...arr[idx],
                                      pcsKirim: v,
                                      rpTagih: Math.max(0, v * (Number(it.hargaPcs) || 0) - discNow),
                                    };
                                    setEditDraft({ ...d, items: arr });
                                  }}
                                  className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  value={hargaPcs}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const arr = [...d.items];
                                    const discNow = parseRupiah(arr[idx]?.discount);
                                    arr[idx] = {
                                      ...arr[idx],
                                      hargaPcs: v,
                                      nominal: Math.max(0, v * (Number(it.pcs) || 0) - discNow),
                                      rpTagih: Math.max(0, v * (Number(it.pcsKirim) || 0) - discNow),
                                    };
                                    setEditDraft({ ...d, items: arr });
                                  }}
                                  className={`w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right ${numberNoSpinner}`}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    it?.discount
                                      ? Number(it?.discount || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const discNow = parseRupiah(v);
                                    const arr = [...d.items];
                                    const hargaNow = Number(arr[idx]?.hargaPcs) || 0;
                                    const pcsNow = Number(arr[idx]?.pcs) || 0;
                                    const pcsKirimNow = Number(arr[idx]?.pcsKirim) || 0;
                                    arr[idx] = {
                                      ...arr[idx],
                                      discount: discNow,
                                      nominal: Math.max(0, hargaNow * pcsNow - discNow),
                                      rpTagih: Math.max(0, hargaNow * pcsKirimNow - discNow),
                                    };
                                    setEditDraft({ ...d, items: arr });
                                  }}
                                  className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-right"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">{formatCurrency(nominal)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(rpTagih)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditDraft}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveEditDraft}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
