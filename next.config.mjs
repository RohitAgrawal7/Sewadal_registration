/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // Keep jspdf in the main client graph — dynamic chunks were resolving to /_next/undefined.
  transpilePackages: ["jspdf", "jspdf-autotable"],
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Prefer browser builds; avoids broken Node canvas stubs in the client bundle.
        canvg: false,
        html2canvas: false,
        dompurify: false,
      };
    }
    return config;
  },
};

export default nextConfig;
