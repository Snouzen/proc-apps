"use client";

import React from "react";
import { ProgressMeta } from "../types";

interface BulkUploadProgressModalProps {
  open: boolean;
  uploading: boolean;
  progressMeta: ProgressMeta | null;
  uploadProgress: string | null;
  onCancel: () => void;
}

export default function BulkUploadProgressModal({
  open,
  uploading,
  progressMeta,
  uploadProgress,
  onCancel,
}: BulkUploadProgressModalProps) {
  if (!open || !uploading) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Upload Bulk PO
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {progressMeta
                  ? `Batch ${progressMeta.batchIndex}/${progressMeta.batchTotal} • ${Math.max(
                      progressMeta.batchTotal - progressMeta.batchIndex,
                      0,
                    )} batch remaining`
                  : "Menyiapkan batch..."}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
            >
              Cancel Upload
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-semibold">Progress</span>
              <span className="text-slate-500">
                {progressMeta && progressMeta.poTotal > 0
                  ? `${progressMeta.poDone}/${progressMeta.poTotal} uploaded`
                  : progressMeta
                    ? `${progressMeta.batchIndex}/${progressMeta.batchTotal} batch`
                    : ""}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-900"
                style={{
                  width: (() => {
                    if (!progressMeta) return "0%";
                    if (progressMeta.poTotal > 0) {
                      const pct = Math.max(
                        0,
                        Math.min(
                          100,
                          Math.round(
                            (progressMeta.poDone / progressMeta.poTotal) * 100,
                          ),
                        ),
                      );
                      return `${pct}%`;
                    }
                    const pct = Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          (progressMeta.batchIndex /
                            Math.max(progressMeta.batchTotal, 1)) *
                            100,
                        ),
                      ),
                    );
                    return `${pct}%`;
                  })(),
                }}
              />
            </div>
            {progressMeta && progressMeta.poTotal > 0 && (
              <div className="text-xs text-slate-600">
                {Math.max(progressMeta.poTotal - progressMeta.poDone, 0)} of{" "}
                {progressMeta.poTotal} remaining
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {uploadProgress || "Sedang memproses..."}
          </div>
        </div>
      </div>
    </div>
  );
}
