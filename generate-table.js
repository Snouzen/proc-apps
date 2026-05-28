const fs = require('fs');
const code = fs.readFileSync('src/app/retur/page.tsx', 'utf8');
const lines = code.split('\n');

const startLine = 1680 - 1;
const endLine = 2082 - 1; 

const tableCode = lines.slice(startLine, endLine + 1).join('\n');

const componentCode = `import { Pencil, Trash2, Check, X, FileSpreadsheet } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { CustomInlineDatePicker, TableSearchableInput, TableProductInput, SmoothStatusSelect } from "./ReturShared";
import dynamic from "next/dynamic";

const ReturDetailModal = dynamic(() => import("@/components/retur-detail-modal"), { ssr: false });

export function ReturTable(props: any) {
  const {
    editingId, isMassEditing, massEditForms, editForm, role, units, userArea, userRegional, filteredLokasi,
    setSearchLokasi, handleFieldChange, isListOpen, setIsListOpen, filteredTujuanItems, activeIndex, setActiveIndex,
    setEditForm, searchToko, setSearchToko, filteredToko, searchProduk, setSearchProduk, filteredProductsInline,
    searchPembebanan, setSearchPembebanan, filteredPembebanan, handleSaveInline, handleCancelEdit, handleStartEdit,
    handleDelete, setViewDetailId, formatDate, formatIDR, formatNumber, paginatedData, loading, isFetchingPage,
    total, page, rowsPerPage, setPage, setRowsPerPage, isGroupedMode, selectedDetail, viewDetailId, comboRef, handleTujuanKeyDown
  } = props;

  return (
    <>
${tableCode}
    </>
  );
}
`;

fs.writeFileSync('src/app/retur/components/ReturTable.tsx', componentCode);
console.log('Done');
