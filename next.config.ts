import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Cache Components / Partial Prefetching off — they were stacking
  // previous routes in the DOM (duplicate headers/nav) and breaking tab clicks.
  // Standalone only for Docker/Railway/Render images (DOCKER_BUILD=1).
  // Local / Cursor `next start` stays on the default build layout.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
  ],
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
