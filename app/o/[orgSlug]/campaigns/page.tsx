import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";

function statusBadge(status: string) {
  if (status === "completed" || status === "sent") return "badge badge-ok";
  if (status === "failed" || status === "cancelled") return "badge badge-err";
  if (status === "sending" || status === "scheduled") return "badge badge-warn";
  return "badge";
}

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { recipients: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Campagnes</h1>
          <p className="text-[var(--fg-muted)]">Envois WhatsApp groupés</p>
        </div>
        <Link href={`/o/${orgSlug}/campaigns/new`} className="btn btn-primary">
          Nouvelle campagne
        </Link>
      </div>

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Destinataires</th>
              <th>Créée</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-[var(--fg-muted)]">
                  Aucune campagne
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/o/${orgSlug}/campaigns/${c.id}`}
                      className="text-[var(--accent)]"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.messageType}</td>
                  <td>
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </td>
                  <td>{c._count.recipients}</td>
                  <td className="text-sm text-[var(--fg-muted)]">
                    {c.createdAt.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
