import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGovernanceContext } from "@/lib/auth/governance";
import { AddSuccursaleButton } from "@/components/create-succursale-form";
import { RecordActions } from "@/components/record-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function OrganisationSuccursalesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (!access) redirect("/dashboard");

  const tenant = access.tenants.find((item) => item.slug === tenantSlug);
  if (!tenant) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link
            href="/organisations"
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Organisations
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-primary">{tenant.name}</h1>
            {tenant.archivedAt ? <Badge variant="outline">Archivée</Badge> : null}
            {access.level === "owner" ? (
              <RecordActions
                kind="organisation"
                id={tenant.id}
                name={tenant.name}
                slug={tenant.slug}
                archived={Boolean(tenant.archivedAt)}
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez une succursale pour ouvrir son tableau de bord.
          </p>
        </div>
        {tenant.archivedAt ? null : <AddSuccursaleButton tenantId={tenant.id} />}
      </div>

      <Card className="py-0">
        {tenant.branches.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {tenant.archivedAt
              ? "Aucune succursale. Restaurez l'organisation pour en ajouter."
              : "Aucune succursale. Ajoutez la première avec le bouton Ajouter."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {[...tenant.branches]
              .sort((a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)))
              .map((branch) => (
              <li key={branch.id} className="flex items-center justify-between gap-4 px-4 py-3">
                {branch.archivedAt ? (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-muted-foreground">{branch.name}</p>
                    <p className="truncate text-sm text-muted-foreground">/{branch.slug}</p>
                  </div>
                ) : (
                  <Link
                    href={`/o/${branch.slug}`}
                    className="min-w-0 flex-1 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    <p className="truncate font-medium text-foreground">{branch.name}</p>
                    <p className="truncate text-sm text-muted-foreground">/{branch.slug}</p>
                  </Link>
                )}
                <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
                  {branch.archivedAt ? <Badge variant="outline">Archivée</Badge> : null}
                  <span className="hidden sm:inline">{branch._count.members} membres</span>
                  <span className="hidden sm:inline">{branch._count.contacts} contacts</span>
                  <span>{branch._count.campaigns} campagnes</span>
                  <RecordActions
                    kind="succursale"
                    id={branch.id}
                    name={branch.name}
                    slug={branch.slug}
                    archived={Boolean(branch.archivedAt)}
                  />
                  {branch.archivedAt ? null : <ChevronRightIcon className="size-4" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
