"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { assertCanEditTenantChannels } from "@/lib/auth/tenant-channel-access";
import { encryptSecret } from "@/lib/crypto";
import { verifyInfobipAccount } from "@/lib/whatsapp/infobip-client";
import {
  getInfobipWhatsappConfig,
  getInfobipWhatsappCredentials,
  normalizeWhatsappProvider,
} from "@/lib/whatsapp/config";
import {
  assertInfobipApiKey,
  assertInfobipBaseUrl,
} from "@/lib/sms/validate";
import { assertWhatsappFrom } from "@/lib/whatsapp/validate";

async function assertTenantEditor(tenantId: string, organizationId: string) {
  try {
    await assertCanEditTenantChannels(tenantId, organizationId);
  } catch (err) {
    return err instanceof Error ? err.message : "Accès refusé";
  }
  const tenant = await prisma.tenantOrganization.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant) return "Organisation introuvable";
  return tenant;
}

export async function setWhatsappProvider(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  provider: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const tenant = await assertTenantEditor(input.tenantId, input.organizationId);
  if (typeof tenant === "string") return { ok: false, message: tenant };
  const provider = normalizeWhatsappProvider(input.provider);
  await prisma.tenantOrganization.update({
    where: { id: tenant.id },
    data: { whatsappProvider: provider },
  });
  revalidatePath("/admin");
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}

export async function saveInfobipWhatsappSettings(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  apiKey?: string;
  baseUrl: string;
  fromNumber: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const tenant = await assertTenantEditor(input.tenantId, input.organizationId);
  if (typeof tenant === "string") return { ok: false, message: tenant };

  const existing = await getInfobipWhatsappConfig(tenant.id);
  let baseUrl: string;
  let fromNumber: string;
  try {
    baseUrl = assertInfobipBaseUrl(input.baseUrl);
    fromNumber = assertWhatsappFrom(input.fromNumber);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Paramètres invalides",
    };
  }

  const keyInput = input.apiKey?.trim() ?? "";
  let apiKey = keyInput;
  try {
    if (keyInput) {
      apiKey = assertInfobipApiKey(keyInput);
    } else if (existing?.apiKeyEnc) {
      apiKey = (await getInfobipWhatsappCredentials(tenant.id)).apiKey;
    } else {
      return {
        ok: false,
        message: "Collez une clé API pour la première configuration",
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Clé API invalide",
    };
  }

  try {
    await verifyInfobipAccount({ apiKey, baseUrl, scope: "whatsapp" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Compte Infobip refusé : ${msg}` };
  }

  const apiKeyEnc = keyInput ? encryptSecret(apiKey) : existing!.apiKeyEnc;
  await prisma.infobipWhatsappConfig.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, apiKeyEnc, baseUrl, fromNumber },
    update: { apiKeyEnc, baseUrl, fromNumber },
  });

  revalidatePath("/admin");
  revalidatePath(`/organisations/${tenant.slug}`);
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}
