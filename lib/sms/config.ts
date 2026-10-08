import prisma from "@/lib/prisma";
import { decryptSecret, maskApiKey } from "@/lib/crypto";

export async function getTwilioSmsConfig(tenantId: string) {
  return prisma.twilioSmsConfig.findUnique({
    where: { tenantId },
  });
}

export async function isTwilioSmsConfigured(tenantId: string) {
  const row = await getTwilioSmsConfig(tenantId);
  return Boolean(row?.accountSid && row.authTokenEnc && row.fromNumber);
}

export async function isTwilioSmsConfiguredForBranch(organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return false;
  return isTwilioSmsConfigured(branch.tenantId);
}

export async function getTwilioSmsCredentials(tenantId: string) {
  const settings = await getTwilioSmsConfig(tenantId);
  if (!settings?.accountSid || !settings.authTokenEnc || !settings.fromNumber) {
    throw new Error(
      "SMS Twilio non configuré pour cette organisation. Ouvrez l'organisation et enregistrez son compte Twilio.",
    );
  }
  let authToken: string;
  try {
    authToken = decryptSecret(settings.authTokenEnc);
  } catch (err) {
    throw new Error(
      "Auth Token Twilio illisible. Ré-enregistrez-le sur l'organisation.",
      { cause: err },
    );
  }
  return {
    accountSid: settings.accountSid,
    authToken,
    fromNumber: settings.fromNumber,
  };
}

export async function loadTwilioSmsFormState(tenantId: string) {
  const row = await getTwilioSmsConfig(tenantId);
  let authToken = "";
  let authTokenMasked: string | null = null;
  let tokenCorrupt = false;
  if (row?.authTokenEnc) {
    try {
      authToken = decryptSecret(row.authTokenEnc);
      authTokenMasked = maskApiKey(authToken);
    } catch {
      authToken = "";
      authTokenMasked = null;
      tokenCorrupt = true;
    }
  }
  return {
    accountSid: row?.accountSid ?? "",
    authToken,
    authTokenMasked,
    fromNumber: row?.fromNumber ?? "",
    configured: Boolean(authToken && row?.accountSid && row.fromNumber),
    tokenCorrupt,
  };
}
