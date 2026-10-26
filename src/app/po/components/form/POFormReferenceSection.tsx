import React from "react";
import { LinkIcon, MapPin } from "lucide-react";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import DateInputHybrid from "@/components/DateInputHybrid";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";

interface POFormReferenceSectionProps {
  formData: any;
  setFormData: any;
  companyOptions: any[];
  invalidCompany?: boolean;
  companyLooksLikeInisial?: boolean;
  inisialOptions: any[];
  invalidInisial?: boolean;
  isKnownCompany?: boolean;
  tujuanOptions: any[];
  invalidTujuan?: boolean;
  isKnownInisial?: boolean;
  regionalOptions: any[];
  siteAreaOptions: any[];
  me: any;
}

export default function POFormReferenceSection({
  formData,
  setFormData,
  companyOptions,
  invalidCompany,
  companyLooksLikeInisial,
  inisialOptions,
  invalidInisial,
  isKnownCompany,
  tujuanOptions,
  invalidTujuan,
  isKnownInisial,
  regionalOptions,
  siteAreaOptions,
  me,
}: POFormReferenceSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 sm:space-y-5">
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
          <Select
            options={regionalOptions}
            value={formData.regional}
            onChange={(v) =>
              setFormData({ ...formData, regional: v, siteArea: "" })
            }
            placeholder="Pilih Regional"
            leftIcon={<MapPin size={16} />}
          />
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
  );
}
