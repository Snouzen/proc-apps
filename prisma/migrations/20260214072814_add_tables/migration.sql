-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "ritelId" TEXT NOT NULL,
    "unitProduksiId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "noPo" TEXT NOT NULL,
    "tglPo" TIMESTAMP(3) NOT NULL,
    "expiredTgl" TIMESTAMP(3),
    "linkPo" TEXT,
    "noInvoice" TEXT,
    "tujuanDetail" TEXT,
    "multiplier" INTEGER NOT NULL DEFAULT 5,
    "kg" DOUBLE PRECISION NOT NULL,
    "pcs" INTEGER NOT NULL,
    "pcsKirim" INTEGER NOT NULL,
    "hargaKg" DOUBLE PRECISION NOT NULL,
    "hargaPcs" DOUBLE PRECISION NOT NULL,
    "nominal" DOUBLE PRECISION NOT NULL,
    "rpTagih" DOUBLE PRECISION NOT NULL,
    "statusKirim" BOOLEAN NOT NULL DEFAULT false,
    "statusSdif" BOOLEAN NOT NULL DEFAULT false,
    "statusPo" BOOLEAN NOT NULL DEFAULT false,
    "statusFp" BOOLEAN NOT NULL DEFAULT false,
    "statusKwi" BOOLEAN NOT NULL DEFAULT false,
    "statusInv" BOOLEAN NOT NULL DEFAULT false,
    "statusTagih" BOOLEAN NOT NULL DEFAULT false,
    "statusBayar" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ritel_modern" (
    "id" TEXT NOT NULL,
    "namaPt" TEXT NOT NULL,
    "inisial" TEXT,
    "tujuan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ritel_modern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitProduksi" (
    "idRegional" TEXT NOT NULL,
    "namaRegional" TEXT NOT NULL,
    "siteArea" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitProduksi_pkey" PRIMARY KEY ("idRegional")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_noPo_key" ON "PurchaseOrder"("noPo");

-- CreateIndex
CREATE UNIQUE INDEX "UnitProduksi_namaRegional_key" ON "UnitProduksi"("namaRegional");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_ritelId_fkey" FOREIGN KEY ("ritelId") REFERENCES "ritel_modern"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_unitProduksiId_fkey" FOREIGN KEY ("unitProduksiId") REFERENCES "UnitProduksi"("idRegional") ON DELETE RESTRICT ON UPDATE CASCADE;
