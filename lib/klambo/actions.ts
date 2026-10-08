"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { assertCanEditTenantChannels } from "@/lib/auth/tenant-channel-access";
import { KlamboClient } from "@/lib/klambo/client";
import { getKlamboDefaults } from "@/lib/klambo/env";
import { registerKlamboWebhook } from "@/lib/klambo/provision";
import { getKlamboConfig } from "@/lib/klambo/org";

async function assertKlamboKeyWorks(apiKey: string, baseUrl: string) {
  const client = new KlamboClient(apiKey, baseUrl);
  try {
    await client.getProject();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401") || /Invalid API key/i.test(msg)) {
      const isProdHost = /klambocore\.com/i.test(baseUrl);
      const isTestKey = apiKey.startsWith("sk_test_");
      throw new Error(
        isProdHost && isTestKey
          ? "Clé rejetée (401). Une clé sk_test_ ne marche pas sur whatsapp-api.klambocore.com — créez une sk_live_ dans la console, ou pointez la Base URL vers votre API locale."
          : `Clé rejetée par ${baseUrl} (401). Vérifiez la clé et la Base URL (même environnement).`,
      );
    }
    throw new Error(`Impossible de joindre Klambo (${baseUrl}): ${msg}`);
  }
}

export async function saveKlamboSettings(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  apiKey?: string;
  baseUrl?: string;
  defaultCountry?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await assertCanEditTenantChannels(input.tenantId, input.organizationId);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Accès refusé",
    };
  }

  const tenant = await prisma.tenantOrganization.findUnique({
    where: { id: input.tenantId },
    select: { id: true },
  });
  if (!tenant) return { ok: false, message: "Organisation introuvable" };

  const defaults = getKlamboDefaults();
  const existing = await getKlamboConfig(tenant.id);

  const apiKeyInput = input.apiKey?.trim() ?? "";
  let apiKeyEnc = existing?.apiKeyEnc ?? "";
  let apiKeyForWebhook: string | null = null;

  try {
    if (apiKeyInput) {
      if (!apiKeyInput.startsWith("sk_")) {
        return {
          ok: false,
          message: "La clé API doit commencer par sk_test_ ou sk_live_",
        };
      }
      apiKeyEnc = encryptSecret(apiKeyInput);
      apiKeyForWebhook = apiKeyInput;
    } else if (!existing?.apiKeyEnc) {
      return {
        ok: false,
        message: "Collez une clé API pour la première configuration",
      };
    } else {
      apiKeyForWebhook = decryptSecret(existing.apiKeyEnc);
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Clé API illisible",
    };
  }

  const baseUrl = input.baseUrl?.trim() || existing?.baseUrl || defaults.baseUrl;
  const defaultCountry =
    input.defaultCountry?.trim().toUpperCase() ||
    existing?.defaultCountry ||
    defaults.defaultCountry;

  if (!apiKeyForWebhook) {
    return { ok: false, message: "Clé API manquante" };
  }

  try {
    await assertKlamboKeyWorks(apiKeyForWebhook, baseUrl);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Clé Klambo refusée",
    };
  }

  await prisma.klamboConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
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

  await registerKlamboWebhook(tenant.id, apiKeyForWebhook, baseUrl);

  revalidatePath("/admin");
  revalidatePath("/admin/klambo");
  revalidatePath(`/o/${input.orgSlug}/settings`);
  revalidatePath(`/o/${input.orgSlug}`);
  return { ok: true };
}
