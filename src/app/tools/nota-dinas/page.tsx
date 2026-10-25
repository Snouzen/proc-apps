"use client";

import React from "react";
import { useNotaDinasForm } from "./hooks/useNotaDinasForm";
import NdHeaderToolbar from "./components/NdHeaderToolbar";
import NdPreview from "./components/NdPreview";
import NdFormAccordion from "./components/NdFormAccordion";

export default function NotaDinasPage() {
  const {
    formData,
    isGenerating,
    isGeneratingPdf,
    openGroups,
    toggleGroup,
    previewMode,
    setPreviewMode,
    handleChange,
    handleReset,
    handleAddPiutangRow,
    handleRemovePiutangRow,
    handlePiutangChange,
    handleGenerate,
    handleGeneratePdf,
  } = useNotaDinasForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header Toolbar */}
      <NdHeaderToolbar
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        handleReset={handleReset}
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
        handleGeneratePdf={handleGeneratePdf}
        isGeneratingPdf={isGeneratingPdf}
      />

      {/* Split Screen Content */}
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)]">
          {/* Left: Preview */}
          <div
            className={`lg:flex-1 lg:block ${previewMode ? "block" : "hidden"} overflow-auto`}
          >
            <div className="sticky top-0">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 sm:p-6 md:p-8 flex items-start justify-center min-h-[400px] sm:min-h-[600px] overflow-auto">
                <NdPreview formData={formData} />
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div
            className={`lg:w-[420px] xl:w-[460px] lg:block ${!previewMode ? "block" : "hidden"} overflow-auto`}
          >
            <NdFormAccordion
              formData={formData}
              handleChange={handleChange}
              openGroups={openGroups}
              toggleGroup={toggleGroup}
              handleAddPiutangRow={handleAddPiutangRow}
              handleRemovePiutangRow={handleRemovePiutangRow}
              handlePiutangChange={handlePiutangChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
