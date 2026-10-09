import { notFound } from "next/navigation";
import { SettingsView } from "@/components/appearance-settings";
import {
  getOrganizationBySlug,
  requireOrganizationPermission,
} from "@/lib/auth/organization-permission";
import { getKlamboDefaults } from "@/lib/klambo/env";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import { getKlamboConfig } from "@/lib/klambo/org";
import { isSmsConfigured, loadSmsFormState } from "@/lib/sms/config";
import {
  DEFAULT_INFOBIP_BASE_URL,
  DEFAULT_INFOBIP_SENDER,
} from "@/lib/sms/validate";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org?.tenant) notFound();

  let canManage = false;
  try {
    await requireOrganizationPermission(org.id, { equipe: ["manage"] });
    canManage = true;
  } catch {
    canManage = false;
  }

  const defaults = getKlamboDefaults();
  const klamboRow = await getKlamboConfig(org.tenant.id);
  let apiKey = "";
  let apiKeyMasked: string | null = null;
  let corrupt = false;
  if (canManage && klamboRow?.apiKeyEnc) {
    try {
      apiKey = decryptSecret(klamboRow.apiKeyEnc);
      apiKeyMasked = maskApiKey(apiKey);
    } catch {
      apiKey = "";
      apiKeyMasked = null;
      corrupt = true;
    }
  } else if (klamboRow?.apiKeyEnc) {
    apiKeyMasked = "••••••••";
  }

  const sms = canManage
    ? await loadSmsFormState(org.tenant.id)
    : {
        apiKey: "",
        apiKeyMasked: null,
        baseUrl: DEFAULT_INFOBIP_BASE_URL,
        sender: DEFAULT_INFOBIP_SENDER,
        configured: await isSmsConfigured(org.tenant.id),
        keyCorrupt: false,
      };

  const appUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";

  return (
    <SettingsView
      organizationId={org.id}
      orgSlug={orgSlug}
      tenantId={org.tenant.id}
      organizationName={org.tenant.name}
      canManage={canManage}
      webhookEndpoint={`${appUrl.replace(/\/$/, "")}/api/webhooks/klambo`}
      klambo={{
        apiKey,
        apiKeyMasked,
        baseUrl: klamboRow?.baseUrl ?? defaults.baseUrl,
        defaultCountry: klamboRow?.defaultCountry ?? defaults.defaultCountry,
        hasWebhookSecret: Boolean(klamboRow?.webhookSecret),
        configured: Boolean(klamboRow?.apiKeyEnc) && !corrupt,
        corrupt,
      }}
      sms={sms}
    />
  );
}
