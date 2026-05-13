import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    optimizeCss: false,
  },
  transpilePackages: [],
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
