import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function AdminSmsPage() {
  const tenants = await prisma.tenantOrganization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      infobipSms: { select: { sender: true, baseUrl: true } },
      branches: {
        orderBy: { name: "asc" },
        take: 1,
        select: { slug: true },
      },
      _count: { select: { branches: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          SMS
        </h1>
        <p className="mt-1 text-[var(--fg-muted)]">
          Chaque organisation a sa clé Infobip. On la saisit une fois dans
          les paramètres d&apos;une succursale, pour toutes les autres.
        </p>
      </div>

      {tenants.length === 0 ? (
        <p className="surface p-6 text-sm text-[var(--fg-muted)]">
          Aucune organisation.
        </p>
      ) : (
        <ul className="surface divide-y divide-[var(--border)]">
          {tenants.map((tenant) => {
            const configured = Boolean(tenant.infobipSms);
            const href = tenant.branches[0]
              ? `/o/${tenant.branches[0].slug}/settings#sms`
              : null;
            const body = (
              <>
                <div>
                  <p className="font-medium text-[var(--tvs-blue-deep)]">
                    {tenant.name}
                  </p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    {tenant._count.branches === 1
                      ? "1 succursale"
                      : `${tenant._count.branches} succursales`}
                    {configured ? ` · ${tenant.infobipSms?.sender}` : ""}
                  </p>
                </div>
                <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
                  {configured ? "Connecté" : "À configurer"}
                </span>
              </>
            );
            return (
              <li key={tenant.id}>
                {href ? (
                  <Link
                    href={href}
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
      )}
    </div>
  );
}
