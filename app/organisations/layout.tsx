import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGovernanceLevel } from "@/lib/auth/governance";
import { isAppAdminRole } from "@/lib/permissions";
import { AppHeader } from "@/components/app-header";

export default async function OrganisationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const level = await getGovernanceLevel(session.user.id, session.user.role);
  if (!level) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <AppHeader
        title="Organisations"
        subtitle={level === "owner" ? "Propriétaire" : "Administrateur"}
        homeHref="/organisations"
        showOrganisationsLink
        showSiegeLink={isAppAdminRole(session.user.role)}
        contextLabel={level === "owner" ? "Toutes les organisations" : "Votre organisation"}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: level === "owner" ? "propriétaire" : "administrateur",
        }}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
