/** Defaults non-secrets pour préremplir le formulaire admin. */

export function getKlamboDefaults() {
  return {
    baseUrl:
      process.env.KLAMBO_BASE_URL?.trim() ||
      "https://whatsapp-api.klambocore.com",
    defaultCountry:
      process.env.KLAMBO_DEFAULT_COUNTRY?.trim().toUpperCase() || "CD",
  };
}
