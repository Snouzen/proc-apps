"use client";

import React from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import { LoaderThree } from "@/components/ui/loader";
import Modal from "./modal";
import { useBulkUploadExcel } from "./bulk-upload/hooks/useBulkUploadExcel";
import BulkUploadResultModal from "./bulk-upload/components/BulkUploadResultModal";
import BulkUploadProgressModal from "./bulk-upload/components/BulkUploadProgressModal";
import BulkUploadConfirmModal from "./bulk-upload/components/BulkUploadConfirmModal";
import BulkUploadPreviewTable from "./bulk-upload/components/BulkUploadPreviewTable";
import BulkUploadMetaPanels from "./bulk-upload/components/BulkUploadMetaPanels";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BulkUploadModal({ open, onClose, onSuccess }: Props) {
  const {
    file,
    previewData,
    loading,
    uploading,
    uploadProgress,
    poPlannedTotal,
    poDone,
    error,
    successCount,
    errorList,
    failedRows,
    showFailedRows,
    setShowFailedRows,
    showDuplicateRows,
    setShowDuplicateRows,
    missingCounts,
    duplicateNos,
    duplicateRowMap,
    replaceDupes,
    setReplaceDupes,
    setReplaceTouched,
    readMeta,
    showReadMeta,
    setShowReadMeta,
    resultOpen,
    setResultOpen,
    resultSummary,
    fileInputRef,
    showConfirm,
    setShowConfirm,
    progressOpen,
    progressMeta,
    headerKeys,
    uniquePoNos,
    plannedPoCountPreview,
    handleFileChange,
    handleUpload,
    startUpload,
    cancelUpload,
    reset,
    getCell,
  } = useBulkUploadExcel(onSuccess);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Bulk Upload PO"
        className="max-w-xl"
      >
        <div className="space-y-4">
          {/* Upload Area */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="p-3 bg-slate-50 rounded-full mb-3 group-hover:bg-white transition-colors">
                <Upload
                  size={24}
                  className="text-slate-400 group-hover:text-blue-500"
                />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">
                Click to upload or drag and drop
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Excel files only (.xlsx, .xls)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>
          )}

          <BulkUploadMetaPanels
            loading={loading}
            error={error}
            readMeta={readMeta}
            showReadMeta={showReadMeta}
            setShowReadMeta={setShowReadMeta}
            previewDataLength={previewData.length}
            uniquePoNosLength={uniquePoNos.length}
            plannedPoCountPreview={plannedPoCountPreview}
            replaceDupes={replaceDupes}
            setReplaceDupes={setReplaceDupes}
            setReplaceTouched={setReplaceTouched}
            duplicateNos={duplicateNos}
            duplicateRowMap={duplicateRowMap}
            showDuplicateRows={showDuplicateRows}
            setShowDuplicateRows={setShowDuplicateRows}
            errorList={errorList}
            failedRows={failedRows}
            showFailedRows={showFailedRows}
            setShowFailedRows={setShowFailedRows}
            successCount={successCount}
            resultSummary={resultSummary}
            missingCounts={missingCounts}
            setResultOpen={setResultOpen}
          />

          <BulkUploadPreviewTable
            previewData={previewData}
            uploading={uploading}
            successCount={successCount}
            headerKeys={headerKeys}
            getCell={getCell}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={startUpload}
              disabled={
                !file || loading || uploading || previewData.length === 0
              }
              className="flex-1 py-2.5 px-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 active:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <LoaderThree
                  label={
                    uploadProgress
                      ? `${uploadProgress} (Remaining: ${Math.max(
                          poPlannedTotal - poDone,
                          0,
                        )})`
                      : poPlannedTotal > 0
                        ? `Uploading PO ${poDone}/${poPlannedTotal} (Remaining: ${Math.max(
                            poPlannedTotal - poDone,
                            0,
                          )})`
                        : "Processing..."
                  }
                />
              ) : (
                "Upload Data"
              )}
            </button>
          </div>
        </div>
      </Modal>

      <BulkUploadResultModal
        open={resultOpen}
        resultSummary={resultSummary}
        onClose={() => setResultOpen(false)}
        onFinished={() => {
          setResultOpen(false);
          reset();
          onClose();
        }}
      />

      <BulkUploadProgressModal
        open={progressOpen}
        uploading={uploading}
        progressMeta={progressMeta}
        uploadProgress={uploadProgress}
        onCancel={cancelUpload}
      />

      <BulkUploadConfirmModal
        open={showConfirm && !uploading}
        duplicateNos={duplicateNos}
        onConfirm={async (replace) => {
          setReplaceDupes(replace);
          setShowConfirm(false);
          await handleUpload();
        }}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}
