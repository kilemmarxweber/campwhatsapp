import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { MediaUpload } from "@/components/media-upload";

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
          Images et vidéos pour les campagnes
        </p>
      </div>
      <MediaUpload organizationId={org.id} orgSlug={orgSlug} />
      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Fichier</th>
              <th>Type</th>
              <th>Taille</th>
              <th>Klambo</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-[var(--fg-muted)]">
                  Aucun média
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.filename}</td>
                  <td>{a.kind}</td>
                  <td>{(a.size / 1024).toFixed(1)} Ko</td>
                  <td>{a.klamboMediaId ? "uploadé" : "local"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
