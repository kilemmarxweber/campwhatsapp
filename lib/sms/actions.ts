"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { assertCanEditTenantChannels } from "@/lib/auth/tenant-channel-access";
import { encryptSecret } from "@/lib/crypto";
import { verifyTwilioSmsAccount } from "@/lib/sms/client";
import { getTwilioSmsConfig, getTwilioSmsCredentials } from "@/lib/sms/config";
import {
  assertTwilioAccountSid,
  assertTwilioAuthToken,
  assertTwilioFromNumber,
} from "@/lib/sms/validate";

export async function saveTwilioSmsSettings(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  accountSid: string;
  authToken?: string;
  fromNumber: string;
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

  const existing = await getTwilioSmsConfig(tenant.id);
  let accountSid: string;
  let fromNumber: string;
  try {
    accountSid = assertTwilioAccountSid(input.accountSid);
    fromNumber = assertTwilioFromNumber(input.fromNumber);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Paramètres invalides",
    };
  }

  const tokenInput = input.authToken?.trim() ?? "";
  let authToken = tokenInput;
  try {
    if (tokenInput) {
      authToken = assertTwilioAuthToken(tokenInput);
    } else if (existing?.authTokenEnc) {
      authToken = (await getTwilioSmsCredentials(tenant.id)).authToken;
    } else {
      return {
        ok: false,
        message: "Collez un Auth Token pour la première configuration",
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Auth Token invalide",
    };
  }

  try {
    await verifyTwilioSmsAccount({ accountSid, authToken, fromNumber });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Compte Twilio refusé : ${msg}` };
  }

  const authTokenEnc = tokenInput
    ? encryptSecret(authToken)
    : existing!.authTokenEnc;

  await prisma.twilioSmsConfig.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      accountSid,
      authTokenEnc,
      fromNumber,
    },
    update: {
      accountSid,
      authTokenEnc,
      fromNumber,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sms");
  revalidatePath(`/organisations/${tenant.slug}`);
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}
