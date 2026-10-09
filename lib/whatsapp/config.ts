import prisma from "@/lib/prisma";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import { DEFAULT_INFOBIP_WHATSAPP_BASE_URL } from "@/lib/whatsapp/validate";

export type WhatsappProvider = "klambo" | "infobip";

export function normalizeWhatsappProvider(value: string | null | undefined): WhatsappProvider {
  return value === "infobip" ? "infobip" : "klambo";
}

export async function getWhatsappProvider(tenantId: string): Promise<WhatsappProvider> {
  const tenant = await prisma.tenantOrganization.findUnique({
    where: { id: tenantId },
    select: { whatsappProvider: true },
  });
  return normalizeWhatsappProvider(tenant?.whatsappProvider);
}

export async function getInfobipWhatsappConfig(tenantId: string) {
  return prisma.infobipWhatsappConfig.findUnique({ where: { tenantId } });
}

export async function isInfobipWhatsappConfigured(tenantId: string) {
  const row = await getInfobipWhatsappConfig(tenantId);
  return Boolean(row?.apiKeyEnc && row.baseUrl && row.fromNumber);
}

export async function getInfobipWhatsappCredentials(tenantId: string) {
  const settings = await getInfobipWhatsappConfig(tenantId);
  if (!settings?.apiKeyEnc || !settings.baseUrl || !settings.fromNumber) {
    throw new Error(
      "WhatsApp Infobip non configuré. Enregistrez sa clé API et son URL de base dans Paramètres.",
    );
  }
  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.apiKeyEnc);
  } catch (err) {
    throw new Error(
      "Clé API WhatsApp Infobip illisible. Ré-enregistrez-la dans Paramètres.",
      { cause: err },
    );
  }
  return {
    apiKey,
    baseUrl: settings.baseUrl,
    fromNumber: settings.fromNumber,
  };
}

export async function loadInfobipWhatsappFormState(tenantId: string) {
  const row = await getInfobipWhatsappConfig(tenantId);
  let apiKey = "";
  let apiKeyMasked: string | null = null;
  let keyCorrupt = false;
  if (row?.apiKeyEnc) {
    try {
      apiKey = decryptSecret(row.apiKeyEnc);
      apiKeyMasked = maskApiKey(apiKey);
    } catch {
      apiKey = "";
      apiKeyMasked = null;
      keyCorrupt = true;
    }
  }
  return {
    apiKey,
    apiKeyMasked,
    baseUrl: row?.baseUrl ?? DEFAULT_INFOBIP_WHATSAPP_BASE_URL,
    fromNumber: row?.fromNumber ?? "",
    configured: Boolean(apiKey && row?.baseUrl && row.fromNumber),
    keyCorrupt,
    provider: await getWhatsappProvider(tenantId),
  };
}
