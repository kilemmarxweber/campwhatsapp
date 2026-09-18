import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { KlamboClient } from "@/lib/klambo/client";

export const KLAMBO_CONFIG_ID = "default";

export async function getKlamboConfig() {
  return prisma.klamboConfig.findUnique({
    where: { id: KLAMBO_CONFIG_ID },
  });
}

export async function isKlamboConfigured() {
  const row = await getKlamboConfig();
  return Boolean(row?.apiKeyEnc);
}

export async function getKlamboClient() {
  const settings = await getKlamboConfig();
  if (!settings?.apiKeyEnc) {
    throw new Error(
      "Clé API Klambo non configurée. Allez dans Siège → WhatsApp.",
    );
  }
  const apiKey = decryptSecret(settings.apiKeyEnc);
  return {
    client: new KlamboClient(apiKey, settings.baseUrl),
    settings,
    apiKey,
  };
}

/** @deprecated Use getKlamboClient — la clé est globale. */
export async function getKlamboClientForOrg(_organizationId: string) {
  return getKlamboClient();
}

export function verifyKlamboSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
