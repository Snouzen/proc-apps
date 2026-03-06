import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Fallback ke DATABASE_URL jika DIRECT_URL tidak tersedia (mis. di Vercel)
    url: (env("DIRECT_URL") || env("DATABASE_URL")) as string,
  },
});
