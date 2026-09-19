import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { CampaignForm } from "@/components/campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ orgSlug: string; campaignId: string }>;
}) {
  const { orgSlug, campaignId } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: org.id },
    include: {
      recipients: { select: { contactId: true } },
    },
  });
  if (!campaign) notFound();
  if (campaign.status === "sending") {
    notFound();
  }

  const [contacts, media, lists, templates] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: { id: true, phone: true, name: true, variables: true },
    }),
    prisma.mediaAsset.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, kind: true, storagePath: true },
    }),
    prisma.contactList.findMany({
      where: { organizationId: org.id },
      include: { _count: { select: { members: true } } },
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        body: true,
        messageType: true,
        mediaId: true,
        link1Label: true,
        link1Url: true,
        link2Label: true,
        link2Url: true,
      },
    }),
  ]);

  const matchedTemplate =
    templates.find(
      (t) =>
        t.messageType === campaign.messageType &&
        t.mediaId === campaign.mediaId &&
        campaign.bodyTemplate.startsWith(t.body.trim()),
    ) ??
    templates.find(
      (t) =>
        t.messageType === campaign.messageType &&
        t.mediaId === campaign.mediaId,
    ) ??
    templates[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Modifier la campagne</h1>
        <p className="text-[var(--fg-muted)]">{campaign.name}</p>
      </div>
      <CampaignForm
        organizationId={org.id}
        orgSlug={orgSlug}
        contacts={contacts}
        media={media}
        lists={lists}
        templates={templates}
        initial={{
          id: campaign.id,
          name: campaign.name,
          bodyTemplate: campaign.bodyTemplate,
          messageType: campaign.messageType,
          mediaId: campaign.mediaId,
          contactListId: campaign.contactListId,
          contactIds: campaign.recipients.map((r) => r.contactId),
          templateId: matchedTemplate?.id,
        }}
      />
    </div>
  );
}
