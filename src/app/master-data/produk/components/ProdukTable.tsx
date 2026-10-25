"use client";

import PusatOnly from "@/components/PusatOnly";
import React from "react";
import { DataTable } from "@/components/data-table";
import { Copy, Package, Eye, Pencil, Trash2 } from "lucide-react";
import { Product } from "../types";

interface ProdukTableProps {
  currentItems: Product[];
  isLoading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  shortId: (id: string) => string;
  handleCopyId: (id: string) => void;
  setViewProduct: (p: Product) => void;
  setEditProduct: (p: Product) => void;
  setEditName: (name: string) => void;
  setEditSatuan: (satuan: string) => void;
  handleDelete: (id: string) => void;
}

export default function ProdukTable({
  currentItems,
  isLoading,
  totalItems,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  shortId,
  handleCopyId,
  setViewProduct,
  setEditProduct,
  setEditName,
  setEditSatuan,
  handleDelete,
}: ProdukTableProps) {
  return (
    <DataTable
      columns={[
        {
          key: "id",
          label: "ID Produk",
          width: "w-48",
          render: (_v: any, product: any) => (
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight"
                title={product.id}
              >
                {shortId(product.id)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyId(product.id);
                }}
                className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Salin ID"
              >
                <Copy size={12} />
              </button>
            </div>
          ),
        },
        {
          key: "name",
          label: "Nama Produk",
          render: (_v: any, product: any) => (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Package size={16} />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {product.name}
              </span>
            </div>
          ),
        },
        {
          key: "satuanKg",
          label: "Satuan (Kg/pcs)",
          align: "center",
          render: (_v: any, product: any) => (
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {typeof product.satuanKg === "number" ? product.satuanKg : ""} Kg
            </span>
          ),
        },
        {
          key: "actions",
          label: "Aksi",
          align: "center",
          width: "w-40",
          render: (_v: any, product: any) => (
            <div className="inline-flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewProduct(product);
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditProduct(product);
                  setEditName(product.name);
                  setEditSatuan(String(product.satuanKg ?? 1));
                }}
                className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                <Pencil size={16} />
              </button>
              <PusatOnly><button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(product.id);
                }}
                className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20"
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
      page={currentPage}
      rowsPerPage={itemsPerPage}
      onPageChange={setCurrentPage}
      emptyMessage="Tidak ada data"
    />
  );
}
