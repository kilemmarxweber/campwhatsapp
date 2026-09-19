import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { CampaignRowActions } from "@/components/campaign-row-actions";
import {
  getPageSize,
  parsePageParam,
  TablePagination,
} from "@/components/table-pagination";

function statusBadge(status: string) {
  if (status === "completed" || status === "sent") return "badge badge-ok";
  if (status === "failed" || status === "cancelled") return "badge badge-err";
  if (status === "sending" || status === "scheduled") return "badge badge-warn";
  return "badge";
}

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageRaw } = await searchParams;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const pageSize = getPageSize();
  const page = parsePageParam(pageRaw);
  const where = { organizationId: org.id };

  const totalItems = await prisma.campaign.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { recipients: true } },
    },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
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

      <div className="surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Destinataires</th>
              <th>Créée</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-[var(--fg-muted)]">
                  Aucune campagne
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/o/${orgSlug}/campaigns/${c.id}`}
                      className="font-medium text-[var(--tvs-blue)] hover:underline"
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
                  <td>
                    <CampaignRowActions
                      organizationId={org.id}
                      orgSlug={orgSlug}
                      campaignId={c.id}
                      status={c.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <TablePagination
          basePath={`/o/${orgSlug}/campaigns`}
          page={currentPage}
          totalItems={totalItems}
          label="campagnes"
        />
      </div>
    </div>
  );
}
