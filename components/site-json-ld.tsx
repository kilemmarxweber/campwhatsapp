import { absoluteUrl, SITE } from "@/lib/site";

/** Données structurées Schema.org pour Google. */
export function SiteJsonLd() {
  const url = absoluteUrl("/");
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: SITE.publisher,
        url,
        brand: {
          "@type": "Brand",
          name: SITE.name,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: SITE.name,
        description: SITE.description,
        publisher: { "@id": `${url}/#organization` },
        inLanguage: SITE.language,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#app`,
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/OnlineOnly",
        },
        featureList: [
          "Campagnes WhatsApp",
          "Campagnes SMS",
          "Contacts et groupes",
          "Templates multimédia",
          "Rapports d’envoi",
        ],
        provider: { "@id": `${url}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
