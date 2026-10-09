import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#0b4f8a",
    lang: SITE.language,
    categories: ["business", "productivity", "marketing"],
  };
}
