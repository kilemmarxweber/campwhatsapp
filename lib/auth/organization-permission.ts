import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isAppAdminRole,
  normalizeOrgRole,
  organizationRoleStatements,
} from "@/lib/permissions";
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
  if (isAppAdminRole(session.user.role)) {
    return {
      session,
      membership: {
        role: "owner" as const,
        organizationId,
      },
    };
  }
  const membership = await getUserOrganizationMembership(
    session.user.id,
    organizationId,
  );
  if (!membership) {
    throw new Error("Accès succursale refusé");
  }
  return {
    session,
    membership: {
      role: normalizeOrgRole(membership.role),
      organizationId: membership.organizationId,
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
    select: { id: true, name: true, slug: true, logo: true },
  });
}
