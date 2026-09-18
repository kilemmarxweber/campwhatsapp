import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { KlamboClient } from "@/lib/klambo/client";

export async function getKlamboClientForOrg(organizationId: string) {
  const settings = await prisma.organizationKlambo.findUnique({
    where: { organizationId },
  });
  if (!settings?.apiKeyEnc) {
    throw new Error(
      "Clé API Klambo non configurée. Allez dans Paramètres → Klambo.",
    );
  }
  const apiKey = decryptSecret(settings.apiKeyEnc);
  return {
    client: new KlamboClient(apiKey, settings.baseUrl),
    settings,
  };
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
