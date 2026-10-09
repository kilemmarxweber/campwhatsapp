const INFOBIP_HOST = /^[a-z0-9-]+\.api\.infobip\.com$/i;

export const DEFAULT_INFOBIP_BASE_URL = "https://l2gerd.api.infobip.com";
export const DEFAULT_INFOBIP_SENDER = "ServiceSMS";

export function assertInfobipBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      "URL de base invalide. Exemple : https://l2gerd.api.infobip.com",
    );
  }
  const path = url.pathname.replace(/\/$/, "");
  if (
    url.protocol !== "https:" ||
    path !== "" ||
    url.search ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "L'URL de base doit être https://xxxx.api.infobip.com, sans chemin.",
    );
  }
  if (!INFOBIP_HOST.test(url.hostname)) {
    throw new Error("L'URL de base doit se terminer par .api.infobip.com.");
  }
  return `https://${url.hostname}`;
}

export function assertInfobipApiKey(value: string) {
  const key = value.trim().replace(/^app\s+/i, "");
  if (key.length < 8 || /\s/.test(key)) {
    throw new Error("Clé API Infobip invalide.");
  }
  return key;
}

/** Nom d'expéditeur Infobip (ServiceSMS) ou numéro international. */
export function assertInfobipSender(value: string) {
  const sender = value.trim();
  if (/^[A-Za-z][A-Za-z0-9]{2,10}$/.test(sender)) return sender;
  if (/^\+?[0-9]{8,15}$/.test(sender)) return sender.replace(/^\+/, "");
  throw new Error(
    "Expéditeur invalide. Utilisez un nom comme ServiceSMS, ou un numéro sans espaces.",
  );
}
