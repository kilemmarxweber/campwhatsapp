import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGovernanceLevel } from "@/lib/auth/governance";
import { listUserOrganizations } from "@/lib/auth/org-membership";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const level = await getGovernanceLevel(session.user.id, session.user.role);
  if (level) redirect("/organisations");

  const orgs = await listUserOrganizations(session.user.id);

  if (orgs.length === 1) {
    redirect(`/o/${orgs[0].slug}`);
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Succursales"
        subtitle={`Bonjour, ${session.user.name}`}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
      />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">
              Vos succursales
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ouvrez une succursale pour accéder à son tableau de bord.
            </p>
          </div>
        </div>

        {orgs.length === 0 ? (
          <div className="surface p-8 text-center text-muted-foreground">
            Vous n’êtes membre d’aucune succursale. Demandez une invitation à
            votre administrateur.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {Array.from(
              orgs.reduce((groups, org) => {
                const key = org.tenant?.id ?? "sans-organisation";
                const group = groups.get(key) ?? {
                  name: org.tenant?.name ?? "Organisation",
                  branches: [],
                };
                group.branches.push(org);
                groups.set(key, group);
                return groups;
              }, new Map<string, { name: string; branches: typeof orgs }>()),
            ).map(([tenantId, group]) => (
              <section key={tenantId} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.name}
                </h2>
                <ul className="flex flex-col gap-3">
                  {group.branches.map((org) => (
                    <li key={org.id}>
                      <Link
                        href={`/o/${org.slug}`}
                        className="surface flex items-center justify-between p-4 transition hover:border-primary"
                      >
                        <div>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Succursale
                          </p>
                          <p className="font-medium text-primary">{org.name}</p>
                          <p className="text-sm text-muted-foreground">/{org.slug}</p>
                        </div>
                        <span className="badge">{org.role}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
