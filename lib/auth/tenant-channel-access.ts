import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGovernanceContext } from "@/lib/auth/governance";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { isAppAdminRole } from "@/lib/permissions";

/** Siège, admin d'organisation, ou gestionnaire de la succursale. */
export async function assertCanEditTenantChannels(
  tenantId: string,
  organizationId?: string,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Non authentifié");
  if (isAppAdminRole(session.user.role)) return;

  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (access?.tenantIds.includes(tenantId)) return;

  if (!organizationId) {
    throw new Error("Réservé aux administrateurs de cette organisation");
  }

  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (branch?.tenantId !== tenantId) {
    throw new Error("Cette succursale n'appartient pas à l'organisation");
  }
  await requireOrganizationPermission(organizationId, { equipe: ["manage"] });
}
