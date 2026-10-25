import prisma from "@/lib/prisma";

export async function attachSummary(rows: any[]) {
  const ids = rows.map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return rows;

  const hasItemsIncluded =
    rows.length > 0 &&
    Array.isArray(rows[0].Items) &&
    rows[0].Items.length > 0 &&
    rows[0].Items[0].Product;

  let allItems: any[] = [];
  if (hasItemsIncluded) {
    allItems = rows.flatMap((r) =>
      r.Items.map((it: any) => ({ ...it, purchaseOrderId: r.id }))
    );
  } else {
    allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: { in: ids } },
      select: {
        id: true,
        purchaseOrderId: true,
        pcs: true,
        pcsKirim: true,
        nominal: true,
        rpTagih: true,
        hargaPcs: true,
        discount: true,
        createdAt: true,
        Product: { select: { name: true, satuanKg: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  const agg = new Map<string, any>();
  for (let i = 0; i < allItems.length; i++) {
    const it = allItems[i];
    const poId = String(it.purchaseOrderId);

    if (!agg.has(poId)) {
      agg.set(poId, {
        itemsCount: 0,
        totalNominal: 0,
        totalTagihan: 0,
        pcsTotal: 0,
        pcsKirimTotal: 0,
        totalDiscount: 0,
        totalKg: 0,
        totalKgKirim: 0,
        firstProductName: it.Product?.name || null,
        Items: [],
      });
    }

    const s = agg.get(poId);
    s.itemsCount += 1;
    s.totalNominal += Number(it.nominal) || 0;
    s.totalTagihan += Number(it.rpTagih) || 0;
    s.pcsTotal += Number(it.pcs) || 0;
    s.pcsKirimTotal += Number(it.pcsKirim) || 0;
    s.totalDiscount += Number(it.discount) || 0;

    const satuan = Number(it.Product?.satuanKg) || 1;
    s.totalKg += (Number(it.pcs) || 0) * satuan;
    s.totalKgKirim += (Number(it.pcsKirim) || 0) * satuan;

    s.Items.push({
      id: it.id,
      pcs: it.pcs,
      pcsKirim: it.pcsKirim,
      namaProduk: it.Product?.name,
      nominal: it.nominal,
      hargaPcs: it.hargaPcs,
      rpTagih: it.rpTagih,
      discount: it.discount,
      Product: it.Product,
    });
  }

  return rows.map((r) => {
    const s = agg.get(String(r.id)) || {
      itemsCount: 0,
      totalNominal: 0,
      totalTagihan: 0,
      pcsTotal: 0,
      pcsKirimTotal: 0,
      totalDiscount: 0,
      totalKg: 0,
      totalKgKirim: 0,
      firstProductName: null,
      Items: [],
    };
    return { ...r, ...s };
  });
}
