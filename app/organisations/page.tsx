import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGovernanceContext } from "@/lib/auth/governance";
import { AddOrganizationButton } from "@/components/create-organization-form";
import { RecordActions } from "@/components/record-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OrganisationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (!access) redirect("/dashboard");

  const isOwner = access.level === "owner";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Organisations</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {isOwner
              ? "Ouvrez une organisation pour voir ses succursales."
              : "Ouvrez votre organisation pour choisir une succursale."}
          </p>
        </div>
        {isOwner ? <AddOrganizationButton /> : null}
      </div>

      {access.tenants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune organisation</CardTitle>
            <CardDescription>
              {isOwner
                ? "Ajoutez la première organisation avec le bouton ci-dessus."
                : "Aucune organisation ne vous est assignée. Demandez au propriétaire d’en créer une."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...access.tenants]
            .sort((a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)))
            .map((tenant) => {
            const count = tenant.branches.length;
            const label =
              count === 1 ? "1 succursale" : `${count} succursales`;
            return (
              <li key={tenant.id}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/organisations/${tenant.slug}`}
                        className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
                      >
                        {tenant.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>/{tenant.slug}</CardDescription>
                    <CardAction className="flex items-center gap-2">
                      {tenant.archivedAt ? <Badge variant="outline">Archivée</Badge> : null}
                      <Badge variant="secondary">{label}</Badge>
                      {isOwner ? (
                        <RecordActions
                          kind="organisation"
                          id={tenant.id}
                          name={tenant.name}
                          slug={tenant.slug}
                          archived={Boolean(tenant.archivedAt)}
                        />
                      ) : (
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      )}
                    </CardAction>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
