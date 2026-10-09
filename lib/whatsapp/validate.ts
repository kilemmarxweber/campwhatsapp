export const DEFAULT_INFOBIP_WHATSAPP_BASE_URL = "https://l2gerd.api.infobip.com";

export function assertWhatsappFrom(value: string) {
  const digits = value.trim().replace(/^\+/, "").replace(/\s/g, "");
  if (!/^[0-9]{8,15}$/.test(digits)) {
    throw new Error(
      "Numéro expéditeur invalide. Exemple : 447860088970.",
    );
  }
  return digits;
}

export function assertWhatsappTemplateName(value: string) {
  const name = value.trim();
  if (!name) return null;
  if (!/^[a-z0-9_]{1,512}$/.test(name)) {
    throw new Error(
      "Le nom du modèle Infobip utilise des minuscules, des chiffres et des _.",
    );
  }
  return name;
}

export function assertWhatsappLanguage(value: string) {
  const language = value.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(language)) {
    throw new Error("La langue du modèle est un code sur 2 lettres, par exemple en.");
  }
  return language;
}
