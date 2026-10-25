"use client";

import PusatOnly from "@/components/PusatOnly";
import React from "react";
import { DataTable } from "@/components/data-table";
import { Link2, Layers, Pencil, Trash2 } from "lucide-react";
import { Promo } from "../types";
import { formatRp, formatNumber } from "../hooks/usePromoData";

interface PromoTableProps {
  currentItems: Promo[];
  isLoading: boolean;
  totalItems: number;
  safePage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (rows: number) => void;
  handleEdit: (promo: Promo) => void;
  setDeleteConfirmId: (id: string | null) => void;
}

export default function PromoTable({
  currentItems,
  isLoading,
  totalItems,
  safePage,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
  handleEdit,
  setDeleteConfirmId,
}: PromoTableProps) {
  return (
    <DataTable
      columns={[
        {
          key: "no",
          label: "No.",
          align: "center" as const,
          render: (_v: any, _row: any, index: number) => (
            <span className="text-slate-400 font-bold text-[11px]">
              {(safePage - 1) * itemsPerPage + index + 1}
            </span>
          ),
        },
        {
          key: "id",
          label: "ID Promo",
          render: (_v: any, promo: any) => (
            <span className="font-mono text-[10px] text-slate-400">{promo.id}</span>
          ),
        },
        {
          key: "nomor",
          label: "Nomor",
          render: (_v: any, promo: any) => (
            <span className="text-slate-900 dark:text-slate-200 uppercase font-bold text-[13px]">
              {promo.nomor}
            </span>
          ),
        },
        {
          key: "kegiatan",
          label: "Kegiatan",
          render: (_v: any, promo: any) => (
            <span className="uppercase font-black text-slate-600 dark:text-slate-400 text-[11px]">
              {promo.kegiatan}
            </span>
          ),
        },
        {
          key: "periode",
          label: "Periode",
          render: (_v: any, promo: any) => (
            <span className="font-bold text-[13px] text-slate-700 dark:text-slate-300">
              {promo.periode}
            </span>
          ),
        },
        {
          key: "tanggal",
          label: "Tanggal",
          render: (_v: any, promo: any) => (
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[13px]">
              {new Date(promo.tanggal).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          ),
        },
        {
          key: "dpp",
          label: "DPP",
          align: "right" as const,
          render: (_v: any, promo: any) => (
            <span className="tabular-nums font-bold text-[13px] text-slate-700 dark:text-slate-300">
              {formatRp(promo.dpp)}
            </span>
          ),
        },
        {
          key: "ppn",
          label: "PPN",
          align: "right" as const,
          render: (_v: any, promo: any) => (
            <span className="tabular-nums font-bold text-[13px] text-slate-700 dark:text-slate-300">
              {formatRp(promo.ppn)}
            </span>
          ),
        },
        {
          key: "pph",
          label: "PPH",
          align: "right" as const,
          render: (_v: any, promo: any) => (
            <span className="tabular-nums text-rose-500 dark:text-rose-400 italic font-bold text-[13px]">
              {promo.pph ? `-${formatNumber(promo.pph)}` : "-"}
            </span>
          ),
        },
        {
          key: "total",
          label: "Total",
          align: "right" as const,
          render: (_v: any, promo: any) => (
            <span className="text-indigo-600 dark:text-indigo-400 font-black tabular-nums text-[13px]">
              {formatRp(promo.total)}
            </span>
          ),
        },
        {
          key: "linkDocs",
          label: "Link Docs",
          align: "center" as const,
          render: (_v: any, promo: any) =>
            promo.linkDocs ? (
              <a
                href={promo.linkDocs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white rounded-xl transition-all shadow-sm"
                title="Buka Dokumentasi"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 size={16} />
              </a>
            ) : (
              <span className="text-[10px] font-black text-slate-200 dark:text-slate-600 uppercase tracking-tighter italic">
                No Docs
              </span>
            ),
        },
        {
          key: "linkFP",
          label: "Faktur Pajak",
          align: "center" as const,
          render: (_v: any, promo: any) =>
            promo.linkFP ? (
              <a
                href={promo.linkFP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white rounded-xl transition-all shadow-sm"
                title="Buka Faktur Pajak"
                onClick={(e) => e.stopPropagation()}
              >
                <Layers size={16} />
              </a>
            ) : (
              <span className="text-[10px] font-black text-slate-200 dark:text-slate-600 uppercase tracking-tighter italic">
                No FP
              </span>
            ),
        },
        {
          key: "remarks",
          label: "Remarks",
          render: (_v: any, promo: any) => (
            <span className="text-slate-400 dark:text-slate-500 italic font-medium text-[11px] max-w-[200px] truncate inline-block">
              {promo.remarks || "-"}
            </span>
          ),
        },
        {
          key: "actions",
          label: "Aksi",
          align: "center" as const,
          render: (_v: any, promo: any) => (
            <div className="inline-flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(promo);
                }}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white transition-all shadow-sm"
              >
                <Pencil size={16} />
              </button>
              <PusatOnly><button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(promo.id);
                }}
                className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-400 dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={16} />
              </button></PusatOnly>
            </div>
          ),
        },
      ]}
      data={currentItems}
      rowKey={(p: any) => p.id}
      loading={isLoading}
      total={totalItems}
      page={safePage}
      rowsPerPage={itemsPerPage}
      rowsPerPageOptions={[10, 25, 50]}
      onPageChange={setCurrentPage}
      onRowsPerPageChange={(val) => {
        setItemsPerPage(val);
        setCurrentPage(1);
      }}
      variant="rounded"
      className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500"
      emptyMessage="Data promo tidak ditemukan."
    />
  );
}
