import Link from "next/link";
import prisma from "@/lib/prisma";
import { CreateSuccursaleForm } from "@/components/create-succursale-form";
import { isKlamboConfigured } from "@/lib/klambo/org";

export default async function AdminSuccursalesPage() {
  const [orgs, klamboOk] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { members: true, contacts: true, campaigns: true },
        },
      },
    }),
    isKlamboConfigured(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Succursales
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Chaque site gère ses campagnes WhatsApp de façon indépendante. La
          connexion API est partagée (
          <Link href="/admin/klambo" className="text-[var(--tvs-blue)] underline">
            WhatsApp
          </Link>
          ).
        </p>
      </div>

      {!klamboOk ? (
        <div className="surface border-[var(--tvs-red)] p-4">
          <p className="font-medium text-[var(--tvs-blue-deep)]">
            WhatsApp non configuré
          </p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Configurez la clé Klambo au siège avant d&apos;envoyer des
            campagnes.
          </p>
          <Link href="/admin/klambo" className="btn btn-brand mt-3">
            Configurer WhatsApp
          </Link>
        </div>
      ) : null}

      <CreateSuccursaleForm />

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Succursale</th>
              <th>Membres</th>
              <th>Contacts</th>
              <th>Campagnes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-[var(--fg-muted)]">
                  Aucune succursale — créez la première ci-dessus.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id}>
                  <td>
                    <p className="font-medium">{org.name}</p>
                    <p className="font-mono text-xs text-[var(--fg-muted)]">
                      /{org.slug}
                    </p>
                  </td>
                  <td>{org._count.members}</td>
                  <td>{org._count.contacts}</td>
                  <td>{org._count.campaigns}</td>
                  <td className="text-right">
                    <Link href={`/o/${org.slug}`} className="btn btn-ghost">
                      Ouvrir
                    </Link>
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
