"use client";

import React from "react";
import Combobox from "@/components/combobox";
import Select from "@/components/select";
import DateInputHybrid from "@/components/DateInputHybrid";
import { LinkIcon, MapPin } from "lucide-react";
import { PO_FORM_LABELS } from "@/lib/po-form-labels";
import { getMeSync } from "@/lib/me";

interface POEditHeaderFormProps {
  company: string;
  setCompany: (v: string) => void;
  companyOptions: string[];
  inisial: string;
  setInisial: (v: string) => void;
  inisialOptions: string[];
  tujuan: string;
  setTujuan: (v: string) => void;
  tujuanOptions: string[];
  tglPo: string;
  setTglPo: (v: string) => void;
  expiredTgl: string;
  setExpiredTgl: (v: string) => void;
  tglKirim: string;
  setTglKirim: (v: string) => void;
  regional: string;
  setRegional: (v: string) => void;
  regionalOptions: { label: string; value: string }[];
  siteArea: string;
  setSiteArea: (v: string) => void;
  siteAreaOptions: string[];
  linkPo: string;
  setLinkPo: (v: string) => void;
  noPoValue: string;
  setNoPoValue: (v: string) => void;
  noInvoice: string;
  setNoInvoice: (v: string) => void;
  setStatus: React.Dispatch<React.SetStateAction<any>>;
  isSiteArea: boolean;
}

export default function POEditHeaderForm({
  company,
  setCompany,
  companyOptions,
  inisial,
  setInisial,
  inisialOptions,
  tujuan,
  setTujuan,
  tujuanOptions,
  tglPo,
  setTglPo,
  expiredTgl,
  setExpiredTgl,
  tglKirim,
  setTglKirim,
  regional,
  setRegional,
  regionalOptions,
  siteArea,
  setSiteArea,
  siteAreaOptions,
  linkPo,
  setLinkPo,
  noPoValue,
  setNoPoValue,
  noInvoice,
  setNoInvoice,
  setStatus,
  isSiteArea,
}: POEditHeaderFormProps) {
  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.company}
          </label>
          <Combobox
            options={companyOptions}
            value={company}
            onChange={(v) => {
              setCompany(v);
              setInisial("");
              setTujuan("");
            }}
            placeholder="Pilih/Ketik Perusahaan..."
            disabled={isSiteArea}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.inisial}
          </label>
          <Combobox
            options={inisialOptions}
            value={inisial}
            onChange={(v) => { setInisial(v); setTujuan(""); }}
            placeholder="Ketik/cari inisial..."
            disabled={isSiteArea}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.tujuan}
          </label>
          <Combobox
            options={tujuanOptions}
            value={tujuan}
            onChange={(v) => setTujuan(v)}
            placeholder="Ketik/cari tujuan..."
            disabled={isSiteArea}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.tglPo}
          </label>
          <DateInputHybrid
            value={tglPo}
            onChange={(v) => {
              setTglPo(v);
              if (expiredTgl && v && expiredTgl < v) setExpiredTgl(v);
            }}
            className={`w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl ${
              isSiteArea ? "opacity-60 pointer-events-none" : ""
            }`}
            placeholder="YYYY-MM-DD"
            maxDate={expiredTgl}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.expiredTgl}
          </label>
          <DateInputHybrid
            value={expiredTgl}
            onChange={setExpiredTgl}
            className={`w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl ${
              isSiteArea ? "opacity-60 pointer-events-none" : ""
            }`}
            placeholder="YYYY-MM-DD"
            minDate={tglPo}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.tglKirim}
          </label>
          <DateInputHybrid
            value={tglKirim}
            onChange={setTglKirim}
            className={`w-full bg-blue-50/30 rounded-2xl border border-blue-100 ${
              isSiteArea ? "opacity-60 pointer-events-none" : ""
            }`}
            placeholder="YYYY-MM-DD (opsional)"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.regional}
          </label>
          {getMeSync()?.role === "rm" ? (
            <div className="relative">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                size={16}
              />
              <input
                type="text"
                disabled
                value={regional}
                className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm font-semibold cursor-not-allowed text-slate-500 border border-slate-200 dark:border-slate-700"
                placeholder="Loading..."
              />
            </div>
          ) : (
            <div className={isSiteArea ? "opacity-60 pointer-events-none" : ""}>
              <Select
                options={regionalOptions}
                value={regional}
                onChange={(v) => {
                  setRegional(v);
                  setSiteArea("");
                }}
                placeholder="Pilih Regional"
                leftIcon={<MapPin size={16} />}
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.siteArea}
          </label>
          <Combobox
            options={siteAreaOptions}
            value={siteArea}
            onChange={(v) => setSiteArea(v)}
            placeholder="Ketik/cari site area..."
            leftIcon={<MapPin size={16} />}
            inputClassName="pl-11 pr-4"
            disabled={isSiteArea}
          />
        </div>

        <div className="space-y-1">
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
              value={linkPo}
              disabled={isSiteArea}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:bg-slate-50"
              onChange={(e) => setLinkPo(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.noPo}
          </label>
          <input
            value={noPoValue}
            onChange={(e) => setNoPoValue(e.target.value)}
            placeholder="Masukkan Nomor PO..."
            disabled={isSiteArea}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-60 disabled:bg-slate-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">
            {PO_FORM_LABELS.noInvoice}
          </label>
          <input
            type="text"
            placeholder="Nomor Invoice..."
            value={noInvoice}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => {
              const v = e.target.value;
              setNoInvoice(v);
              if (v.trim()) setStatus((p: any) => ({ ...p, inv: true }));
            }}
          />
        </div>
      </div>
    </section>
  );
}
