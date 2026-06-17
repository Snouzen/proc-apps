"use client";

import {
  Check,
  Eye,
  LinkIcon,
  MapPin,
  Pencil,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Suspense } from "react";
import POSummaryCards from "./components/POSummaryCards";
import POFormSection from "./components/POFormSection";
import POTableSection from "./components/POTableSection";
import { usePOForm } from "./hooks/usePOForm";
import { LoaderThree } from "@/components/ui/loader";

function InputPODetailPageInner() {
  const {
    hasMounted,
    toast,
    submitting,
    poDrafts,
    setPoDrafts,
    formData,
    setFormData,
    me,
    items,
    currentItem,
    setCurrentItem,
    previewItemId,
    setPreviewItemId,
    editingItemId,
    editItem,
    setEditItem,
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
    productOptions,
    invalidProduct,
    numberNoSpinner,
    formatNumber,
    formatCurrency,
    parseRupiah,
    currentHargaKg,
    currentKg,
    currentKgKirim,
    currentNominal,
    currentRpTagih,
    handleAddItem,
    computeDerived,
    handleSaveEditItem,
    handleCancelEditItem,
    handleTogglePreviewItem,
    handleStartEditItem,
    handleDeleteItem,
    totalsAll,
    handleChecklist,
    toggleAllChecklist,
    handleSubmit
  } = usePOForm();

  return (
    <div className="w-full pb-20 animate-in fade-in duration-500" suppressHydrationWarning>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : toast.type === "error"
                ? "bg-rose-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
      <POSummaryCards />
      {!hasMounted ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <LoaderThree label="Initializing form..." />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          suppressHydrationWarning
        >
          <POFormSection
            formData={formData} setFormData={setFormData}
            companyOptions={companyOptions} invalidCompany={invalidCompany} companyLooksLikeInisial={companyLooksLikeInisial}
            inisialOptions={inisialOptions} invalidInisial={invalidInisial} isKnownCompany={isKnownCompany}
            tujuanOptions={tujuanOptions} invalidTujuan={invalidTujuan} isKnownInisial={isKnownInisial}
            regionalOptions={regionalOptions} siteAreaOptions={siteAreaOptions}
            me={me}
            productOptions={productOptions} currentItem={currentItem} setCurrentItem={setCurrentItem} invalidProduct={invalidProduct}
            numberNoSpinner={numberNoSpinner} formatNumber={formatNumber} formatCurrency={formatCurrency} parseRupiah={parseRupiah}
            currentHargaKg={currentHargaKg} currentKg={currentKg} currentKgKirim={currentKgKirim} currentNominal={currentNominal} currentRpTagih={currentRpTagih}
            handleAddItem={handleAddItem}
            items={items} editingItemId={editingItemId} previewItemId={previewItemId} setPreviewItemId={setPreviewItemId} editItem={editItem} setEditItem={setEditItem} computeDerived={computeDerived}
            handleSaveEditItem={handleSaveEditItem} handleCancelEditItem={handleCancelEditItem} handleTogglePreviewItem={handleTogglePreviewItem} handleStartEditItem={handleStartEditItem} handleDeleteItem={handleDeleteItem} totalsAll={totalsAll}
            submitting={submitting}
            handleChecklist={handleChecklist} toggleAllChecklist={toggleAllChecklist}
          />
          {false && poDrafts.length > 0 && (
            <POTableSection
              poDrafts={poDrafts} setPoDrafts={setPoDrafts}
              me={me} submitting={submitting}
              formatNumber={formatNumber} formatCurrency={formatCurrency} parseRupiah={parseRupiah} numberNoSpinner={numberNoSpinner}
            />
          )}
        </form>
      )}
    </div>
  );
}

export default function InputPODetailPage() {
  return (
    <Suspense fallback={<div />}>
      <InputPODetailPageInner />
    </Suspense>
  );
}
