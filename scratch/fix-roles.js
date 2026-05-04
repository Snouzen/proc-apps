const fs = require('fs'); 
const file = 'src/app/retur/page.tsx'; 
let data = fs.readFileSync(file, 'utf8'); 
data = data.replace(/isEditing && role === "pusat"/g, 'isEditing && (role === "pusat" || role === "sitearea")'); 
fs.writeFileSync(file, data);
console.log("Replaced successfully!");
