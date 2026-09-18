"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAppAdminRole, ORG_ROLE } from "@/lib/permissions";
import {
  emptyBusinessPermission,
  parsePermission,
  seedSystemGlobalRoles,
  serializePermission,
  syncAllGlobalRolesToOrg,
  syncGlobalRoleToAllOrgs,
  type PermissionMatrix,
} from "@/lib/roles/sync";

async function requireAppAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAppAdminRole(session.user.role)) {
    throw new Error("Réservé aux administrateurs siège");
  }
  return session;
}

function slugifyRole(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function listGlobalRoles() {
  await requireAppAdmin();
  await seedSystemGlobalRoles();
  return prisma.globalRole.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

export async function upsertGlobalRole(input: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  permission: PermissionMatrix;
}) {
  await requireAppAdmin();
  await seedSystemGlobalRoles();

  const name = input.name.trim();
  if (!name) throw new Error("Nom requis");

  const slug = (input.slug?.trim() || slugifyRole(name)).toLowerCase();
  if (!slug) throw new Error("Slug invalide");

  const reserved = new Set<string>([
    ORG_ROLE.OWNER,
    ORG_ROLE.ADMIN,
    ORG_ROLE.USER,
  ]);

  if (input.id) {
    const existing = await prisma.globalRole.findUnique({
      where: { id: input.id },
    });
    if (!existing) throw new Error("Rôle introuvable");
    if (existing.isSystem) {
      // Système : on peut ajuster les permissions métier affichées mais pas le slug
      await prisma.globalRole.update({
        where: { id: existing.id },
        data: {
          name,
          description: input.description?.trim() || null,
          permission: serializePermission(input.permission),
        },
      });
      await syncGlobalRoleToAllOrgs(existing.slug);
    } else {
      await prisma.globalRole.update({
        where: { id: existing.id },
        data: {
          name,
          description: input.description?.trim() || null,
          permission: serializePermission(input.permission),
        },
      });
      await syncGlobalRoleToAllOrgs(existing.slug);
    }
  } else {
    if (reserved.has(slug)) {
      throw new Error("Ce slug est réservé à un rôle système");
    }
    const created = await prisma.globalRole.create({
      data: {
        slug,
        name,
        description: input.description?.trim() || null,
        permission: serializePermission(
          Object.keys(input.permission).length
            ? input.permission
            : emptyBusinessPermission(),
        ),
        isSystem: false,
      },
    });
    await syncGlobalRoleToAllOrgs(created.slug);
  }

  // Propager aussi sur les orgs qui n'avaient aucun rôle encore
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    await syncAllGlobalRolesToOrg(org.id);
  }

  revalidatePath("/admin/roles");
}

export async function deleteGlobalRole(id: string) {
  await requireAppAdmin();
  const role = await prisma.globalRole.findUnique({ where: { id } });
  if (!role) throw new Error("Rôle introuvable");
  if (role.isSystem) throw new Error("Impossible de supprimer un rôle système");

  const membersUsing = await prisma.member.count({
    where: { role: role.slug },
  });
  if (membersUsing > 0) {
    throw new Error(
      `${membersUsing} membre(s) utilisent encore ce rôle — réassignez-les d'abord`,
    );
  }

  await prisma.organizationRole.deleteMany({ where: { role: role.slug } });
  await prisma.globalRole.delete({ where: { id } });
  revalidatePath("/admin/roles");
}

export async function getGlobalRolePermission(slug: string): Promise<PermissionMatrix | null> {
  const role = await prisma.globalRole.findUnique({ where: { slug } });
  if (!role) return null;
  return parsePermission(role.permission);
}
