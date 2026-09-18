import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { CampaignForm } from "@/components/campaign-form";

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const [contacts, media, lists, templates] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: { id: true, phone: true, name: true, variables: true },
    }),
    prisma.mediaAsset.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, kind: true },
    }),
    prisma.contactList.findMany({
      where: { organizationId: org.id },
      include: { _count: { select: { members: true } } },
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, body: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Nouvelle campagne</h1>
        <p className="text-[var(--fg-muted)]">
          Message dynamique + audience + envoi Klambo
        </p>
      </div>
      <CampaignForm
        organizationId={org.id}
        orgSlug={orgSlug}
        contacts={contacts}
        media={media}
        lists={lists}
        templates={templates}
      />
    </div>
  );
}
