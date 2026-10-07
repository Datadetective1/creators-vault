import type { MetadataRoute } from "next";

/** Public pages are indexable; signed-in areas and APIs are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/admin", "/auth/"] }],
    sitemap: "https://www.creatorlock.app/sitemap.xml",
  };
}
