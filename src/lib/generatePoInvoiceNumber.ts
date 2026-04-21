import prisma from "@/lib/prisma";

export async function ensureInvoiceNumber(tx: any, poData: any, tglkirim: Date) {
    if (poData.noFaktur) return poData.noFaktur; // already has one

    const mm = String(tglkirim.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = tglkirim.getUTCFullYear();

    // Fetch UnitProduksi to get kodeRegional
    const unit = await tx.unitProduksi.findUnique({
        where: { idRegional: poData.unitProduksiId }
    });
    
    // Default region code to 27100 if not found
    const kodeRegional = unit?.kodeRegional || "27100";

    const count = await tx.purchaseOrder.count({
        where: {
            noFaktur: { not: null }
        }
    });

    const seq = String(count + 1).padStart(3, '0');
    return `${seq}/${mm}/${yyyy}/${kodeRegional}`;
}
