import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
  organizationRoleStatements,
  ORG_ROLE,
} from "@/lib/permissions";
import {
  emptyBusinessPermission,
  serializePermission,
  type PermissionMatrix,
} from "@/lib/roles/permission-matrix";

export type { PermissionMatrix };
export {
  serializePermission,
  parsePermission,
  emptyBusinessPermission,
} from "@/lib/roles/permission-matrix";

function systemRolePermission(slug: string): PermissionMatrix {
  const stmt = organizationRoleStatements[slug];
  if (!stmt) return emptyBusinessPermission();
  const out: PermissionMatrix = {};
  for (const [resource, actions] of Object.entries(stmt)) {
    if (Array.isArray(actions)) {
      out[resource] = [...actions];
    }
  }
  return out;
}

export async function seedSystemGlobalRoles() {
  const systems = [
    {
      slug: ORG_ROLE.OWNER,
      name: "Propriétaire",
      description: "Contrôle total de la succursale",
      permission: systemRolePermission(ORG_ROLE.OWNER),
    },
    {
      slug: ORG_ROLE.ADMIN,
      name: "Administrateur",
      description: "Gestion opérationnelle de la succursale",
      permission: systemRolePermission(ORG_ROLE.ADMIN),
    },
    {
      slug: ORG_ROLE.USER,
      name: "Utilisateur",
      description: "Création et envoi de campagnes",
      permission: systemRolePermission(ORG_ROLE.USER),
    },
  ];

  for (const role of systems) {
    await prisma.globalRole.upsert({
      where: { slug: role.slug },
      create: {
        slug: role.slug,
        name: role.name,
        description: role.description,
        permission: serializePermission(role.permission),
        isSystem: true,
      },
      update: {
        name: role.name,
        description: role.description,
        permission: serializePermission(role.permission),
        isSystem: true,
      },
    });
  }
}

/** Répercute un rôle global sur toutes les succursales (OrganizationRole). */
export async function syncGlobalRoleToAllOrgs(slug: string) {
  const global = await prisma.globalRole.findUnique({ where: { slug } });
  if (!global) return;

  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    await upsertOrgRole(org.id, global.slug, global.permission);
  }
}

export async function syncAllGlobalRolesToOrg(organizationId: string) {
  const roles = await prisma.globalRole.findMany();
  for (const role of roles) {
    await upsertOrgRole(organizationId, role.slug, role.permission);
  }
}

async function upsertOrgRole(
  organizationId: string,
  role: string,
  permission: string,
) {
  const existing = await prisma.organizationRole.findFirst({
    where: { organizationId, role },
  });
  if (existing) {
    await prisma.organizationRole.update({
      where: { id: existing.id },
      data: { permission, updatedAt: new Date() },
    });
    return;
  }
  await prisma.organizationRole.create({
    data: {
      id: randomUUID().replace(/-/g, "").slice(0, 32),
      organizationId,
      role,
      permission,
      createdAt: new Date(),
    },
  });
}

export async function listAssignableRoleSlugs(): Promise<
  { slug: string; name: string }[]
> {
  const roles = await prisma.globalRole.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });
  if (roles.length > 0) return roles;
  return [
    { slug: ORG_ROLE.OWNER, name: "Propriétaire" },
    { slug: ORG_ROLE.ADMIN, name: "Administrateur" },
    { slug: ORG_ROLE.USER, name: "Utilisateur" },
  ];
}
