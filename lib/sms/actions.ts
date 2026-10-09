"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { assertCanEditTenantChannels } from "@/lib/auth/tenant-channel-access";
import { encryptSecret } from "@/lib/crypto";
import { verifyInfobipAccount } from "@/lib/sms/client";
import { getSmsConfig, getSmsCredentials } from "@/lib/sms/config";
import {
  assertInfobipApiKey,
  assertInfobipBaseUrl,
  assertInfobipSender,
} from "@/lib/sms/validate";

export async function saveSmsSettings(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  apiKey?: string;
  baseUrl: string;
  sender: string;
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
    select: { id: true, slug: true },
  });
  if (!tenant) {
    return { ok: false, message: "Organisation introuvable" };
  }

  const existing = await getSmsConfig(tenant.id);
  let baseUrl: string;
  let sender: string;
  try {
    baseUrl = assertInfobipBaseUrl(input.baseUrl);
    sender = assertInfobipSender(input.sender);
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
      apiKey = (await getSmsCredentials(tenant.id)).apiKey;
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
    await verifyInfobipAccount({ apiKey, baseUrl, scope: "sms" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Compte Infobip refusé : ${msg}` };
  }

  const apiKeyEnc = keyInput ? encryptSecret(apiKey) : existing!.apiKeyEnc;

  await prisma.infobipSmsConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      apiKeyEnc,
      baseUrl,
      sender,
    },
    update: {
      apiKeyEnc,
      baseUrl,
      sender,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sms");
  revalidatePath(`/organisations/${tenant.slug}`);
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}
