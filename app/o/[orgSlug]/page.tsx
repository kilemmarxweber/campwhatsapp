import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { isKlamboConfigured } from "@/lib/klambo/org";
import { getOrganizationMessageStats } from "@/lib/campaigns/message-stats";
import { OverviewMessageCharts } from "@/components/overview-message-charts";
import { OverviewStatCards } from "@/components/overview-stat-cards";

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const [contacts, campaigns, media, klamboOk, messageStats] =
    await Promise.all([
      prisma.contact.count({ where: { organizationId: org.id } }),
      prisma.campaign.count({ where: { organizationId: org.id } }),
      prisma.mediaAsset.count({ where: { organizationId: org.id } }),
      org.tenant ? isKlamboConfigured(org.tenant.id) : Promise.resolve(false),
      getOrganizationMessageStats(org.id),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Vue d&apos;ensemble
        </h1>
        <p className="text-[var(--fg-muted)]">Succursale {org.name}</p>
      </div>

      {!klamboOk && (
        <div className="surface border-[var(--tvs-red)] p-4">
          <p className="font-medium text-[var(--tvs-blue-deep)]">
            WhatsApp non configuré
          </p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Enregistrez la clé Klambo dans les paramètres. Elle sert à toutes
            les succursales de l&apos;organisation.
          </p>
          <Link href={`/o/${orgSlug}/settings#whatsapp`} className="btn btn-brand mt-3">
            Configurer WhatsApp
          </Link>
        </div>
      )}

      <OverviewStatCards
        orgSlug={orgSlug}
        contacts={contacts}
        campaigns={campaigns}
        media={media}
      />

      <OverviewMessageCharts
        whatsapp={messageStats.whatsapp}
        sms={messageStats.sms}
      />
    </div>
  );
}
