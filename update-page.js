const fs = require('fs');

let code = fs.readFileSync('src/app/retur/page.tsx', 'utf8');
const lines = code.split('\n');

// 1. Add imports at the top
const importStatement = `import { ReturFilterBar } from "./components/ReturFilterBar";
import { ReturGroupedView } from "./components/ReturGroupedView";
import { ReturTable } from "./components/ReturTable";
`;

let lastImportIndex = 0;
for(let i=0; i<lines.length; i++) {
  if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('dynamic(')) {
    lastImportIndex = i;
  }
}

lines.splice(lastImportIndex + 1, 0, importStatement);

// 2. Remove Custom Component definitions (approx lines 39 to 531)
// Let's find the exact start and end.
let startCustom = -1;
let endCustom = -1;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('// --- Custom Component: Smooth Date Picker ---')) {
    startCustom = i;
  }
  if (lines[i].includes('function ReturContent() {')) {
    endCustom = i;
    break;
  }
}

if (startCustom !== -1 && endCustom !== -1) {
  lines.splice(startCustom, endCustom - startCustom);
}

// 3. Replace the FilterBar area
let newCode = lines.join('\n');

const filterBarRegex = /\{\/\* ── Filter & Search ─────────────────────────────────────────────── \*\/\}.*?(?=\{\/\* ── Main Content Area ───────────────────────────────────────────── \*\/\})/s;

const filterBarReplacement = `{/* ── Filter & Search ─────────────────────────────────────────────── */}
      <ReturFilterBar
        search={search}
        setSearch={setSearch}
        isGroupedMode={isGroupedMode}
        total={total}
        totalQty={totalQty}
        totalNominal={totalNominal}
        formatNumber={formatNumber}
        formatIDR={formatIDR}
        selectedRetailerId={selectedRetailerId}
        filterInisial={filterInisial}
        setFilterInisial={setFilterInisial}
        filterToko={filterToko}
        setFilterToko={setFilterToko}
        filterLokasi={filterLokasi}
        setFilterLokasi={setFilterLokasi}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setPage}
        isMassEditing={isMassEditing}
        isSavingMass={isSavingMass}
        handleCancelMassEdit={handleCancelMassEdit}
        handleSaveMassEdit={handleSaveMassEdit}
        handleStartMassEdit={handleStartMassEdit}
        filterOptions={filterOptions}
        availableLocations={availableLocations}
      />\n\n      `;

newCode = newCode.replace(filterBarRegex, filterBarReplacement);

// 4. Replace the GroupedView and Table area
const mainContentRegex = /\{\/\* ── Main Content Area ───────────────────────────────────────────── \*\/\}.*?(?=\{\/\* ── BULK UPLOAD MODAL \(SWITCHABLE CONTROLLERS\) ─────────────────── \*\/\})/s;

const mainContentReplacement = `{/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="-mt-4">
        {isGroupedMode ? (
          <ReturGroupedView 
            loading={loading}
            data={data}
            role={role}
            handleDeleteGroup={handleDeleteGroup}
            setSelectedRetailerId={setSelectedRetailerId}
            setIsGroupedMode={setIsGroupedMode}
          />
        ) : (
          <ReturTable
            editingId={editingId}
            isMassEditing={isMassEditing}
            massEditForms={massEditForms}
            editForm={editForm}
            role={role}
            units={units}
            userArea={userArea}
            userRegional={userRegional}
            filteredLokasi={filteredLokasi}
            setSearchLokasi={setSearchLokasi}
            handleFieldChange={handleFieldChange}
            isListOpen={isListOpen}
            setIsListOpen={setIsListOpen}
            filteredTujuanItems={filteredTujuanItems}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            setEditForm={setEditForm}
            searchToko={searchToko}
            setSearchToko={setSearchToko}
            filteredToko={filteredToko}
            searchProduk={searchProduk}
            setSearchProduk={setSearchProduk}
            filteredProductsInline={filteredProductsInline}
            searchPembebanan={searchPembebanan}
            setSearchPembebanan={setSearchPembebanan}
            filteredPembebanan={filteredPembebanan}
            handleSaveInline={handleSaveInline}
            handleCancelEdit={handleCancelEdit}
            handleStartEdit={handleStartEdit}
            handleDelete={handleDelete}
            setViewDetailId={setViewDetailId}
            formatDate={formatDate}
            formatIDR={formatIDR}
            formatNumber={formatNumber}
            paginatedData={paginatedData}
            loading={loading}
            isFetchingPage={isFetchingPage}
            total={total}
            page={page}
            rowsPerPage={rowsPerPage}
            setPage={setPage}
            setRowsPerPage={setRowsPerPage}
            isGroupedMode={isGroupedMode}
            selectedDetail={selectedDetail}
            viewDetailId={viewDetailId}
            comboRef={comboRef}
            handleTujuanKeyDown={handleTujuanKeyDown}
          />
        )}
      </div>

      `;

newCode = newCode.replace(mainContentRegex, mainContentReplacement);

fs.writeFileSync('src/app/retur/page.tsx', newCode);
console.log('Update finished');
