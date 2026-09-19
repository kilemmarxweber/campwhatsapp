import prisma from "@/lib/prisma";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import { getKlamboDefaults } from "@/lib/klambo/env";
import { KlamboSettingsForm } from "@/components/klambo-settings-form";

export default async function AdminKlamboPage() {
  const row = await prisma.klamboConfig.findUnique({
    where: { id: "default" },
  });
  const defaults = getKlamboDefaults();

  let apiKey = "";
  let apiKeyMasked: string | null = null;
  let apiKeyCorrupt = false;
  if (row?.apiKeyEnc) {
    try {
      apiKey = decryptSecret(row.apiKeyEnc);
      apiKeyMasked = maskApiKey(apiKey);
    } catch {
      apiKey = "";
      apiKeyMasked = null;
      apiKeyCorrupt = true;
    }
  }

  const appUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  const webhookEndpoint = `${appUrl.replace(/\/$/, "")}/api/webhooks/klambo`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          WhatsApp
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Connexion Klambo partagée par toutes les succursales.
        </p>
      </div>
      {apiKeyCorrupt ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          La clé API enregistrée ne peut plus être déchiffrée (secret
          d&apos;encryption modifié). Collez à nouveau la clé Klambo et
          enregistrez.
        </p>
      ) : null}
      <KlamboSettingsForm
        webhookEndpoint={webhookEndpoint}
        initial={{
          apiKey,
          apiKeyMasked,
          baseUrl: row?.baseUrl ?? defaults.baseUrl,
          defaultCountry: row?.defaultCountry ?? defaults.defaultCountry,
          hasWebhookSecret: Boolean(row?.webhookSecret),
          configured: Boolean(apiKey) && !apiKeyCorrupt,
        }}
      />
    </div>
  );
}
