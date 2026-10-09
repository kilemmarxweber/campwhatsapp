/**
 * Identité publique & SEO — nom distinctif pour Google.
 * « Campagnes » seul est trop générique ; on ancre la marque Klambocore.
 */
export const SITE = {
  /** Nom commercial complet (title / Open Graph / schema.org). */
  name: "Klambocore Campagnes",
  /** Nom produit court (UI, header). */
  shortName: "Campagnes",
  /** Éditeur / société. */
  publisher: "Klambocore",
  /** Accroche SEO (≤ ~60 car. pour title context). */
  tagline: "WhatsApp & SMS pour entreprises",
  description:
    "Klambocore Campagnes : plateforme d’envoi WhatsApp et SMS pour entreprises. Contacts, templates, médias, campagnes multicanales et rapports de diffusion.",
  keywords: [
    "Klambocore",
    "Klambocore Campagnes",
    "campagne WhatsApp",
    "campagne SMS",
    "envoi WhatsApp entreprise",
    "marketing SMS",
    "diffusion messages clients",
    "plateforme campagnes RDC",
    "Infobip WhatsApp",
  ],
  locale: "fr_CD",
  language: "fr",
} as const;

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_SITE_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (fromEnv) {
    const withProtocol = /^https?:\/\//i.test(fromEnv)
      ? fromEnv
      : `https://${fromEnv}`;
    return withProtocol.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
