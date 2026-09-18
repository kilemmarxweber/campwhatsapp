"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { encryptSecret, maskApiKey, decryptSecret } from "@/lib/crypto";

export async function saveKlamboSettings(input: {
  organizationId: string;
  orgSlug: string;
  apiKey: string;
  baseUrl?: string;
  defaultCountry?: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    klambo: ["update"],
  });

  const apiKey = input.apiKey.trim();
  if (!apiKey.startsWith("sk_")) {
    throw new Error("La clé API doit commencer par sk_test_ ou sk_live_");
  }

  await prisma.organizationKlambo.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      apiKeyEnc: encryptSecret(apiKey),
      baseUrl:
        input.baseUrl?.trim() || "https://whatsapp-api.klambocore.com",
      defaultCountry: input.defaultCountry?.trim() || "CD",
    },
    update: {
      apiKeyEnc: encryptSecret(apiKey),
      ...(input.baseUrl?.trim()
        ? { baseUrl: input.baseUrl.trim() }
        : {}),
      ...(input.defaultCountry?.trim()
        ? { defaultCountry: input.defaultCountry.trim() }
        : {}),
    },
  });

  revalidatePath(`/o/${input.orgSlug}/settings`);
}

export async function getKlamboSettingsMasked(organizationId: string) {
  await requireOrganizationPermission(organizationId, { klambo: ["read"] });
  const row = await prisma.organizationKlambo.findUnique({
    where: { organizationId },
  });
  if (!row) return null;
  let masked = "••••••••";
  try {
    masked = maskApiKey(decryptSecret(row.apiKeyEnc));
  } catch {
    masked = "••••••••";
  }
  return {
    baseUrl: row.baseUrl,
    defaultCountry: row.defaultCountry,
    apiKeyMasked: masked,
    hasWebhookSecret: Boolean(row.webhookSecret),
  };
}
