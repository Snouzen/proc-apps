const path = require("path");
// Use the existing server prisma singleton that already handles adapter & env
const prisma = require(path.join(__dirname, "..", "server", "lib", "prisma.js"));

async function main() {
  // Count candidates: PO with non-empty invoice and not completed
  const candidates = await prisma.purchaseOrder.count({
    where: {
      AND: [
        { noInvoice: { not: null } },
        { noInvoice: { not: "" } },
        { statusBayar: false },
      ],
    },
  });

  // Perform update
  const res = await prisma.purchaseOrder.updateMany({
    where: {
      AND: [
        { noInvoice: { not: null } },
        { noInvoice: { not: "" } },
        { statusBayar: false },
      ],
    },
    data: {
      statusInv: true,
      statusBayar: true,
      updatedAt: new Date(),
    },
  });

  console.log(
    JSON.stringify(
      {
        matched: candidates,
        updated: res.count,
        rule: "noInvoice not null/empty -> mark completed (statusBayar=true, statusInv=true)",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

