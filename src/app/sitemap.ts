import type { MetadataRoute } from "next";

const BASE = "https://www.creatorlock.app";
const PAGES = ["/", "/pricing", "/signup", "/login", "/terms", "/privacy", "/refunds"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${BASE}${path}`, changeFrequency: "monthly" }));
}
