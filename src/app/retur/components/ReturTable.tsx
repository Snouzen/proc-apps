import React, { useMemo } from "react";
import { Pencil, Trash2, Check, X, FileSpreadsheet, Loader2 } from "lucide-react";
import { DataTableV2 } from "@/components/data-table/DataTableV2";
import { createColumnHelper } from "@tanstack/react-table";
import { CustomInlineDatePicker, TableSearchableInput, TableProductInput, SmoothStatusSelect } from "./ReturShared";
import dynamic from "next/dynamic";

const ReturDetailModal = dynamic(() => import("@/components/retur-detail-modal"), { ssr: false });
const helper = createColumnHelper<any>();

export function ReturTable(props: any) {
  const {
    editingId, isMassEditing, massEditForms, editForm, role, units, userArea, userRegional, filteredLokasi,
    setSearchLokasi, handleFieldChange, isListOpen, setIsListOpen, filteredTujuanItems, activeIndex, setActiveIndex,
    setEditForm, searchToko, setSearchToko, filteredToko, searchProduk, setSearchProduk, filteredProductsInline,
    searchPembebanan, setSearchPembebanan, filteredPembebanan, handleSaveInline, handleCancelEdit, handleStartEdit,
    handleDelete, setViewDetailId, formatDate, formatIDR, formatNumber, paginatedData, loading, isFetchingPage,
    total, page, rowsPerPage, setPage, setRowsPerPage, isGroupedMode, selectedDetail, viewDetailId, comboRef, handleTujuanKeyDown, setSearchInisial, setIsInisialOpen, filteredInisial, products, isInisialOpen
  } = props;

  const columns = useMemo(() => [
    helper.display({
      id: "no",
      header: "NO",
      size: 60,
      meta: { align: "center" },
      cell: ({ row }) => {
        const no = (page - 1) * rowsPerPage + row.index + 1;
        return (
          <span className="text-slate-500 font-medium text-xs">
            {no}
          </span>
        );
      },
    }),
    helper.accessor("rtvCn", {
      header: "RTV/CN",
      size: 140,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <input suppressHydrationWarning type="text" className="w-full min-w-[100px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.rtvCn || ""} onChange={e => handleFieldChange(item, 'rtvCn', e.target.value)} />
        ) : (
          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg text-xs border border-indigo-100 dark:border-indigo-800">{item.rtvCn || "-"}</span>
        );
      },
    }),
    helper.accessor("tanggalRtv", {
      header: "TANGGAL RTV",
      size: 140,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap uppercase tracking-tighter tabular-nums">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <CustomInlineDatePicker value={currentForm.tanggalRtv} onChange={(date: string) => handleFieldChange(item, 'tanggalRtv', date)} colorScheme="indigo" />
            ) : formatDate(item.tanggalRtv)}
          </div>
        );
      },
    }),
    helper.accessor("maxPickup", {
      header: "MAX PICKUP",
      size: 140,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap uppercase tracking-tighter tabular-nums">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <CustomInlineDatePicker value={currentForm.maxPickup} onChange={(date: string) => handleFieldChange(item, 'maxPickup', date)} colorScheme="rose" />
            ) : formatDate(item.maxPickup)}
          </div>
        );
      },
    }),
    helper.accessor("statusBarang", {
      header: "STATUS BARANG",
      size: 160,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        const currentLokasi = isEditing
          ? (units.find((u: any) => u.idRegional === currentForm.lokasiBarangId)?.siteArea || "")
          : (item.LokasiBarang?.siteArea || "");
        const currentLokasiNorm = currentLokasi.toLowerCase().replace(/[^a-z0-9]/g, "");
        const userAreaStatusNorm = (userArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const userRegNorm = (userRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const isSiteareaMatch = userAreaStatusNorm
          ? (currentLokasiNorm === userAreaStatusNorm)
          : (userRegNorm ? !!units.find((u: any) => {
              const sa = (u.siteArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const rg = (u.namaRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return sa === currentLokasiNorm && rg === userRegNorm;
            }) : false);
        const canEditStatus = role === "pusat" ||
          (role === "sitearea" && currentLokasiNorm !== "" && isSiteareaMatch) ||
          (role === "rm");
        return isEditing && canEditStatus ? (
          <SmoothStatusSelect value={currentForm.statusBarang || "BELUM DIAMBIL"} onChange={(v: string) => handleFieldChange(item, 'statusBarang', v)} />
        ) : (
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
            item.statusBarang?.toUpperCase() === "SUDAH DIAMBIL" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" 
            : item.statusBarang?.toUpperCase() === "DIMUSNAHKAN" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"
            : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800"
          }`}>{item.statusBarang || "Belum Diambil"}</div>
        );
      },
    }),
    helper.accessor("lokasiBarang", {
      header: "LOKASI BARANG",
      size: 180,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        const lokasiIsEmpty = !item.LokasiBarang?.siteArea;
        const userAreaNorm = (userArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const userRegLokasiNorm = (userRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const lokasiSiteAreaNorm = (item.LokasiBarang?.siteArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const lokasiUnitMatch = units.find((u: any) => (u.siteArea || "").toLowerCase().replace(/[^a-z0-9]/g, "") === lokasiSiteAreaNorm);
        const lokasiIsUnderRmRegional = !!lokasiUnitMatch && (lokasiUnitMatch.namaRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "") === userRegLokasiNorm;
        const canEditLokasi = role === "pusat" ||
          (role === "sitearea" && lokasiIsEmpty) ||
          (role === "rm" && (lokasiIsEmpty || lokasiIsUnderRmRegional));
        const lokasiOptions = role === "sitearea"
          ? (userAreaNorm
            ? units.filter((u: any) => {
                const sa = (u.siteArea || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                return sa === userAreaNorm;
              }).map((u: any) => u.siteArea)
            : (userRegLokasiNorm
              ? units.filter((u: any) => {
                  const rg = (u.namaRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  return rg === userRegLokasiNorm;
                }).map((u: any) => u.siteArea)
              : [])
          )
          : role === "rm"
            ? filteredLokasi.filter((u: any) => {
                const rg = (u.namaRegional || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                return rg === userRegLokasiNorm;
              }).map((u: any) => u.siteArea)
            : filteredLokasi.map((u: any) => u.siteArea);
        return isEditing && canEditLokasi ? (
          <TableSearchableInput value={units.find((u: any) => u.idRegional === currentForm.lokasiBarangId)?.siteArea || ""} onCommit={(val: string) => { const u = units.find((x: any) => x.siteArea === val); handleFieldChange(item, 'lokasiBarangId', u?.idRegional || ""); setSearchLokasi(val); }} items={lokasiOptions} placeholder="Cari Lokasi/DC..." />
        ) : (
          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.LokasiBarang?.siteArea || "-"}</div>
        );
      },
    }),
    helper.accessor("kodeToko", {
      header: "KODE TOKO",
      size: 130,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <input suppressHydrationWarning type="text" inputMode="numeric" className="w-full min-w-[100px] px-3 py-1.5 text-xs font-bold text-center text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.kodeToko || ""} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); handleFieldChange(item, 'kodeToko', val); }} />
        ) : (
          <span className="font-bold text-slate-600 dark:text-slate-300">{item.kodeToko || "-"}</span>
        );
      },
    }),
    helper.accessor("namaCompany", {
      header: "TOKO",
      size: 180,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <TableSearchableInput value={currentForm.namaCompany || ""} onCommit={(val: string) => { handleFieldChange(item, 'namaCompany', val); setSearchToko(val); }} items={filteredToko} placeholder="Cari Toko..." />
        ) : (
          <div className="text-xs font-black text-slate-800 dark:text-slate-200 whitespace-nowrap truncate max-w-[150px]" title={item.namaCompany}>{item.namaCompany || "-"}</div>
        );
      },
    }),
    helper.accessor("inisial", {
      header: "INISIAL",
      size: 100,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <TableSearchableInput value={currentForm.inisial || ""} onCommit={(val: string) => { handleFieldChange(item, 'inisial', val); setSearchInisial(val); setIsInisialOpen(false); }} items={filteredInisial} placeholder="Cari Inisial..." />
        ) : (
          <div className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black border border-slate-200 dark:border-slate-700">{item.inisial || "-"}</div>
        );
      },
    }),
    helper.accessor("link", {
      header: "LINK",
      size: 120,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <input className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.link || ""} onChange={e => handleFieldChange(item, 'link', e.target.value)} />
        ) : (
          item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-[10px] font-black uppercase tracking-tighter hover:underline">View Result</a> : "-"
        );
      },
    }),
    helper.accessor("produk", {
      header: "PRODUK",
      size: 180,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <TableProductInput value={currentForm.produk || ""} onCommit={(val: string) => { handleFieldChange(item, 'produk', val); setSearchProduk(val); const p = products.find((x: any) => x.name === val); if (p) handleFieldChange(item, 'productId', p.id); }} items={filteredProductsInline} placeholder="Cari Produk..." />
        ) : (
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[150px] truncate" title={item.produk}>{item.produk || "-"}</div>
        );
      },
    }),
    helper.accessor("qtyReturn", {
      header: "QTY RETUR",
      size: 130,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="font-black text-slate-800 dark:text-slate-200 tabular-nums text-xs">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <input type="number" className="w-full min-w-[100px] px-3 py-2 text-xs font-bold text-center text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer" value={currentForm.qtyReturn === 0 ? "" : currentForm.qtyReturn} onChange={e => { const v = e.target.value; handleFieldChange(item, 'qtyReturn', v === '' ? 0 : Number(v)); }} />
            ) : formatNumber(item.qtyReturn)}
          </div>
        );
      },
    }),
    helper.accessor("nominal", {
      header: "NOMINAL",
      size: 150,
      meta: { align: "right" },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="font-black text-slate-900 dark:text-slate-100 tabular-nums text-xs">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <input type="number" className="w-full min-w-[120px] px-3 py-2 text-xs font-bold text-right text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer" value={currentForm.nominal === 0 ? "" : currentForm.nominal} onChange={e => { const v = e.target.value; handleFieldChange(item, 'nominal', v === '' ? 0 : Number(v)); }} />
            ) : formatIDR(item.nominal)}
          </div>
        );
      },
    }),
    helper.accessor("rpKg", {
      header: "RP/KG",
      size: 140,
      meta: { align: "right" },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="font-black text-slate-500 dark:text-slate-400 tabular-nums text-xs italic">
            {isEditing ? (
              <div className="w-full min-w-[120px] px-3 py-2 text-xs font-black text-right text-indigo-700 bg-indigo-50/30 rounded-lg border-2 border-transparent tabular-nums">{formatIDR(currentForm.rpKg || 0)}</div>
            ) : formatIDR(item.rpKg)}
          </div>
        );
      },
    }),
    helper.accessor("refKetStatus", {
      header: "REFERENSI/KET STATUS",
      size: 200,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <input className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.refKetStatus || ""} onChange={e => handleFieldChange(item, 'refKetStatus', e.target.value)} />
            ) : (item.refKetStatus || "-")}
          </div>
        );
      },
    }),
    helper.accessor("pembebananReturn", {
      header: "PEMBEBANAN RETUR",
      size: 180,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        const pembebananSiteArea = item.PembebananReturn?.siteArea || "";
        const pembebananIsEmpty = !pembebananSiteArea;
        const pembebananUnit = units.find((u: any) => (u.siteArea || "").toLowerCase() === pembebananSiteArea.toLowerCase());
        const pembebananRegional = pembebananUnit?.namaRegional || "";
        const pembebananIsUnderRmRegional = !!pembebananSiteArea && pembebananRegional.toLowerCase() === (userRegional || "").toLowerCase();
        const canRmEditPembebanan = role === "rm" && (pembebananIsEmpty || pembebananIsUnderRmRegional);
        return isEditing && (role === "pusat" || canRmEditPembebanan) ? (
          <TableSearchableInput value={units.find((u: any) => u.idRegional === currentForm.pembebananReturnId)?.siteArea || ""} onCommit={(val: string) => { const u = units.find((x: any) => x.siteArea === val); handleFieldChange(item, 'pembebananReturnId', u?.idRegional || ""); setSearchPembebanan(val); }} items={role === "rm" ? filteredPembebanan.filter((u: any) => { const rg = (u.namaRegional || "").toLowerCase().replace(/[^a-z0-9]/g, ""); return rg === (userRegional || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }).map((u: any) => u.siteArea) : filteredPembebanan.map((u: any) => u.siteArea)} placeholder="Cari Pembebanan..." />
        ) : (
          <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 whitespace-nowrap">{item.PembebananReturn?.siteArea || "-"}</div>
        );
      },
    }),
    helper.accessor("invoiceRekon", {
      header: "INVOICE REKON",
      size: 150,
      meta: { align: "center" },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return isEditing && (role === "pusat" || role === "sitearea") ? (
          <input className="w-full min-w-[150px] px-3 py-1.5 text-[10px] font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.invoiceRekon || ""} onChange={e => handleFieldChange(item, 'invoiceRekon', e.target.value)} placeholder="No Invoice Rekon..." />
        ) : item.invoiceRekon ? (
          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-100 dark:border-emerald-800 shadow-sm whitespace-nowrap">{item.invoiceRekon}</div>
        ) : (
          <div className="w-2 h-2 rounded-full mx-auto bg-slate-200 dark:bg-slate-700" />
        );
      },
    }),
    helper.accessor("referensiPembayaran", {
      header: "REFERENSI PEMBAYARAN",
      size: 200,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap italic">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <input className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.referensiPembayaran || ""} onChange={e => handleFieldChange(item, 'referensiPembayaran', e.target.value)} />
            ) : (item.referensiPembayaran || "-")}
          </div>
        );
      },
    }),
    helper.accessor("tanggalPembayaran", {
      header: "TANGGAL PEMBAYARAN",
      size: 160,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <CustomInlineDatePicker value={currentForm.tanggalPembayaran} onChange={(date: string) => handleFieldChange(item, 'tanggalPembayaran', date)} colorScheme="slate" />
            ) : formatDate(item.tanggalPembayaran)}
          </div>
        );
      },
    }),
    helper.accessor("remarks", {
      header: "REMARKS",
      size: 200,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 max-w-[150px] truncate" title={item.remarks}>
            {isEditing && (role === "pusat" || role === "rm" || role === "sitearea") ? (
              <input className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.remarks || ""} onChange={e => handleFieldChange(item, 'remarks', e.target.value)} />
            ) : (item.remarks || "-")}
          </div>
        );
      },
    }),
    helper.accessor("sdiReturn", {
      header: "SDI RETUR",
      size: 180,
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingId === item.id || isMassEditing;
        const currentForm = isMassEditing ? (massEditForms[item.id] || item) : editForm;
        return (
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
            {isEditing && (role === "pusat" || role === "sitearea") ? (
              <input className="w-full min-w-[200px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border-2 border-indigo-100 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" value={currentForm.sdiReturn || ""} onChange={e => handleFieldChange(item, 'sdiReturn', e.target.value)} />
            ) : (item.sdiReturn || "-")}
          </div>
        );
      },
    }),
    helper.display({
      id: "actions",
      header: "AKSI",
      size: 100,
      meta: { align: "right" },
      cell: ({ row }) => {
        const item = row.original;
        if (isMassEditing) return null; // Hide actions during mass edit
        const isEditing = editingId === item.id;
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            {isEditing ? (
              <>
                <button onClick={() => handleSaveInline(item.id)} disabled={isFetchingPage} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90 disabled:opacity-50">
                  {isFetchingPage ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                </button>
                <button onClick={handleCancelEdit} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleStartEdit(item)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-sm active:scale-90">
                  <Pencil size={15} />
                </button>
                {role === "pusat" && (
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 cursor-pointer">
                    <Trash2 size={15} />
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    }),
  ], [
    editingId, isMassEditing, massEditForms, editForm, role, units, userArea, userRegional,
    filteredLokasi, isFetchingPage, page, rowsPerPage, filteredToko, filteredInisial,
    filteredProductsInline, filteredPembebanan, products, handleFieldChange, setSearchLokasi,
    setSearchToko, setSearchInisial, setIsInisialOpen, setSearchProduk, setSearchPembebanan,
    handleSaveInline, handleCancelEdit, handleStartEdit, handleDelete, formatIDR, formatDate, formatNumber
  ]);

  return (
    <>
      <DataTableV2
        columns={columns}
        data={paginatedData}
        getRowId={(row: any) => row.id}
        loading={loading}
        isFetching={isFetchingPage}
        manualPagination={true}
        pageCount={Math.max(1, Math.ceil(total / rowsPerPage))}
        pagination={{ pageIndex: Math.max(0, page - 1), pageSize: rowsPerPage }}
        onPaginationChange={(updater: any) => {
          const next = typeof updater === "function" 
            ? updater({ pageIndex: Math.max(0, page - 1), pageSize: rowsPerPage }) 
            : updater;
          if (next.pageSize !== rowsPerPage) {
            setRowsPerPage(next.pageSize);
            setPage(1);
          } else {
            setPage(next.pageIndex + 1);
          }
        }}
        onRowClick={(item: any) => !editingId && !isMassEditing && setViewDetailId(item.id)}
      />

      <ReturDetailModal 
        isOpen={!!viewDetailId} 
        onClose={() => setViewDetailId(null)} 
        data={selectedDetail}
      />
    </>
  );
}
