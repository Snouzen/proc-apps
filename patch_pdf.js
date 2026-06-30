const fs = require('fs');
const path = 'D:/Projects/proc-apps/src/lib/generateRekonPdf.ts';
let content = fs.readFileSync(path, 'utf-8');

const rtvTableRegex = /hookData\.cell\.styles\.fillColor = \[254, 226, 226\];\s*\/\/ rose-100\n\s*\}\n\s*\},\n\s*\}\);/g;
const match = rtvTableRegex.exec(content);

if (match) {
  const insertIndex = match.index + match[0].length;
  
  const rekapCode = `

    // ─── Rekap Transfer Move ───
    if (item.rtvs && item.rtvs.length > 0) {
      const transferMoveMap: Record<string, { origin: string, dest: string, product: string, qty: number }> = {};
      (item.rtvs || []).forEach((rtv: any) => {
        const refInv = typeof rtv === "object" ? rtv.refInvoice : "-";
        const relatedInv = (item.invoices || []).find((inv: any) => inv.noInvoice === refInv);
        const unitProduksi = relatedInv?.siteArea || relatedInv?.unitProduksi || "-";
        const lokasi = typeof rtv === "object" ? (rtv.lokasiBarang || "-") : "-";
        const produk = typeof rtv === "object" ? (rtv.produk || "-") : "-";
        const pcs = typeof rtv === "object" ? (Number(rtv.qty) || Number(rtv.qtyReturn) || 0) : 0;
        
        if (pcs > 0) {
          const key = \`\${unitProduksi}_\${lokasi}_\${produk}\`;
          if (!transferMoveMap[key]) {
            transferMoveMap[key] = { origin: unitProduksi, dest: lokasi, product: produk, qty: 0 };
          }
          transferMoveMap[key].qty += pcs;
        }
      });

      const tmValues = Object.values(transferMoveMap);
      if (tmValues.length > 0) {
        nextY = (doc as any).lastAutoTable.finalY + 10;
        
        // Cek halaman baru jika sisa ruang sedikit
        if (nextY > pageHeight - 40) {
          doc.addPage();
          nextY = 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(139, 92, 246); // violet-500
        doc.text(\`REKAP TRANSFER MOVE (\${tmValues.length})\`, 14, nextY);
        doc.setTextColor(0, 0, 0);

        const tmBody = tmValues.map((tm, i) => [
          String(i + 1),
          tm.origin,
          tm.dest,
          tm.product,
          \`\${tm.qty} pcs\`
        ]);

        autoTable(doc, {
          startY: nextY + 3,
          head: [["#", "Asal (Unit Produksi)", "Tujuan (Lokasi Barang)", "Produk", "Total Qty"]],
          body: tmBody,
          theme: "striped",
          styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
          headStyles: {
            fontStyle: "bold",
            fillColor: [139, 92, 246], // violet-500
            textColor: [255, 255, 255],
          },
          columnStyles: {
            0: { halign: "center", cellWidth: 10 },
            1: { cellWidth: 60 },
            2: { cellWidth: 60 },
            3: { cellWidth: 110 },
            4: { halign: "right", cellWidth: 27 },
          },
        });
      }
    }`;
    
  content = content.slice(0, insertIndex) + rekapCode + content.slice(insertIndex);
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Done inserting Rekap Transfer Move!');
} else {
  console.log('Regex match not found');
}
