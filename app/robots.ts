import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Indexe uniquement le public ; bloque les zones authentifiées. */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/auth/",
          "/dashboard",
          "/organisations",
          "/admin/",
          "/o/",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
