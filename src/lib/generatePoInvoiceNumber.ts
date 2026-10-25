export async function withTransactionRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err: any) {
      const isTransient =
        err?.code === "P2034" || // Transaction conflict
        err?.code === "P2002" || // Unique constraint violation (collision race)
        err?.message?.includes("deadlock") ||
        err?.message?.includes("could not serialize access") ||
        err?.message?.includes("conflict") ||
        err?.message?.includes("advisory");
      if (attempt >= maxRetries || !isTransient) {
        throw err;
      }
      const backoff = delayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

export async function ensureInvoiceNumber(tx: any, poData: any, tglkirim: Date): Promise<string> {
  if (poData.noFaktur) return poData.noFaktur; // already has one

  const mm = String(tglkirim.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = tglkirim.getUTCFullYear();

  // Fetch UnitProduksi to get kodeRegional
  const unit = poData.unitProduksiId
    ? await tx.unitProduksi.findUnique({
        where: { idRegional: poData.unitProduksiId }
      })
    : null;
  
  // Default region code to 27100 if not found
  const kodeRegional = unit?.kodeRegional || "27100";

  const suffix = `/${mm}/${yyyy}/${kodeRegional}`;
  const lockKey = `faktur_${suffix}`;

  // Strictly enforce numbering lock inside transaction without swallowing errors
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

  const existingPos = await tx.purchaseOrder.findMany({
    where: {
      noFaktur: { endsWith: suffix }
    },
    select: { noFaktur: true }
  });

  let maxSeq = 0;
  for (const po of existingPos) {
    if (po.noFaktur) {
      const parts = po.noFaktur.split('/');
      const seqNum = parseInt(parts[0], 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${String(nextSeq).padStart(3, '0')}/${mm}/${yyyy}/${kodeRegional}`;

  // Application-level uniqueness guard within transaction
  let collision = await tx.purchaseOrder.findFirst({
    where: { noFaktur: candidate },
    select: { id: true },
  });
  while (collision) {
    nextSeq++;
    candidate = `${String(nextSeq).padStart(3, '0')}/${mm}/${yyyy}/${kodeRegional}`;
    collision = await tx.purchaseOrder.findFirst({
      where: { noFaktur: candidate },
      select: { id: true },
    });
  }

  return candidate;
}
