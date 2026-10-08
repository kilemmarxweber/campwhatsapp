import prisma from "@/lib/prisma";
import { isAppAdminRole } from "@/lib/permissions";
import {
  governanceLevel,
  visibleTenantIds,
  type GovernanceLevel,
} from "@/lib/auth/governance-rules";

export type GovernanceTenant = {
  id: string;
  name: string;
  slug: string;
  branches: Array<{
    id: string;
    name: string;
    slug: string;
    _count: { members: number; contacts: number; campaigns: number };
  }>;
};

export type GovernanceContext = {
  level: GovernanceLevel;
  tenantIds: string[];
  tenants: GovernanceTenant[];
};

const branchSelect = {
  id: true,
  name: true,
  slug: true,
  _count: { select: { members: true, contacts: true, campaigns: true } },
} as const;

async function loadRoleSignals(userId: string) {
  const [tenantMembers, branchMembers] = await Promise.all([
    prisma.tenantMember.findMany({
      where: { userId },
      select: { tenantId: true, role: true },
    }),
    prisma.member.findMany({
      where: { userId },
      select: {
        role: true,
        organization: { select: { tenantId: true } },
      },
    }),
  ]);
  return { tenantMembers, branchMembers };
}

function ownTenantIds(
  tenantMembers: Array<{ tenantId: string; role: string }>,
  branchMembers: Array<{ role: string; organization: { tenantId: string } }>,
) {
  const ids = new Set<string>();
  for (const membership of tenantMembers) {
    const role = membership.role.trim().toLowerCase();
    if (role === "owner" || role === "admin") ids.add(membership.tenantId);
  }
  for (const membership of branchMembers) {
    const role = membership.role.trim().toLowerCase();
    if (role === "owner" || role === "admin") {
      ids.add(membership.organization.tenantId);
    }
  }
  return [...ids];
}

export async function isPlatformOwner(
  userId: string,
  appRole: string | null | undefined,
) {
  if (isAppAdminRole(appRole)) return true;
  const { tenantMembers, branchMembers } = await loadRoleSignals(userId);
  return (
    governanceLevel({
      appRole,
      tenantRoles: tenantMembers.map((membership) => membership.role),
      branchRoles: branchMembers.map((membership) => membership.role),
    }) === "owner"
  );
}

export async function getGovernanceLevel(
  userId: string,
  appRole: string | null | undefined,
): Promise<GovernanceLevel | null> {
  if (isAppAdminRole(appRole)) return "owner";
  const { tenantMembers, branchMembers } = await loadRoleSignals(userId);
  return governanceLevel({
    appRole,
    tenantRoles: tenantMembers.map((membership) => membership.role),
    branchRoles: branchMembers.map((membership) => membership.role),
  });
}

export async function getGovernanceContext(
  userId: string,
  appRole: string | null | undefined,
): Promise<GovernanceContext | null> {
  const { tenantMembers, branchMembers } = await loadRoleSignals(userId);
  const level = governanceLevel({
    appRole,
    tenantRoles: tenantMembers.map((membership) => membership.role),
    branchRoles: branchMembers.map((membership) => membership.role),
  });
  if (!level) return null;

  const owned = ownTenantIds(tenantMembers, branchMembers);
  const tenants = await prisma.tenantOrganization.findMany({
    where: level === "owner" ? undefined : { id: { in: owned } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      branches: { orderBy: { name: "asc" }, select: branchSelect },
    },
  });
  const allIds = tenants.map((tenant) => tenant.id);
  const visibleIds = visibleTenantIds({
    level,
    allTenantIds: allIds,
    ownTenantIds: owned,
  });
  const visible = new Set(visibleIds);
  return {
    level,
    tenantIds: level === "owner" ? allIds : owned,
    tenants: tenants.filter((tenant) => visible.has(tenant.id)),
  };
}
