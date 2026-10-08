import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SettingsView } from "@/components/appearance-settings";
import { auth } from "@/lib/auth";
import {
  getOrganizationBySlug,
  requireOrganizationPermission,
} from "@/lib/auth/organization-permission";
import { isKlamboConfigured } from "@/lib/klambo/org";
import { isAppAdminRole } from "@/lib/permissions";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const isSiege = isAppAdminRole(session?.user?.role);
  const configured = await isKlamboConfigured();
  let canManage = false;
  try {
    await requireOrganizationPermission(org.id, { equipe: ["manage"] });
    canManage = true;
  } catch {
    canManage = false;
  }

  return (
    <SettingsView
      organizationId={org.id}
      orgSlug={orgSlug}
      canManage={canManage}
      configured={configured}
      isSiege={isSiege}
    />
  );
}
