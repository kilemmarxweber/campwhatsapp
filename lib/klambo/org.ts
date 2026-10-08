import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { KlamboClient } from "@/lib/klambo/client";

export async function getKlamboConfig(tenantId: string) {
  return prisma.klamboConfig.findUnique({
    where: { tenantId },
  });
}

export async function isKlamboConfigured(tenantId: string) {
  const row = await getKlamboConfig(tenantId);
  return Boolean(row?.apiKeyEnc);
}

export async function isKlamboConfiguredForBranch(organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return false;
  return isKlamboConfigured(branch.tenantId);
}

export async function getDefaultCountryForBranch(organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return "CD";
  const row = await getKlamboConfig(branch.tenantId);
  return row?.defaultCountry || "CD";
}

export async function getKlamboClient(tenantId: string) {
  const settings = await getKlamboConfig(tenantId);
  if (!settings?.apiKeyEnc) {
    throw new Error(
      "Clé API Klambo non configurée. Ouvrez Paramètres d'une succursale de cette organisation.",
    );
  }
  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.apiKeyEnc);
  } catch (err) {
    throw new Error(
      "Clé API Klambo illisible. Ré-enregistrez-la dans Paramètres.",
      { cause: err },
    );
  }
  return {
    client: new KlamboClient(apiKey, settings.baseUrl),
    settings,
    apiKey,
  };
}

export async function getKlamboClientForBranch(organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) {
    throw new Error("Succursale introuvable");
  }
  return getKlamboClient(branch.tenantId);
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
