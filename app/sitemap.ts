import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Pages publiques indexables. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
