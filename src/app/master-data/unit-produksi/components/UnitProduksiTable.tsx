"use client";

import PusatOnly from "@/components/PusatOnly";
import React from "react";
import { DataTable } from "@/components/data-table";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  MapPin,
} from "lucide-react";

interface UnitProduksiTableProps {
  currentItems: any[];
  isLoading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  expandedRows: string[];
  toggleRow: (id: string) => void;
  setViewRegional: (val: { nama: string; sites: any[] } | null) => void;
  setContextRegional: (val: string | null) => void;
  setSelectedRegional: (val: string) => void;
  setSiteName: (val: string) => void;
  setModalMode: (val: "addSite" | "addRegional") => void;
  setIsModalOpen: (val: boolean) => void;
  setDeleteRegional: (val: string | null) => void;
  setViewedSite: (val: any) => void;
  setEditSite: (val: any) => void;
  setNewRegionalName: (val: string) => void;
  setNewSiteName: (val: string) => void;
  setNewSiteAlamat: (val: string) => void;
  setNewSiteManager: (val: string) => void;
  setDeleteSite: (val: any) => void;
}

export default function UnitProduksiTable({
  currentItems,
  isLoading,
  totalItems,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  expandedRows,
  toggleRow,
  setViewRegional,
  setContextRegional,
  setSelectedRegional,
  setSiteName,
  setModalMode,
  setIsModalOpen,
  setDeleteRegional,
  setViewedSite,
  setEditSite,
  setNewRegionalName,
  setNewSiteName,
  setNewSiteAlamat,
  setNewSiteManager,
  setDeleteSite,
}: UnitProduksiTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
      <DataTable
        rowKey={(r: any) => r.id}
        columns={[
          {
            key: "id",
            label: "ID",
            width: "w-32",
            render: (_v: any, reg: any) => (
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                {reg.id.substring(0, 10)}
              </span>
            ),
          },
          {
            key: "nama",
            label: "Nama Regional",
            render: (_v: any, reg: any) => (
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(reg.id);
                  }}
                  className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-indigo-400 transition-all"
                >
                  {expandedRows.includes(reg.id) ? (
                    <ChevronDown
                      size={20}
                      className="text-blue-600 dark:text-indigo-400"
                    />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>
                <span
                  className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(reg.id);
                  }}
                >
                  {reg.nama}
                </span>
              </div>
            ),
          },
          {
            key: "actions",
            label: "Action",
            align: "center",
            width: "w-48",
            render: (_v: any, reg: any) => (
              <div className="flex justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewRegional({
                      nama: reg.nama,
                      sites: reg.sites,
                    });
                  }}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  title="View"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextRegional(reg.nama);
                    setSelectedRegional(reg.nama);
                    setSiteName("");
                    setModalMode("addSite");
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-indigo-400 rounded-lg hover:bg-blue-50 dark:hover:bg-indigo-500/10 transition-all"
                  title="Tambah Site"
                >
                  <Edit2 size={16} />
                </button>
                <PusatOnly><button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteRegional(reg.nama);
                  }}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400 rounded-lg hover:bg-red-50 dark:hover:bg-rose-500/10 transition-all"
                  title="Hapus Regional"
                >
                  <Trash2 size={16} />
                </button></PusatOnly>
              </div>
            ),
          },
        ]}
        data={currentItems}
        loading={isLoading}
        total={totalItems}
        page={currentPage}
        rowsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        emptyMessage="Data tidak ditemukan."
        expandedKeys={new Set(expandedRows)}
        onToggleExpand={(id) => toggleRow(id)}
        renderExpandedRow={(reg: any) => (
          <tr className="bg-slate-50/50 dark:bg-slate-900/50">
            <td
              colSpan={3}
              className="px-16 py-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1">
                {reg.sites.map((site: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center gap-3 justify-between shadow-sm group hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <MapPin size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {site.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          setViewedSite({
                            ...site,
                            regional: reg.nama,
                          })
                        }
                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                        title="View Detail"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditSite({
                            regional: reg.nama,
                            site: site.name,
                            alamat: site.alamat,
                            managerOperasional: site.managerOperasional,
                          });
                          setNewRegionalName(reg.nama);
                          setNewSiteName(site.name);
                          setNewSiteAlamat(site.alamat);
                          setNewSiteManager(site.managerOperasional || "");
                        }}
                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                        title="Edit Site"
                      >
                        <Edit2 size={14} />
                      </button>
                      <PusatOnly><button
                        onClick={() =>
                          setDeleteSite({
                            regional: reg.nama,
                            site: site.name,
                          })
                        }
                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400 rounded-lg hover:bg-red-50 dark:hover:bg-rose-500/10 transition-all"
                        title="Hapus Site"
                      >
                        <Trash2 size={14} />
                      </button></PusatOnly>
                    </div>
                  </div>
                ))}
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
