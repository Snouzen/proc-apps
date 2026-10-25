"use client";

import React from "react";
import Modal from "@/components/modal";
import { POEditModalProps } from "./po-edit/types";
import { usePOEditData } from "./po-edit/hooks/usePOEditData";
import POEditHeaderForm from "./po-edit/components/POEditHeaderForm";
import POEditItemSection from "./po-edit/components/POEditItemSection";
import POEditChecklistAndRemarks from "./po-edit/components/POEditChecklistAndRemarks";

export default function POEditModal({
  open,
  onClose,
  noPo,
  returnMode = "full",
  onSaved,
}: POEditModalProps) {
  const {
    isSiteArea,
    loading,
    saving,
    toast,
    po,
    inisial,
    setInisial,
    company,
    setCompany,
    regional,
    setRegional,
    siteArea,
    setSiteArea,
    noPoValue,
    setNoPoValue,
    tglPo,
    setTglPo,
    expiredTgl,
    setExpiredTgl,
    tujuan,
    setTujuan,
    noInvoice,
    setNoInvoice,
    linkPo,
    setLinkPo,
    tglKirim,
    setTglKirim,
    remarks,
    setRemarks,
    buktiTagih,
    setBuktiTagih,
    buktiBayar,
    setBuktiBayar,
    namaSupir,
    setNamaSupir,
    platNomor,
    setPlatNomor,
    buktiKirim,
    setBuktiKirim,
    buktiFp,
    setBuktiFp,
    status,
    setStatus,
    items,
    setItems,
    currentItem,
    setCurrentItem,
    computeDerived,
    productOptions,
    companyOptions,
    inisialOptions,
    tujuanOptions,
    siteAreaOptions,
    regionalOptions,
    handleChecklist,
    allChecklistChecked,
    toggleAllChecklist,
    invalidCurrentProduct,
    handleAddItem,
    canSubmit,
    handleSave,
    totals,
  } = usePOEditData(open, noPo, returnMode, onSaved, onClose);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={noPo ? `Edit PO - ${noPo}` : "Edit PO"}
      className="max-w-6xl"
    >
      {toast && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : toast.type === "error"
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : "bg-blue-50 text-blue-700 border border-blue-100"
          }`}
        >
          {toast.message}
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-slate-500">
          Loading...
        </div>
      ) : !po ? (
        <div className="py-10 text-sm text-slate-600 dark:text-slate-300">
          Data PO tidak ditemukan.
        </div>
      ) : (
        <div className="space-y-6">
          <POEditHeaderForm
            company={company}
            setCompany={setCompany}
            companyOptions={companyOptions}
            inisial={inisial}
            setInisial={setInisial}
            inisialOptions={inisialOptions}
            tujuan={tujuan}
            setTujuan={setTujuan}
            tujuanOptions={tujuanOptions}
            tglPo={tglPo}
            setTglPo={setTglPo}
            expiredTgl={expiredTgl}
            setExpiredTgl={setExpiredTgl}
            tglKirim={tglKirim}
            setTglKirim={setTglKirim}
            regional={regional}
            setRegional={setRegional}
            regionalOptions={regionalOptions}
            siteArea={siteArea}
            setSiteArea={setSiteArea}
            siteAreaOptions={siteAreaOptions}
            linkPo={linkPo}
            setLinkPo={setLinkPo}
            noPoValue={noPoValue}
            setNoPoValue={setNoPoValue}
            noInvoice={noInvoice}
            setNoInvoice={setNoInvoice}
            setStatus={setStatus}
            isSiteArea={isSiteArea}
          />

          <POEditItemSection
            items={items}
            setItems={setItems}
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            productOptions={productOptions}
            invalidCurrentProduct={invalidCurrentProduct}
            handleAddItem={handleAddItem}
            computeDerived={computeDerived}
            totals={totals}
            isSiteArea={isSiteArea}
          />

          <POEditChecklistAndRemarks
            status={status}
            setStatus={setStatus}
            handleChecklist={handleChecklist}
            allChecklistChecked={allChecklistChecked}
            toggleAllChecklist={toggleAllChecklist}
            buktiKirim={buktiKirim}
            setBuktiKirim={setBuktiKirim}
            buktiFp={buktiFp}
            setBuktiFp={setBuktiFp}
            buktiTagih={buktiTagih}
            setBuktiTagih={setBuktiTagih}
            buktiBayar={buktiBayar}
            setBuktiBayar={setBuktiBayar}
            remarks={remarks}
            setRemarks={setRemarks}
            namaSupir={namaSupir}
            setNamaSupir={setNamaSupir}
            platNomor={platNomor}
            setPlatNomor={setPlatNomor}
            isSiteArea={isSiteArea}
          />

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-sm font-bold"
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className={`px-6 py-3 rounded-xl text-sm font-bold text-white ${
                !canSubmit || saving
                  ? "bg-slate-300"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
