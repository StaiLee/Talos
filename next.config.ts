import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["camoufox", "playwright-core", "exceljs", "pdfkit"],
};

export default nextConfig;
