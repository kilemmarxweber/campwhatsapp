import { isAppAdminRole, normalizeOrgRole, ORG_ROLE } from "@/lib/permissions";

export const TENANT_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type GovernanceLevel = "owner" | "admin";

export function governanceLevel(input: {
  appRole: string | null | undefined;
  tenantRoles: Array<string | null | undefined>;
  branchRoles: Array<string | null | undefined>;
}): GovernanceLevel | null {
  const tenantRoles = input.tenantRoles.map((role) => (role ?? "").trim().toLowerCase());
  const branchRoles = input.branchRoles.map((role) => normalizeOrgRole(role));
  if (
    isAppAdminRole(input.appRole) ||
    tenantRoles.includes(TENANT_ROLE.OWNER) ||
    branchRoles.includes(ORG_ROLE.OWNER)
  ) {
    return "owner";
  }
  if (
    tenantRoles.includes(TENANT_ROLE.ADMIN) ||
    branchRoles.includes(ORG_ROLE.ADMIN)
  ) {
    return "admin";
  }
  return null;
}

export function canCreateOrganization(level: GovernanceLevel | null): boolean {
  return level === "owner";
}

export function canCreateBranchInTenant(input: {
  level: GovernanceLevel | null;
  tenantId: string;
  ownTenantIds: string[];
}): boolean {
  if (input.level === "owner") return true;
  if (input.level === "admin") return input.ownTenantIds.includes(input.tenantId);
  return false;
}

/** Le propriétaire voit toutes les organisations. L'administrateur, seulement les siennes. */
export function visibleTenantIds(input: {
  level: GovernanceLevel;
  allTenantIds: string[];
  ownTenantIds: string[];
}): string[] {
  if (input.level === "owner") return input.allTenantIds;
  const own = new Set(input.ownTenantIds);
  return input.allTenantIds.filter((id) => own.has(id));
}

export function canAccessBranch(input: {
  isPlatformOwner: boolean;
  tenantRole: string | null;
  hasBranchMembership: boolean;
}): boolean {
  if (input.isPlatformOwner) return true;
  const role = (input.tenantRole ?? "").trim().toLowerCase();
  if (role === TENANT_ROLE.OWNER || role === TENANT_ROLE.ADMIN) return true;
  return input.hasBranchMembership;
}

export function tenantRoleFromBranchRole(branchRole: string | null | undefined): string {
  const role = normalizeOrgRole(branchRole);
  if (role === ORG_ROLE.OWNER) return TENANT_ROLE.OWNER;
  if (role === ORG_ROLE.ADMIN) return TENANT_ROLE.ADMIN;
  return TENANT_ROLE.MEMBER;
}

const TENANT_ROLE_RANK: Record<string, number> = {
  [TENANT_ROLE.OWNER]: 3,
  [TENANT_ROLE.ADMIN]: 2,
  [TENANT_ROLE.MEMBER]: 1,
};

/** N'abaisse jamais un rôle organisation déjà plus élevé. */
export function mergeTenantRole(
  current: string | null | undefined,
  incoming: string,
): string {
  const currentRank = TENANT_ROLE_RANK[(current ?? "").trim().toLowerCase()] ?? 1;
  const incomingRank = TENANT_ROLE_RANK[incoming.trim().toLowerCase()] ?? 1;
  return incomingRank > currentRank ? incoming : (current ?? TENANT_ROLE.MEMBER);
}
