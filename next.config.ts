import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Next's default is webp-only. Offering AVIF first cuts the landing
    // page's image payload substantially at equivalent visual quality; the
    // optimizer sends `Vary: Accept`, so browsers without AVIF still get WebP.
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  async redirects() {
    // The library page was renamed from "vault" to "files"; keep old links,
    // bookmarks and login `next=` targets working.
    return [
      { source: "/dashboard/vault", destination: "/dashboard/files", permanent: true },
      { source: "/dashboard/vault/:path*", destination: "/dashboard/files/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
