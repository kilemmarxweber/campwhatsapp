import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUserOrganizations } from "@/lib/auth/org-membership";
import { isAppAdminRole } from "@/lib/permissions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const orgs = await listUserOrganizations(session.user.id);
  const isSiege = isAppAdminRole(session.user.role);

  if (!isSiege && orgs.length === 1) {
    redirect(`/o/${orgs[0].slug}`);
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Succursales"
        subtitle={`Bonjour, ${session.user.name}`}
        showSiegeLink={isSiege}
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
              Choisir une succursale
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les campagnes WhatsApp du site sélectionné.
            </p>
          </div>
          {isSiege ? (
            <Button render={<Link href="/admin/succursales" />} nativeButton={false}>
              Nouvelle succursale
            </Button>
          ) : null}
        </div>

        {orgs.length === 0 ? (
          <div className="surface p-8 text-center text-muted-foreground">
            {isSiege ? (
              <>
                Aucune succursale.{" "}
                <Link href="/admin/succursales" className="text-primary underline">
                  Créez la première
                </Link>
                .
              </>
            ) : (
              <>
                Vous n’êtes membre d’aucune succursale. Demandez une invitation à
                votre administrateur.
              </>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orgs.map((org) => (
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
        )}
      </main>
    </div>
  );
}
