const fs = require('fs');
const file = 'src/app/master-data/ritel-modern/page.tsx';
let data = fs.readFileSync(file, 'utf8');

const regex = /(<h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">\s*<Building2 size=\{22\} className="text-blue-600" \/>\s*\{modalMode === "addCompany" \? "Tambah Company Baru" : "Tambah Item"\}\s*<\/h3>[\s\S]*?<\/form>)\s*<form\s+onSubmit=\{\(e\) => e\.preventDefault\(\)\}\s+className="p-6 space-y-5"/;

// We need to delete the first form (the old one) which is between the heading and the new form.
// Actually, let's just find the entire block and replace it correctly.

const fullRegex = /(<h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">\s*<Building2 size=\{22\} className="text-blue-600" \/>\s*\{modalMode === "addCompany" \? "Tambah Company Baru" : "Tambah Item"\}\s*<\/h3>)([\s\S]*?)(<form\s+onSubmit=\{\(e\) => e\.preventDefault\(\)\}\s+className="p-6 space-y-5">)/;

// Let's print out what we found to be sure
const match = data.match(fullRegex);
if (match) {
  // We want to keep $1 (the heading) and $3 (the new form start), but delete $2 (the old form and close button)
  // Wait, the close button is IN $2!
  // <button onClick={() => setIsModalOpen(false)} ...><X size={20} /></button></div>
  // We MUST KEEP the close button!
}

// Let's do it safer. 
