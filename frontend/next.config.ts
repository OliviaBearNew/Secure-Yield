import type { NextConfig } from "next";

// Derive basePath at build time from environment. In GitHub Actions we set
// NEXT_BASE_PATH to "" or "/<repo>" depending on whether the repo is
// <owner>.github.io. Locally it defaults to empty string.
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Enable static export so `next build` emits `out/` ready for GitHub Pages
  output: "export",
  // Ensure all asset URLs are prefixed correctly when hosted under a subpath
  basePath: basePath,
  assetPrefix: basePath || undefined,
  // Avoid Next/Image optimization on static hosting
  images: { unoptimized: true },
  // Trailing slashes help avoid 404s on GitHub Pages for directory indexes
  trailingSlash: true,
  // Note: Headers are not supported in static export mode (output: "export")
  // For GitHub Pages, headers must be configured at the hosting level if needed
};

export default nextConfig;

