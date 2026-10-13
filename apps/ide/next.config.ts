import { homedir } from "node:os";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace packages export TypeScript source.
  transpilePackages: [
    "@repo/ant-grammar",
    "@repo/ant-runtime",
    "@repo/ant-file",
    "@repo/ant-tasks",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // The global pnpm virtual store lives under the home directory, outside the repository.
    root: homedir(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
