import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { decryptSecret, maskApiKey } from "@/lib/crypto";
import { KlamboSettingsForm } from "@/components/klambo-settings-form";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const row = await prisma.organizationKlambo.findUnique({
    where: { organizationId: org.id },
  });

  let apiKeyMasked: string | null = null;
  if (row) {
    try {
      apiKeyMasked = maskApiKey(decryptSecret(row.apiKeyEnc));
    } catch {
      apiKeyMasked = "••••••••";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-[var(--fg-muted)]">
          Connexion API d&apos;envoi WhatsApp
        </p>
      </div>
      <KlamboSettingsForm
        organizationId={org.id}
        orgSlug={orgSlug}
        initial={{
          apiKeyMasked,
          baseUrl: row?.baseUrl ?? "https://whatsapp-api.klambocore.com",
          defaultCountry: row?.defaultCountry ?? "CD",
        }}
      />
    </div>
  );
}
