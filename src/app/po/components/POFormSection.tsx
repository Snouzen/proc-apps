import React from "react";
import POFormReferenceSection from "./form/POFormReferenceSection";
import POFormDetailSection from "./form/POFormDetailSection";
import POFormPreviewSection from "./form/POFormPreviewSection";
import POFormChecklistSection from "./form/POFormChecklistSection";

export default function POFormSection({
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
  productOptions,
  currentItem,
  setCurrentItem,
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
  items,
  editingItemId,
  previewItemId,
  setPreviewItemId,
  editItem,
  setEditItem,
  computeDerived,
  handleSaveEditItem,
  handleCancelEditItem,
  handleTogglePreviewItem,
  handleStartEditItem,
  handleDeleteItem,
  totalsAll,
  submitting,
  handleChecklist,
  toggleAllChecklist,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-6">
        <POFormReferenceSection
          formData={formData}
          setFormData={setFormData}
          companyOptions={companyOptions}
          invalidCompany={invalidCompany}
          companyLooksLikeInisial={companyLooksLikeInisial}
          inisialOptions={inisialOptions}
          invalidInisial={invalidInisial}
          isKnownCompany={isKnownCompany}
          tujuanOptions={tujuanOptions}
          invalidTujuan={invalidTujuan}
          isKnownInisial={isKnownInisial}
          regionalOptions={regionalOptions}
          siteAreaOptions={siteAreaOptions}
          me={me}
        />

        <POFormDetailSection
          formData={formData}
          setFormData={setFormData}
          productOptions={productOptions}
          invalidProduct={invalidProduct}
          currentItem={currentItem}
          setCurrentItem={setCurrentItem}
          numberNoSpinner={numberNoSpinner}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          parseRupiah={parseRupiah}
          currentHargaKg={currentHargaKg}
          currentKg={currentKg}
          currentKgKirim={currentKgKirim}
          currentNominal={currentNominal}
          currentRpTagih={currentRpTagih}
          handleAddItem={handleAddItem}
        />

        <POFormPreviewSection
          items={items}
          editingItemId={editingItemId}
          previewItemId={previewItemId}
          setPreviewItemId={setPreviewItemId}
          editItem={editItem}
          setEditItem={setEditItem}
          computeDerived={computeDerived}
          handleSaveEditItem={handleSaveEditItem}
          handleCancelEditItem={handleCancelEditItem}
          handleTogglePreviewItem={handleTogglePreviewItem}
          handleStartEditItem={handleStartEditItem}
          handleDeleteItem={handleDeleteItem}
          totalsAll={totalsAll}
          submitting={submitting}
          me={me}
          numberNoSpinner={numberNoSpinner}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          parseRupiah={parseRupiah}
        />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <POFormChecklistSection
          formData={formData}
          setFormData={setFormData}
          handleChecklist={handleChecklist}
          toggleAllChecklist={toggleAllChecklist}
        />
      </div>
    </div>
  );
}
