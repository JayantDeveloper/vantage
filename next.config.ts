import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Treat missing env vars as build errors in CI/production
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "https://vantage.vercel.app",
  },

  // Security: only allow images from known hosts
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },

  // Reduce bundle size in production
  experimental: {
    optimizePackageImports: ["@clerk/nextjs", "lucide-react"],
  },
};

export default nextConfig;
