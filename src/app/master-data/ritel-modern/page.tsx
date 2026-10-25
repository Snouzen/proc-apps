"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import { saveRitel } from "@/lib/api";
import { getMeSync } from "@/lib/me";
import { useRitelData } from "./hooks/useRitelData";
import RitelFormModal from "./components/RitelFormModal";
import RitelTable from "./components/RitelTable";
import RitelEditCompanyModal, {
  EditCompanyState,
} from "./components/RitelEditCompanyModal";
import RitelViewStoresModal, {
  ViewCompanyState,
} from "./components/RitelViewStoresModal";
import RitelViewAliasesModal from "./components/RitelViewAliasesModal";
import RitelStoreDialogs from "./components/RitelStoreDialogs";
import RitelBulkConfirmModal, {
  BulkDialogState,
} from "./components/RitelBulkConfirmModal";

const ExcelBulkModal = dynamic(() => import("@/components/excel-bulk-modal"), {
  ssr: false,
});

export default function RitelModernPage() {
  const me = getMeSync();
  const isRm = me?.role === "rm";
  const isPusat = me?.role === "pusat";
  const canEdit = isRm || isPusat;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    dataRitel,
    setDataRitel,
    isLoading,
    setIsLoading,
    loadError,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    groupedData,
    filteredData,
    allCompanyOptions,
    currentItems,
    totalPages,
    indexOfFirstItem,
    indexOfLastItem,
    companyMapping,
  } = useRitelData();

  // Modal & Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"addInisial" | "addCompany">("addInisial");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [inisial, setInisial] = useState("");
  const [logoPt, setLogoPt] = useState("");
  const [logoInisial, setLogoInisial] = useState("");

  const [editCompany, setEditCompany] = useState<EditCompanyState | null>(null);
  const [viewCompany, setViewCompany] = useState<ViewCompanyState | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<string | null>(null);
  const [deleteInisial, setDeleteInisial] = useState<{
    namaPt: string;
    inisial: string;
  } | null>(null);

  const [editStore, setEditStore] = useState<{
    id: string;
    tujuan: string;
    namaPt: string;
  } | null>(null);
  const [deleteStore, setDeleteStore] = useState<{
    id: string;
    tujuan: string;
    namaPt: string;
  } | null>(null);
  const [newStoreName, setNewStoreName] = useState("");

  const [editAlias, setEditAlias] = useState<{
    namaPt: string;
    inisial: string;
  } | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [viewAliases, setViewAliases] = useState<{ namaPt: string } | null>(null);

  const [addStoreFor, setAddStoreFor] = useState<{
    namaPt: string;
    inisial: string;
  } | null>(null);
  const [newStoreForName, setNewStoreForName] = useState("");

  const [openExcelBulk, setOpenExcelBulk] = useState(false);
  const [bulkResult] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);

  const findColumnKey = (row: any, aliases: string[]): string | null => {
    if (!row || typeof row !== "object") return null;
    const norm = (s: string) =>
      (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const normAliases = aliases.map((a) => norm(a));
    for (const key of Object.keys(row)) {
      if (normAliases.includes(norm(key))) return key;
    }
    return null;
  };

  const getCellValue = (row: any, key: string | null): string => {
    if (!key || row[key] == null) return "";
    return String(row[key]).trim();
  };

  const executeRitelBulk = async (replaceDupes: boolean) => {
    if (!bulkDialog) return;
    const { rows, dupeCount, namaPtKey, tujuanKey, inisialAliases } = bulkDialog;
    const existingKeySet = new Set(
      (Array.isArray(dataRitel) ? dataRitel : []).map(
        (row: any) =>
          `${String(row.namaPt || "").trim().toLowerCase()}|${String(row.tujuan || "").trim().toLowerCase()}`,
      ),
    );
    setIsLoading(true);
    setBulkDialog(null);
    try {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const namaPt = getCellValue(row, namaPtKey);
        const tujuan = getCellValue(row, tujuanKey);
        if (!namaPt || !tujuan) continue;

        const inisialKey = findColumnKey(row, inisialAliases);
        const excelInisial = getCellValue(row, inisialKey);
        const inisialVal = companyMapping[namaPt] ?? (excelInisial || null);

        const logoPtKey = findColumnKey(row, ["logo pt", "logopt", "logo_pt"]);
        const logoInisialKey = findColumnKey(row, [
          "logo inisial",
          "logoinitial",
          "logo_inisial",
        ]);
        const excelLogoPt = getCellValue(row, logoPtKey);
        const excelLogoInisial = getCellValue(row, logoInisialKey);

        const payload = {
          namaPt,
          inisial: inisialVal || undefined,
          tujuan,
          logoPt: excelLogoPt || undefined,
          logoInisial: excelLogoInisial || undefined,
        };

        const key = `${namaPt.trim().toLowerCase()}|${tujuan.trim().toLowerCase()}`;
        const isDupe = existingKeySet.has(key);

        if (isDupe && !replaceDupes) continue;
        if (isDupe && replaceDupes) {
          const match = (Array.isArray(dataRitel) ? dataRitel : []).find(
            (r: any) =>
              String(r.namaPt || "").trim().toLowerCase() === namaPt.trim().toLowerCase() &&
              String(r.tujuan || "").trim().toLowerCase() === tujuan.trim().toLowerCase(),
          );
          if (match?.id) {
            try {
              await fetch(`/api/ritel?id=${encodeURIComponent(match.id)}`, {
                method: "DELETE",
              });
            } catch {}
          }
        }
        await saveRitel(payload);
      }
      Swal.fire({
        icon: "success",
        title: "Bulk Upload Berhasil",
        text: `Bulk Upload selesai. Duplikat: ${dupeCount}. Mode: ${replaceDupes ? "REPLACE" : "SKIP"}.`,
      });
      try {
        const res = await fetch("/api/ritel");
        const result = await res.json().catch(() => ({}));
        const list = Array.isArray(result) ? result : (result?.data ?? []);
        setDataRitel(list);
      } catch {}
    } catch (error) {
      console.error("Bulk Upload Error:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal konek server backend atau ada masalah saat upload. Cek konsol.",
      });
    } finally {
      setIsLoading(false);
      setBulkDialog(null);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Ritel Modern
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ritel Modern
          </p>
        </div>

        <div className="flex gap-2">
          {!isRm && (
            <button
              suppressHydrationWarning
              onClick={() => setOpenExcelBulk(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm"
            >
              <Plus size={18} />
              Bulk Upload (Excel)
            </button>
          )}
          <button
            suppressHydrationWarning
            onClick={() => {
              setSelectedCompany("");
              setInisial("");
              setLogoPt("");
              setLogoInisial("");
              setModalMode("addInisial");
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-sm active:scale-95 text-sm"
          >
            <Plus size={18} />
            Add New Data
          </button>
        </div>
      </div>

      {bulkResult && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            bulkResult.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {bulkResult.text}
        </div>
      )}

      <ExcelBulkModal
        open={openExcelBulk}
        onClose={() => setOpenExcelBulk(false)}
        onSuccess={() => {
          setOpenExcelBulk(false);
          setIsLoading(true);
          fetch("/api/ritel")
            .then((r) => r.json())
            .then((list) => {
              setDataRitel(Array.isArray(list) ? list : list?.data || []);
            })
            .finally(() => setIsLoading(false));
        }}
        title="Bulk Upload Ritel Modern"
        variant="ritel"
      />

      <RitelTable
        isLoading={isLoading}
        loadError={loadError}
        groupedData={groupedData}
        currentItems={currentItems}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCurrentPage={setCurrentPage}
        canEdit={canEdit}
        isRm={isRm}
        setViewAliases={setViewAliases}
        setEditCompany={setEditCompany}
        setDeleteCompany={setDeleteCompany}
        filteredData={filteredData}
        indexOfFirstItem={indexOfFirstItem}
        indexOfLastItem={indexOfLastItem}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
      />

      {/* ── Extracted Dialogs & Modals ── */}
      <RitelStoreDialogs
        editStore={editStore}
        setEditStore={setEditStore}
        newStoreName={newStoreName}
        setNewStoreName={setNewStoreName}
        addStoreFor={addStoreFor}
        setAddStoreFor={setAddStoreFor}
        newStoreForName={newStoreForName}
        setNewStoreForName={setNewStoreForName}
        deleteStore={deleteStore}
        setDeleteStore={setDeleteStore}
        editAlias={editAlias}
        setEditAlias={setEditAlias}
        newAlias={newAlias}
        setNewAlias={setNewAlias}
        deleteCompany={deleteCompany}
        setDeleteCompany={setDeleteCompany}
        deleteInisial={deleteInisial}
        setDeleteInisial={setDeleteInisial}
        dataRitel={dataRitel}
        setDataRitel={setDataRitel}
        viewCompany={viewCompany}
        setViewCompany={setViewCompany}
      />

      <RitelViewAliasesModal
        viewAliases={viewAliases}
        setViewAliases={setViewAliases}
        groupedData={groupedData}
        dataRitel={dataRitel}
        isPusat={isPusat}
        isRm={isRm}
        setViewCompany={setViewCompany}
        setEditCompany={setEditCompany}
        setAddStoreFor={setAddStoreFor}
        setNewStoreForName={setNewStoreForName}
        setDeleteInisial={setDeleteInisial}
      />

      <RitelBulkConfirmModal
        bulkDialog={bulkDialog}
        setBulkDialog={setBulkDialog}
        companyMapping={companyMapping}
        executeRitelBulk={executeRitelBulk}
        findColumnKey={findColumnKey}
        getCellValue={getCellValue}
      />

      <RitelFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modalMode={modalMode}
        setModalMode={setModalMode}
        isRm={isRm}
        allCompanyOptions={allCompanyOptions}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        inisial={inisial}
        setInisial={setInisial}
        logoPt={logoPt}
        setLogoPt={setLogoPt}
        logoInisial={logoInisial}
        setLogoInisial={setLogoInisial}
        setDataRitel={setDataRitel}
      />

      <RitelEditCompanyModal
        editCompany={editCompany}
        setEditCompany={setEditCompany}
        isRm={isRm}
        setDataRitel={setDataRitel}
      />

      <RitelViewStoresModal
        viewCompany={viewCompany}
        setViewCompany={setViewCompany}
        canEdit={canEdit}
        setNewStoreName={setNewStoreName}
        setEditStore={setEditStore}
        setDeleteStore={setDeleteStore}
      />
    </div>
  );
}
