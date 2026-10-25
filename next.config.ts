import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
    ],
    optimizeCss: false,
  },
  transpilePackages: [],
  serverExternalPackages: ["pg", "bcryptjs", "puppeteer", "puppeteer-core", "exceljs", "sharp"],
};

export default nextConfig;
