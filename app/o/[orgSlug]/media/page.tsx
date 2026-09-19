import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { MediaUpload } from "@/components/media-upload";
import { MediaLibrary } from "@/components/media-library";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const assets = await prisma.mediaAsset.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      kind: true,
      size: true,
      storagePath: true,
      klamboMediaId: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Médias</h1>
        <p className="text-[var(--fg-muted)]">
          Stockés dans UPLOAD_DIR (api-uploads), poussés vers Klambo via POST
          /v1/media
        </p>
      </div>
      <MediaUpload organizationId={org.id} orgSlug={orgSlug} />
      <MediaLibrary
        organizationId={org.id}
        orgSlug={orgSlug}
        assets={assets}
      />
    </div>
  );
}
