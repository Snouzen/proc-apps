type ShipmentChange = { itemId: string; pcsKirim: number };

/** Apply only server-confirmed PCS changes, preserving untouched items and PO metadata. */
export function applySavedShipment(po: any, changes: ShipmentChange[]) {
  const byId = new Map(changes.map(change => [change.itemId, change.pcsKirim]));
  const Items = (po.Items || []).map((item: any) => {
    const pcsKirim = byId.get(item.id);
    if (pcsKirim === undefined) return item;
    const discount = Number(item.discount || 0) / (Number(item.pcs) || 1) * pcsKirim;
    return { ...item, pcsKirim, rpTagih: Math.max(0, pcsKirim * Number(item.hargaPcs || 0) - discount) };
  });
  return { ...po, Items,
    pcsKirimTotal: Items.reduce((sum: number, item: any) => sum + (Number(item.pcsKirim) || 0), 0),
    totalKgKirim: Items.reduce((sum: number, item: any) => sum + (Number(item.pcsKirim) || 0) * (Number(item.Product?.satuanKg) || 1), 0),
    totalTagihan: Items.reduce((sum: number, item: any) => sum + (Number(item.rpTagih) || 0), 0),
  };
}
