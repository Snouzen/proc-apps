/*
  Warnings:

  - You are about to drop the column `hargaKg` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `hargaPcs` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `kg` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `multiplier` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `nominal` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pcs` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pcsKirim` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the column `rpTagih` on the `PurchaseOrder` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_productId_fkey";

-- DropIndex
DROP INDEX "UnitProduksi_namaRegional_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "satuanKg" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "hargaKg",
DROP COLUMN "hargaPcs",
DROP COLUMN "kg",
DROP COLUMN "multiplier",
DROP COLUMN "nominal",
DROP COLUMN "pcs",
DROP COLUMN "pcsKirim",
DROP COLUMN "productId",
DROP COLUMN "rpTagih",
ADD COLUMN     "regional" TEXT;
