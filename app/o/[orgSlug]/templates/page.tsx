import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { TemplatesClient } from "@/components/templates-client";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const [templates, media] = await Promise.all([
    prisma.messageTemplate.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
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
        media: { select: { id: true, filename: true, kind: true, storagePath: true } },
      },
    }),
    prisma.mediaAsset.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, kind: true, storagePath: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-[var(--fg-muted)]">
          Image, style du texte et liens — la campagne n&apos;ajoute qu&apos;un
          texte court
        </p>
      </div>
      <TemplatesClient
        organizationId={org.id}
        orgSlug={orgSlug}
        templates={templates}
        media={media}
      />
    </div>
  );
}
