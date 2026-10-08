import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isAppAdminRole,
  normalizeOrgRole,
  organizationRoleStatements,
} from "@/lib/permissions";
import { isPlatformOwner } from "@/lib/auth/governance";
import { canAccessBranch } from "@/lib/auth/governance-rules";
import { getUserOrganizationMembership } from "@/lib/auth/org-membership";
import { parsePermission } from "@/lib/roles/permission-matrix";

type PermissionMap = Record<string, string[]>;

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Non authentifié");
  }
  return session;
}

export async function requireOrgMembership(organizationId: string) {
  const session = await requireSession();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, tenantId: true },
  });
  if (!organization?.tenantId) {
    throw new Error("Accès succursale refusé");
  }
  const membership = await getUserOrganizationMembership(
    session.user.id,
    organizationId,
  );
  const tenantMember = await prisma.tenantMember.findUnique({
    where: {
      tenantId_userId: {
        tenantId: organization.tenantId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });
  const platformOwner =
    isAppAdminRole(session.user.role) ||
    (await isPlatformOwner(session.user.id, session.user.role));
  const allowed = canAccessBranch({
    isPlatformOwner: platformOwner,
    tenantRole: tenantMember?.role ?? null,
    hasBranchMembership: Boolean(membership),
  });
  if (!allowed) {
    throw new Error("Accès succursale refusé");
  }
  if (platformOwner) {
    return {
      session,
      membership: {
        role: "owner" as const,
        organizationId,
      },
    };
  }
  const tenantRole = (tenantMember?.role ?? "").trim().toLowerCase();
  if (tenantRole === "owner" || tenantRole === "admin") {
    return {
      session,
      membership: {
        role: tenantRole === "owner" ? "owner" : "admin",
        organizationId,
      },
    };
  }
  return {
    session,
    membership: {
      role: normalizeOrgRole(membership?.role),
      organizationId,
    },
  };
}

async function resolveRoleStatements(
  organizationId: string,
  role: string,
): Promise<PermissionMap | null> {
  const builtIn = organizationRoleStatements[role] as PermissionMap | undefined;
  if (builtIn) return builtIn;

  const orgRole = await prisma.organizationRole.findFirst({
    where: { organizationId, role },
  });
  if (orgRole) return parsePermission(orgRole.permission);

  const global = await prisma.globalRole.findUnique({ where: { slug: role } });
  if (global) return parsePermission(global.permission);

  return null;
}

function statementsAllow(
  statements: PermissionMap,
  resource: string,
  action: string,
): boolean {
  const actions = statements[resource];
  return Array.isArray(actions) && actions.includes(action);
}

export async function requireOrganizationPermission(
  organizationId: string,
  permission: PermissionMap,
) {
  const { session, membership } = await requireOrgMembership(organizationId);

  if (isAppAdminRole(session.user.role)) {
    return { session, membership };
  }

  try {
    const ok = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        organizationId,
        permissions: permission,
      },
    });
    if (ok?.success) {
      return { session, membership };
    }
  } catch {
    // fallback matrice locale / catalogue siège
  }

  const statements = await resolveRoleStatements(
    organizationId,
    membership.role,
  );
  if (!statements) {
    throw new Error("Permission insuffisante");
  }

  for (const [resource, actions] of Object.entries(permission)) {
    for (const action of actions) {
      if (!statementsAllow(statements, resource, action)) {
        throw new Error("Permission insuffisante");
      }
    }
  }

  return { session, membership };
}

export async function getOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
}
