import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  requireOrgMembership,
} from "@/lib/auth/organization-permission";
import { getGovernanceLevel } from "@/lib/auth/governance";
import { isAppAdminRole } from "@/lib/permissions";
import { AppHeader } from "@/components/app-header";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  try {
    await requireOrgMembership(org.id);
  } catch {
    redirect("/dashboard");
  }

  await auth.api
    .setActiveOrganization({
      headers: await headers(),
      body: { organizationId: org.id },
    })
    .catch(() => undefined);

  const isSiege = isAppAdminRole(session.user.role);
  const governance = await getGovernanceLevel(session.user.id, session.user.role);
  const base = `/o/${orgSlug}`;

  return (
    <div className="min-h-screen">
      <AppHeader
        title={org.name}
        subtitle={org.tenant?.name ?? "Organisation"}
        homeHref={governance ? "/organisations" : "/dashboard"}
        showOrganisationsLink={Boolean(governance)}
        showSiegeLink={isSiege}
        contextLabel={
          org.tenant ? `${org.tenant.name} · ${org.name}` : org.name
        }
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
        navItems={[
          { href: base, label: "Vue d'ensemble" },
          { href: `${base}/contacts`, label: "Contacts" },
          { href: `${base}/campaigns`, label: "Campagnes" },
          { href: `${base}/media`, label: "Médias" },
          { href: `${base}/templates`, label: "Templates" },
          { href: `${base}/equipe`, label: "Équipe" },
          { href: `${base}/settings`, label: "Paramètres" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
