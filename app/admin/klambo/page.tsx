import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function AdminKlamboPage() {
  const tenants = await prisma.tenantOrganization.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      klambo: { select: { id: true } },
      branches: {
        where: { archivedAt: null },
        orderBy: { name: "asc" },
        take: 1,
        select: { slug: true, name: true },
      },
      _count: { select: { branches: { where: { archivedAt: null } } } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          WhatsApp
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Chaque organisation a sa clé Klambo. On la saisit une fois dans les
          paramètres d&apos;une succursale, pour toutes les autres.
        </p>
      </div>
      <TenantChannelList
        tenants={tenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          configured: Boolean(tenant.klambo),
          branchCount: tenant._count.branches,
          href: tenant.branches[0]
            ? `/o/${tenant.branches[0].slug}/settings#whatsapp`
            : null,
          detail: tenant.branches[0]?.name,
        }))}
        empty="Aucune organisation."
      />
    </div>
  );
}

function TenantChannelList({
  tenants,
  empty,
}: {
  tenants: Array<{
    id: string;
    name: string;
    configured: boolean;
    branchCount: number;
    href: string | null;
    detail?: string;
  }>;
  empty: string;
}) {
  if (tenants.length === 0) {
    return <p className="surface p-6 text-sm text-[var(--fg-muted)]">{empty}</p>;
  }
  return (
    <ul className="surface divide-y divide-[var(--border)]">
      {tenants.map((tenant) => {
        const body = (
          <>
            <div>
              <p className="font-medium text-[var(--tvs-blue-deep)]">{tenant.name}</p>
              <p className="text-sm text-[var(--fg-muted)]">
                {tenant.branchCount === 1
                  ? "1 succursale"
                  : `${tenant.branchCount} succursales`}
                {tenant.detail ? ` · ${tenant.detail}` : ""}
              </p>
            </div>
            <span className={tenant.configured ? "badge badge-ok" : "badge badge-warn"}>
              {tenant.configured ? "Connecté" : "À configurer"}
            </span>
          </>
        );
        return (
          <li key={tenant.id}>
            {tenant.href ? (
              <Link
                href={tenant.href}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--tvs-blue-soft)]"
              >
                {body}
              </Link>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
