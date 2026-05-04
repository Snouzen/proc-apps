const fs = require('fs');
const file = 'src/app/master-data/ritel-modern/page.tsx';
let data = fs.readFileSync(file, 'utf8');

if (!data.includes('getMeSync')) {
  data = data.replace('import { saveRitel } from "@/lib/api";', 'import { saveRitel } from "@/lib/api";\nimport { getMeSync } from "@/lib/me";');
}

if (!data.includes('const isRm = getMeSync()?.role === "rm";')) {
  data = data.replace('export default function RitelModernPage() {', 'export default function RitelModernPage() {\n  const isRm = getMeSync()?.role === "rm";');
}

data = data.replace(
  /<button\s+suppressHydrationWarning\s+onClick=\{\(\) => setOpenExcelBulk\(true\)\}[\s\S]*?<\/button>/,
  '{!isRm && (\n          $& \n        )}'
);

data = data.replace(
  /<button\s+onClick=\{\(\) => setDeleteCompany\(group\.namaPt\)\}[\s\S]*?<\/button>/,
  '{!isRm && (\n                    $&\n                  )}'
);

// 5. Hide Add Modal Logos
const addModalLogosRegex = /(<div className="grid grid-cols-2 gap-3">)([\s\S]*?)(<\/div>\s*<div className="flex gap-4 pt-4">)/;
data = data.replace(addModalLogosRegex, `$1\n                {!isRm && (<>\n$2\n                </>)}\n              $3`);

// 6. Hide Edit Modal Logos
const editModalLogosRegex = /(<div className="space-y-3">)([\s\S]*?)(<\/div>\s*<div className="flex justify-end gap-2 pt-2">)/;
data = data.replace(editModalLogosRegex, `$1\n                {!isRm && (<>\n$2\n                </>)}\n              $3`);

fs.writeFileSync(file, data);
console.log("Modifications applied successfully.");
