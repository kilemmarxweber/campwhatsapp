import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isAppAdminRole,
  normalizeOrgRole,
  organizationRoleStatements,
} from "@/lib/permissions";
import { getUserOrganizationMembership } from "@/lib/auth/org-membership";

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
    throw new Error("Accès organisation refusé");
  }
  return {
    session,
    membership: {
      role: normalizeOrgRole(membership.role),
      organizationId: membership.organizationId,
    },
  };
}

function roleAllows(
  role: ReturnType<typeof normalizeOrgRole>,
  resource: string,
  action: string,
): boolean {
  const statements = organizationRoleStatements[role] as
    | PermissionMap
    | undefined;
  if (!statements) return false;
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
    // fallback matrice locale
  }

  const role = membership.role;
  for (const [resource, actions] of Object.entries(permission)) {
    for (const action of actions) {
      if (!roleAllows(role, resource, action)) {
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
