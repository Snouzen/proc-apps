/**
 * Script to update password for RM Regional 1 Bandung
 * Run: npx tsx scratch/update-password.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  // Find the RM user for Regional 1 Bandung
  const users = await prisma.user.findMany({
    where: {
      role: "rm",
      regional: { contains: "1", mode: "insensitive" },
    },
  });

  console.log("Found users:", users.map((u: any) => ({ id: u.id, email: u.email, role: u.role, regional: u.regional })));

  if (users.length === 0) {
    console.log("No RM user found for regional 1. Listing all RM users...");
    const allRm = await prisma.user.findMany({ where: { role: "rm" } });
    console.log("All RM users:", allRm.map((u: any) => ({ id: u.id, email: u.email, regional: u.regional })));
    process.exit(1);
  }

  const newPassword = "EpsteinBotak123";
  const hashed = await bcrypt.hash(newPassword, 12);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed } as any,
    });
    console.log(`✅ Password updated for: ${user.email} (regional: ${user.regional})`);
  }

  console.log("\nDone! New password: EpsteinBotak123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
