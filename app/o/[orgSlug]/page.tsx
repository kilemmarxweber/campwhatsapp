import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const [contacts, campaigns, media, klambo] = await Promise.all([
    prisma.contact.count({ where: { organizationId: org.id } }),
    prisma.campaign.count({ where: { organizationId: org.id } }),
    prisma.mediaAsset.count({ where: { organizationId: org.id } }),
    prisma.organizationKlambo.findUnique({
      where: { organizationId: org.id },
      select: { id: true },
    }),
  ]);

  const recent = await prisma.campaign.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      status: true,
      messageType: true,
      createdAt: true,
      _count: { select: { recipients: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Vue d&apos;ensemble</h1>
        <p className="text-[var(--fg-muted)]">
          Activité de {org.name}
        </p>
      </div>

      {!klambo && (
        <div className="surface border-[var(--tvs-red)] p-4">
          <p className="font-medium text-[var(--tvs-blue-deep)]">
            Configurez KlamboWhatsapp
          </p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Ajoutez votre clé API pour pouvoir envoyer des campagnes.
          </p>
          <Link href={`/o/${orgSlug}/settings`} className="btn btn-brand mt-3">
            Paramètres Klambo
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Contacts", value: contacts, href: `/o/${orgSlug}/contacts` },
          { label: "Campagnes", value: campaigns, href: `/o/${orgSlug}/campaigns` },
          { label: "Médias", value: media, href: `/o/${orgSlug}/media` },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="surface p-5 hover:border-[var(--accent)]">
            <p className="text-sm text-[var(--fg-muted)]">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Campagnes récentes</h2>
          <Link href={`/o/${orgSlug}/campaigns/new`} className="btn btn-primary">
            Nouvelle campagne
          </Link>
        </div>
        <div className="surface overflow-hidden">
          {recent.length === 0 ? (
            <p className="p-6 text-[var(--fg-muted)]">Aucune campagne pour l&apos;instant.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Destinataires</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
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
                      <span className="badge">{c.status}</span>
                    </td>
                    <td>{c._count.recipients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
