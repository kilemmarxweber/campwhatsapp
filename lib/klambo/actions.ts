"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encryptSecret, maskApiKey, decryptSecret } from "@/lib/crypto";
import { isAppAdminRole } from "@/lib/permissions";
import { getKlamboDefaults } from "@/lib/klambo/env";
import { registerKlamboWebhook } from "@/lib/klambo/provision";
import { KLAMBO_CONFIG_ID } from "@/lib/klambo/org";

async function requireAppAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAppAdminRole(session.user.role)) {
    throw new Error("Réservé aux administrateurs siège");
  }
  return session;
}

export async function saveKlamboSettings(input: {
  apiKey?: string;
  baseUrl?: string;
  defaultCountry?: string;
}) {
  await requireAppAdmin();

  const defaults = getKlamboDefaults();
  const existing = await prisma.klamboConfig.findUnique({
    where: { id: KLAMBO_CONFIG_ID },
  });

  const apiKeyInput = input.apiKey?.trim() ?? "";
  let apiKeyEnc = existing?.apiKeyEnc ?? "";
  let apiKeyForWebhook: string | null = null;

  if (apiKeyInput) {
    if (!apiKeyInput.startsWith("sk_")) {
      throw new Error("La clé API doit commencer par sk_test_ ou sk_live_");
    }
    apiKeyEnc = encryptSecret(apiKeyInput);
    apiKeyForWebhook = apiKeyInput;
  } else if (!existing?.apiKeyEnc) {
    throw new Error("Collez une clé API pour la première configuration");
  } else {
    apiKeyForWebhook = decryptSecret(existing.apiKeyEnc);
  }

  const baseUrl =
    input.baseUrl?.trim() || existing?.baseUrl || defaults.baseUrl;
  const defaultCountry =
    input.defaultCountry?.trim().toUpperCase() ||
    existing?.defaultCountry ||
    defaults.defaultCountry;

  await prisma.klamboConfig.upsert({
    where: { id: KLAMBO_CONFIG_ID },
    create: {
      id: KLAMBO_CONFIG_ID,
      apiKeyEnc,
      baseUrl,
      defaultCountry,
    },
    update: {
      apiKeyEnc,
      baseUrl,
      defaultCountry,
    },
  });

  if (apiKeyForWebhook) {
    await registerKlamboWebhook(apiKeyForWebhook, baseUrl);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/klambo");
  revalidatePath("/admin/succursales");
}

export async function getKlamboSettingsMasked() {
  await requireAppAdmin();
  const row = await prisma.klamboConfig.findUnique({
    where: { id: KLAMBO_CONFIG_ID },
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
    configured: true,
  };
}
