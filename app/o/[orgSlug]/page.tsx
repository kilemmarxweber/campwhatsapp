import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { isAppAdminRole } from "@/lib/permissions";
import { isKlamboConfigured } from "@/lib/klambo/org";

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const isSiege = isAppAdminRole(session?.user?.role);

  const [contacts, campaigns, media, klamboOk] = await Promise.all([
    prisma.contact.count({ where: { organizationId: org.id } }),
    prisma.campaign.count({ where: { organizationId: org.id } }),
    prisma.mediaAsset.count({ where: { organizationId: org.id } }),
    isKlamboConfigured(),
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
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Vue d&apos;ensemble
        </h1>
        <p className="text-[var(--fg-muted)]">Succursale {org.name}</p>
      </div>

      {!klamboOk && (
        <div className="surface border-[var(--tvs-red)] p-4">
          <p className="font-medium text-[var(--tvs-blue-deep)]">
            WhatsApp non configuré
          </p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            La clé API Klambo doit être configurée au siège pour envoyer des
            campagnes.
          </p>
          {isSiege ? (
            <Link href="/admin/klambo" className="btn btn-brand mt-3">
              Configurer WhatsApp
            </Link>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Contacts", value: contacts, href: `/o/${orgSlug}/contacts` },
          {
            label: "Campagnes",
            value: campaigns,
            href: `/o/${orgSlug}/campaigns`,
          },
          { label: "Médias", value: media, href: `/o/${orgSlug}/media` },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="surface p-5 transition hover:border-[var(--accent)]"
          >
            <p className="text-sm text-[var(--fg-muted)]">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--tvs-blue)]">
              {s.value}
            </p>
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
            <p className="p-6 text-[var(--fg-muted)]">
              Aucune campagne pour l&apos;instant.
            </p>
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
