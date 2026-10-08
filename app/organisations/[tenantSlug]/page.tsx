import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGovernanceContext } from "@/lib/auth/governance";
import { AddSuccursaleButton } from "@/components/create-succursale-form";
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
          <div>
            <h1 className="text-2xl font-semibold text-primary">{tenant.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez une succursale pour ouvrir son tableau de bord.
            </p>
          </div>
        </div>
        <AddSuccursaleButton tenantId={tenant.id} />
      </div>

      <Card className="py-0">
        {tenant.branches.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Aucune succursale. Ajoutez la première avec le bouton Ajouter.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tenant.branches.map((branch) => (
              <li key={branch.id}>
                <Link
                  href={`/o/${branch.slug}`}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/70"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{branch.name}</p>
                    <p className="truncate text-sm text-muted-foreground">/{branch.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{branch._count.members} membres</span>
                    <span className="hidden sm:inline">{branch._count.contacts} contacts</span>
                    <span>{branch._count.campaigns} campagnes</span>
                    <ChevronRightIcon className="size-4" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
