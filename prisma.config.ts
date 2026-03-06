import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Untuk migrasi gunakan koneksi langsung (DIRECT_URL)
    url: env("DIRECT_URL"),
  },
});
