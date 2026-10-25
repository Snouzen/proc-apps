"use client";

import React from "react";
import { HeaderKeys } from "../types";

interface BulkUploadPreviewTableProps {
  previewData: any[];
  uploading: boolean;
  successCount: number;
  headerKeys: HeaderKeys;
  getCell: (row: any, key: string | null) => string;
}

export default function BulkUploadPreviewTable({
  previewData,
  uploading,
  successCount,
  headerKeys,
  getCell,
}: BulkUploadPreviewTableProps) {
  if (previewData.length === 0 || uploading || successCount > 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">Preview Data</span>
        <span className="text-slate-500">
          {previewData.length} records found
        </span>
      </div>
      <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="p-2 font-medium text-slate-500">No PO</th>
              <th className="p-2 font-medium text-slate-500">Company</th>
              <th className="p-2 font-medium text-slate-500">Inisial</th>
              <th className="p-2 font-medium text-slate-500">Product</th>
              <th className="p-2 font-medium text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {previewData.slice(0, 5).map((row, i) => (
              <tr key={i}>
                <td className="p-2 text-slate-700">
                  {getCell(row, headerKeys.noPo)}
                </td>
                <td className="p-2 text-slate-700 truncate max-w-[100px]">
                  {getCell(row, headerKeys.company)}
                </td>
                <td className="p-2 text-slate-700 truncate max-w-[100px]">
                  {getCell(row, headerKeys.inisial) || "—"}
                </td>
                <td className="p-2 text-slate-700 truncate max-w-[100px]">
                  {getCell(row, headerKeys.product)}
                </td>
                <td className="p-2 text-slate-700 font-medium">
                  {(() => {
                    const val = getCell(row, headerKeys.total);
                    const num = Number(val);
                    return isFinite(num) && num > 0
                      ? num.toLocaleString("id-ID")
                      : "-";
                  })()}
                </td>
              </tr>
            ))}
            {previewData.length > 5 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-2 text-center text-slate-400 italic"
                >
                  ...and {previewData.length - 5} more
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
