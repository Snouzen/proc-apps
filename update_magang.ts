import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from "./src/lib/prisma";

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: "magang@bulog.co.id" },
      data: { email: "adminsales1@bulog.co.id" },
    });
    console.log("User updated:", user.email);
  } catch (error) {
    console.error("Error updating user:", error);
  } finally {
    process.exit(0);
  }
}

main();
