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

  const templates = await prisma.messageTemplate.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, body: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-[var(--fg-muted)]">
          Messages réutilisables avec variables
        </p>
      </div>
      <TemplatesClient
        organizationId={org.id}
        orgSlug={orgSlug}
        templates={templates}
      />
    </div>
  );
}
