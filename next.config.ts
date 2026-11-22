import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Projektregeln stehen in AGENTS.md; Next.js soll dort keinen eigenen Block einfügen.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
