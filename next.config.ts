import type { NextConfig } from "next";

// Cache Components / Partial Prefetching are built for mostly-static sites
// with cached data fetches. Every page here is per-request dynamic (session
// cookie + tenant-scoped RLS queries), so those modes fight the app instead
// of helping it — left off rather than wrapping every route in Suspense.
const nextConfig: NextConfig = {};

export default nextConfig;
