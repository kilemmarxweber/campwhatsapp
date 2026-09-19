import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { MediaUpload } from "@/components/media-upload";
import { MediaThumb } from "@/components/media-thumb";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.length === 0 ? (
          <p className="text-[var(--fg-muted)]">Aucun média</p>
        ) : (
          assets.map((a) => (
            <div key={a.id} className="surface overflow-hidden p-3">
              <MediaThumb
                storagePath={a.storagePath}
                kind={a.kind}
                filename={a.filename}
              />
              <p className="mt-2 truncate text-sm font-medium">{a.filename}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {a.kind} · {(a.size / 1024).toFixed(1)} Ko ·{" "}
                {a.klamboMediaId ? "sur Klambo" : "local seulement"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
