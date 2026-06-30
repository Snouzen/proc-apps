const fs = require('fs');
const path = 'D:/Projects/proc-apps/src/app/retur/components/ReturTable.tsx';
let content = fs.readFileSync(path, 'utf-8');

const newCell = `cell: ({ row, table }) => {
        const meta = table.options.meta as any;
        const { editingId, isMassEditing, massEditForms, editForm, role, handleFieldChange, handleSaveInline, handleCancelEdit, handleStartEdit, handleDelete, units, userArea, userRegional, isFetchingPage, filteredLokasi, setSearchLokasi, filteredTujuanItems, activeIndex, setActiveIndex, handleTujuanKeyDown, filteredToko, searchToko, setSearchToko, filteredInisial, searchInisial, setSearchInisial, isInisialOpen, setIsInisialOpen, products, searchProduk, setSearchProduk, filteredProductsInline, filteredPembebanan, searchPembebanan, setSearchPembebanan, formatDate, formatNumber, formatIDR } = meta;`;

content = content.replace(/cell:\s*\(\{\s*row\s*\}\)\s*=>\s*\{/g, newCell);

const metaProp = `      <DataTableV2
        meta={{ editingId, isMassEditing, massEditForms, editForm, role, handleFieldChange, handleSaveInline, handleCancelEdit, handleStartEdit, handleDelete, units, userArea, userRegional, isFetchingPage, filteredLokasi, setSearchLokasi, filteredTujuanItems, activeIndex, setActiveIndex, handleTujuanKeyDown, filteredToko, searchToko, setSearchToko, filteredInisial, searchInisial, setSearchInisial, isInisialOpen, setIsInisialOpen, products, searchProduk, setSearchProduk, filteredProductsInline, filteredPembebanan, searchPembebanan, setSearchPembebanan, formatDate, formatNumber, formatIDR }}
        columns={columns}`;

content = content.replace(/<DataTableV2\s*\r?\n\s*columns=\{columns\}/, metaProp);

content = content.replace(/\]\,\s*\[[\s\S]*?\]\)\;/g, '], []);');

fs.writeFileSync(path, content, 'utf-8');
console.log('Done Node!');
