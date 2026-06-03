import React, { Fragment } from "react";
import { Check, Eye, LinkIcon, MapPin, Pencil, Plus, Save, Tag, Trash2, X } from "lucide-react";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import DateInputHybrid from "@/components/DateInputHybrid";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";

export default function POFormSection({
  formData, setFormData,
  companyOptions, invalidCompany, companyLooksLikeInisial,
  inisialOptions, invalidInisial, isKnownCompany,
  tujuanOptions, invalidTujuan, isKnownInisial,
  regionalOptions, siteAreaOptions,
  me,
  productOptions, currentItem, setCurrentItem, invalidProduct,
  numberNoSpinner, formatNumber, formatCurrency, parseRupiah,
  currentHargaKg, currentKg, currentKgKirim, currentNominal, currentRpTagih,
  handleAddItem,
  items, editingItemId, previewItemId, setPreviewItemId, editItem, setEditItem, computeDerived,
  handleSaveEditItem, handleCancelEditItem, handleTogglePreviewItem, handleStartEditItem, handleDeleteItem, totalsAll,
  submitting,
  handleChecklist, toggleAllChecklist
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 space-y-6">
              <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    Data Referensi PO
                  </h2>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.company}
                  </label>
                  <Combobox
                    options={companyOptions}
                    value={formData.company}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        company: v,
                        inisial: "",
                        tujuan: "",
                      })
                    }
                    placeholder="Ketik/cari company..."
                    inputClassName={
                      invalidCompany || companyLooksLikeInisial
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {invalidCompany && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama company tidak ada di daftar
                    </p>
                  )}
                  {companyLooksLikeInisial && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama company tidak valid (terdeteksi nilai inisial)
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.inisial}
                  </label>
                  <Combobox
                    options={inisialOptions}
                    value={formData.inisial}
                    onChange={(v) =>
                      setFormData({ ...formData, inisial: v, tujuan: "" })
                    }
                    placeholder="Ketik/cari inisial..."
                    inputClassName={
                      invalidInisial
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {isKnownCompany && inisialOptions.length === 0 && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Inisial belum tersedia untuk company ini
                    </p>
                  )}
                  {invalidInisial && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Inisial tidak ada di daftar
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.tujuan}
                  </label>
                  <Combobox
                    options={tujuanOptions}
                    value={formData.tujuan}
                    onChange={(v) => setFormData({ ...formData, tujuan: v })}
                    placeholder="Ketik/cari tujuan..."
                    inputClassName={
                      invalidTujuan
                        ? "border border-rose-300 bg-rose-50 focus:ring-rose-200"
                        : undefined
                    }
                  />
                  {isKnownCompany && !isKnownInisial && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Pilih inisial dulu untuk melihat tujuan
                    </p>
                  )}
                  {invalidTujuan && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Tujuan tidak ada di daftar
                    </p>
                  )}
                </div>

                {/* Row 2: Dates */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.tglPo}
                  </label>
                  <DateInputHybrid
                    value={formData.tglPo}
                    onChange={(v) => {
                      setFormData((prev: any) => {
                        const next = { ...prev, tglPo: v };
                        if (v && next.expiredTgl && next.expiredTgl < v) {
                          next.expiredTgl = v;
                        }
                        return next;
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-800 rounded-2xl"
                    placeholder="YYYY-MM-DD"
                    maxDate={formData.expiredTgl}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.expiredTgl}
                  </label>
                  <div className="relative">
                    <DateInputHybrid
                      value={formData.expiredTgl}
                      onChange={(v) =>
                        setFormData({ ...formData, expiredTgl: v })
                      }
                      className="w-full bg-white dark:bg-slate-800 rounded-2xl"
                      placeholder="YYYY-MM-DD"
                      minDate={formData.tglPo}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.tglKirim}
                  </label>
                  <DateInputHybrid
                    value={formData.tglKirim}
                    onChange={(v) => setFormData({ ...formData, tglKirim: v })}
                    className="w-full bg-white dark:bg-slate-800 rounded-2xl"
                    placeholder="YYYY-MM-DD (opsional)"
                  />
                </div>

                {/* Row 3: Regional, Site Area, No Invoice */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.regional}
                  </label>
                  {me?.role === "rm" ? (
                    <div className="relative">
                      <MapPin
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        size={16}
                      />
                      <input
                        type="text"
                        disabled
                        value={formData.regional}
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-semibold cursor-not-allowed text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        placeholder="Loading..."
                      />
                    </div>
                  ) : (
                    <Select
                      options={regionalOptions}
                      value={formData.regional}
                      onChange={(v) =>
                        setFormData({ ...formData, regional: v })
                      }
                      placeholder="Pilih Regional"
                      leftIcon={<MapPin size={16} />}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.siteArea}
                  </label>
                  <Combobox
                    options={siteAreaOptions}
                    value={formData.siteArea}
                    onChange={(v) => setFormData({ ...formData, siteArea: v })}
                    placeholder={
                      !formData.regional
                        ? "Pilih Regional dulu..."
                        : "Ketik/cari site area..."
                    }
                    leftIcon={<MapPin size={16} />}
                    inputClassName="pl-11 pr-4"
                    disabled={!formData.regional}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.noInvoice}
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Invoice..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.noInvoice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev: any) => ({
                        ...prev,
                        noInvoice: v,
                        status: { ...prev.status, inv: !!v.trim() },
                      }));
                    }}
                  />
                </div>

                {/* Row 4: Link PO */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    {PO_FORM_LABELS.linkPo}
                  </label>
                  <div className="relative">
                    <LinkIcon
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      size={16}
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      onChange={(e) =>
                        setFormData({ ...formData, linkPo: e.target.value })
                      }
                      value={formData.linkPo}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">PO Detail</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    Nomor PO
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan Nomor PO..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-semibold dark:text-slate-100"
                    value={formData.noPo}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev: any) => ({
                        ...prev,
                        noPo: v,
                        status: { ...prev.status, po: !!v.trim() },
                      }));
                    }}
                  />
                </div>
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    Nama Produk
                  </label>
                  <Combobox
                    options={productOptions}
                    value={currentItem.namaProduk}
                    onChange={(v) =>
                      setCurrentItem(() => ({
                        namaProduk: v,
                        pcs: "",
                        pcsKirim: "",
                        hargaPcs: "",
                        discount: "",
                      }))
                    }
                    placeholder="Ketik/cari produk..."
                    leftIcon={<Tag size={16} />}
                    inputClassName={`pl-11 pr-4 ${invalidProduct ? "border border-rose-300 bg-rose-50 focus:ring-rose-200" : ""}`}
                  />
                  {invalidProduct && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      Nama produk tidak ada di daftar
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    PCS
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.pcs}
                    placeholder="Input Pcs"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
                    onChange={
                      (e) =>
                        setCurrentItem((prev: any) => ({
                          ...prev,
                          pcs: e.target.value,
                        })) // Harus ke 'pcs'
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    Harga /Pcs
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.hargaPcs}
                    placeholder="Input Harga"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
                    onChange={(e) =>
                      setCurrentItem((prev: any) => ({
                        ...prev,
                        hargaPcs: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    PCS Kirim
                  </label>
                  <input
                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    value={currentItem.pcsKirim}
                    placeholder="Input Pcs Kirim"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100 ${numberNoSpinner}`}
                    onChange={
                      (e) =>
                        setCurrentItem((prev: any) => ({
                          ...prev,
                          pcsKirim: e.target.value,
                        })) // Harus ke 'pcsKirim'
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
                    Discount
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentItem.discount}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold dark:text-slate-100"
                    onChange={(e) =>
                      setCurrentItem((prev: any) => ({
                        ...prev,
                        discount: e.target.value,
                      }))
                    }
                    onBlur={() =>
                      setCurrentItem((prev: any) => {
                        const n = parseRupiah(prev.discount);
                        return {
                          ...prev,
                          discount: n ? n.toLocaleString("id-ID") : "",
                        };
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
                    title="Rumus: Harga/Kg = Harga/Pcs ÷ (kg/pcs produk)"
                  >
                    Harga /Kg
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400"
                    title="Harga/Kg = Harga/Pcs ÷ kg/pcs"
                  >
                    {formatCurrency(currentHargaKg)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
                    title="Rumus: KG = PCS × (kg/pcs produk)"
                  >
                    KG (pcs × satuan)
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400"
                    title="KG = PCS × kg/pcs"
                  >
                    {formatNumber(currentKg)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
                    title="Rumus: KG Kirim = PCS Kirim × (kg/pcs produk)"
                  >
                    KG Kirim (pcs × satuan)
                  </label>
                  <div
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400"
                    title="KG Kirim = PCS Kirim × kg/pcs"
                  >
                    {formatNumber(currentKgKirim)}
                  </div>
                </div>
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1"
                      title="Rumus: Nominal = (Harga/Pcs × PCS) - Discount"
                    >
                      Nominal Original
                    </label>
                    <div
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400"
                      title="Nominal = (Harga/Pcs × PCS) - Discount"
                    >
                      {formatCurrency(currentNominal)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[10px] font-black text-indigo-400 uppercase ml-1"
                      title="Rumus: Rp Tagih = (Harga/Pcs × PCS Kirim) - Discount"
                    >
                      Rp Tagih (Preview)
                    </label>
                    <div
                      className="w-full px-4 py-3 bg-indigo-50/50 rounded-2xl text-sm font-bold text-indigo-600 border border-indigo-100"
                      title="Rp Tagih = (Harga/Pcs × PCS Kirim) - Discount"
                    >
                      {formatCurrency(currentRpTagih)}
                    </div>
                  </div>
                </div>
                <div className="col-span-full pt-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <Plus size={18} />
                    Tambah Produk
                  </button>
                </div>
              </div>
            </section>
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  5
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Preview</h2>
              </div>

              {items.length > 0 ? (
                <div className="border border-slate-100 dark:border-slate-700 rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3 text-right" title="Input PCS">
                          Pcs
                        </th>
                        <th
                          className="px-4 py-3 text-right text-amber-600"
                          title="PCS yang dikirim"
                        >
                          Pcs Kirim
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="PCS × kg/pcs"
                        >
                          Kg
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="Harga Per Pcs"
                        >
                          Harga/Pcs
                        </th>
                        <th
                          className="px-4 py-3 text-right"
                          title="Discount rupiah"
                        >
                          Discount
                        </th>
                        <th className="px-4 py-3 text-right">
                          Nominal Original
                        </th>
                        <th
                          className="px-4 py-3 text-right text-indigo-700"
                          title="Rp Tagih = (PCS Kirim × Harga/Pcs) - Discount"
                        >
                          Rp Tagih
                        </th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {items.map((item: any) => {
                        const isEditing = editingItemId === item.id;
                        const isPreview =
                          previewItemId === item.id || isEditing;
                        const derived = isEditing
                          ? computeDerived(
                              item.namaProduk,
                              editItem.pcs,
                              editItem.pcsKirim,
                              editItem.hargaPcs,
                              editItem.discount,
                            )
                          : computeDerived(
                              item.namaProduk,
                              item.pcs,
                              item.pcsKirim,
                              item.hargaPcs,
                              item.discount,
                            );
                        return (
                          <Fragment key={item.id}>
                            <tr className="group hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                                <div
                                  className="max-w-[250px] overflow-x-auto whitespace-nowrap scrollbar-hide"
                                  title={String(item.namaProduk || "-")}
                                >
                                  {String(item.namaProduk || "-")}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.pcs}
                                    onChange={(e) =>
                                      setEditItem((p: any) => ({
                                        ...p,
                                        pcs: e.target.value,
                                      }))
                                    }
                                    className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.pcs || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-amber-600 font-bold">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.pcsKirim}
                                    onChange={(e) =>
                                      setEditItem((p: any) => ({
                                        ...p,
                                        pcsKirim: e.target.value,
                                      }))
                                    }
                                    className={`w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.pcsKirim || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {formatNumber(Number(derived.kg || 0))}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {isEditing ? (
                                  <input
                                    type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editItem.hargaPcs}
                                    onChange={(e) =>
                                      setEditItem((p: any) => ({
                                        ...p,
                                        hargaPcs: e.target.value,
                                      }))
                                    }
                                    className={`w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                                  />
                                ) : (
                                  formatNumber(Number(item.hargaPcs || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editItem.discount}
                                    onChange={(e) =>
                                      setEditItem((p: any) => ({
                                        ...p,
                                        discount: e.target.value,
                                      }))
                                    }
                                    onBlur={() =>
                                      setEditItem((p: any) => {
                                        const n = parseRupiah(p.discount);
                                        return {
                                          ...p,
                                          discount: n
                                            ? n.toLocaleString("id-ID")
                                            : "",
                                        };
                                      })
                                    }
                                    className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100"
                                  />
                                ) : (
                                  formatCurrency(Number(item.discount || 0))
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                {formatCurrency(Number(derived.nominal || 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-700 tabular-nums">
                                {formatCurrency(Number(derived.rpTagih || 0))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditItem(item)}
                                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Simpan"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditItem}
                                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                                      title="Batal"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleTogglePreviewItem(item.id)
                                      }
                                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                                      title="Preview"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditItem(item)}
                                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    {me?.role === "pusat" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteItem(item.id)
                                        }
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isPreview && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                                    <div>
                                      <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                        PCS Kirim
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="number"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                          value={editItem.pcsKirim}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setEditItem((p: any) => ({
                                              ...p,
                                              pcsKirim: val,
                                            }));
                                          }}
                                          className={`mt-1 w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold dark:text-slate-100 ${numberNoSpinner}`}
                                        />
                                      ) : (
                                        <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                          {formatNumber(
                                            Number(item.pcsKirim || 0),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                        KG Kirim
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                        {formatNumber(
                                          Number(derived.kgKirim || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                        Harga/KG
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                        {formatCurrency(
                                          Number(derived.hargaKg || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px]">
                                        Nominal Original
                                      </div>
                                      <div className="mt-1 font-bold text-slate-700 dark:text-slate-200 text-right">
                                        {formatCurrency(
                                          Number(derived.nominal || 0),
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-indigo-50/30 p-2 rounded-xl border border-indigo-100/50">
                                      <div className="text-indigo-400 font-black uppercase text-[10px]">
                                        Rp Tagih
                                      </div>
                                      <div className="mt-1 font-bold text-indigo-700 text-right">
                                        {formatCurrency(
                                          Number(derived.rpTagih || 0),
                                        )}
                                      </div>
                                    </div>
                                    {!isEditing && (
                                      <div className="flex items-end justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewItemId(null)}
                                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-right font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs"
                        >
                          Total (Original / Tagihan)
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="font-medium text-slate-400 dark:text-slate-500 line-through decoration-slate-300">
                            {formatCurrency(totalsAll.nominal)}
                          </div>
                          <div className="font-black text-indigo-700 text-base">
                            {formatCurrency(totalsAll.tagihan)}
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="flex items-center justify-end p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-10 py-3 bg-[#004a87] text-white rounded-[16px] font-black flex items-center gap-2 shadow-2xl shadow-blue-900/30 hover:bg-[#003d6e] active:scale-95 transition-all"
                    >
                      <Save size={18} />
                      Simpan PO ke Daftar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  Belum ada produk. Tambahkan produk dari Section 2.
                </div>
              )}
            </section>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                  Checklist Dokumen
                </h2>
                <button
                  type="button"
                  onClick={toggleAllChecklist}
                  className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  {Object.values(formData.status).every(Boolean)
                    ? "Uncheck All"
                    : "Check All"}
                </button>
              </div>

              <div className="space-y-3">
                {Object.keys(formData.status).map((key) => {
                  const checked =
                    formData.status[key as keyof typeof formData.status];
                  const label = key === "sdif" ? "SDI/F" : key.toUpperCase();

                  // Khusus untuk KIRIM, FP, TAGIH dan BAYAR, render secara inline dengan input teks
                  if (key === "kirim") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Kirim (opsional)..."
                            value={formData.buktiKirim}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                buktiKirim: v,
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "fp") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref FP..."
                            value={formData.buktiFp}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                buktiFp: v,
                                status: { ...prev.status, fp: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "tagih") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Tagihan..."
                            value={formData.buktiTagih}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                buktiTagih: v,
                                status: { ...prev.status, tagih: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (key === "bayar") {
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg gap-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleChecklist(key)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </span>
                        </label>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Masukkan Ref Bayar..."
                            value={formData.buktiBayar}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((prev: any) => ({
                                ...prev,
                                buktiBayar: v,
                                status: { ...prev.status, bayar: !!v.trim() },
                              }));
                            }}
                            className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:text-slate-500 font-semibold transition-all"
                          />
                        </div>
                      </div>
                    );
                  }

                  // Default render untuk checkbox lainnya
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleChecklist(key)}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                  4
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Remarks</h2>
              </div>
              <textarea
                rows={4}
                placeholder="Tambahkan Jika Ada Keterangan..."
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] focus:ring-2 focus:ring-slate-200 outline-none text-sm font-medium transition-all"
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
              ></textarea>
            </section>
          </div>
        </div>
  );
}

