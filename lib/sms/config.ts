import prisma from "@/lib/prisma";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import {
  DEFAULT_INFOBIP_BASE_URL,
  DEFAULT_INFOBIP_SENDER,
} from "@/lib/sms/validate";

export async function getSmsConfig(tenantId: string) {
  return prisma.infobipSmsConfig.findUnique({
    where: { tenantId },
  });
}

export async function isSmsConfigured(tenantId: string) {
  const row = await getSmsConfig(tenantId);
  return Boolean(row?.apiKeyEnc && row.baseUrl && row.sender);
}

export async function isSmsConfiguredForBranch(organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return false;
  return isSmsConfigured(branch.tenantId);
}

export async function getSmsCredentials(tenantId: string) {
  const settings = await getSmsConfig(tenantId);
  if (!settings?.apiKeyEnc || !settings.baseUrl || !settings.sender) {
    throw new Error(
      "SMS Infobip non configuré pour cette organisation. Enregistrez la clé API et l'URL de base dans Paramètres.",
    );
  }
  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.apiKeyEnc);
  } catch (err) {
    throw new Error(
      "Clé API Infobip illisible. Ré-enregistrez-la dans Paramètres.",
      { cause: err },
    );
  }
  return {
    apiKey,
    baseUrl: settings.baseUrl,
    sender: settings.sender,
  };
}

export async function loadSmsFormState(tenantId: string) {
  const row = await getSmsConfig(tenantId);
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
    baseUrl: row?.baseUrl ?? DEFAULT_INFOBIP_BASE_URL,
    sender: row?.sender ?? DEFAULT_INFOBIP_SENDER,
    configured: Boolean(apiKey && row?.baseUrl && row.sender),
    keyCorrupt,
  };
}
