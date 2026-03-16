CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pcs" INTEGER NOT NULL,
    "pcsKirim" INTEGER NOT NULL,
    "hargaKg" DOUBLE PRECISION NOT NULL,
    "hargaPcs" DOUBLE PRECISION NOT NULL,
    "nominal" DOUBLE PRECISION NOT NULL,
    "rpTagih" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PurchaseOrderItem"
ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PurchaseOrderItem_purchaseOrderId_fkey'
  ) THEN
    ALTER TABLE "PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PurchaseOrderItem_productId_fkey'
  ) THEN
    ALTER TABLE "PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
