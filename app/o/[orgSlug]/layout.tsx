import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  requireOrgMembership,
} from "@/lib/auth/organization-permission";
import { getGovernanceLevel } from "@/lib/auth/governance";
import { isAppAdminRole } from "@/lib/permissions";
import { OrgFrame } from "@/components/org-frame";
import { normalizeAppearance } from "@/lib/appearance";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const governance = await getGovernanceLevel(session.user.id, session.user.role);
  if (org.archivedAt || org.tenant?.archivedAt) {
    redirect(governance ? "/organisations" : "/dashboard");
  }

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

  return (
    <OrgFrame
      appearance={normalizeAppearance(org.tenant)}
      orgSlug={orgSlug}
      title={org.name}
      subtitle={org.tenant?.name ?? "Organisation"}
      homeHref={governance ? "/organisations" : "/dashboard"}
      showOrganisationsLink={Boolean(governance)}
      showSiegeLink={isSiege}
      contextLabel={org.tenant ? `${org.tenant.name} · ${org.name}` : org.name}
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }}
    >
      {children}
    </OrgFrame>
  );
}
