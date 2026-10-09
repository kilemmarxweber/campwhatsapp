import prisma from "@/lib/prisma";
import { normalizeOrgRole } from "@/lib/permissions";
import { isPlatformOwner } from "@/lib/auth/governance";
import {
  mergeTenantRole,
  tenantRoleFromBranchRole,
} from "@/lib/auth/governance-rules";
import { crossTenantJoinError } from "@/lib/auth/tenant-access";

export async function assertUserCanJoinOrganization(
  userId: string,
  organizationId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (await isPlatformOwner(userId, user?.role)) return;

  const target = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });

  const existing = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  const otherMemberships = await prisma.member.findMany({
    where: { userId, organizationId: { not: organizationId } },
    select: { organization: { select: { tenantId: true } } },
  });
  const tenantMemberships = await prisma.tenantMember.findMany({
    where: { userId },
    select: { tenantId: true },
  });

  const error = crossTenantJoinError({
    targetTenantId: target?.tenantId ?? null,
    alreadyMemberOfTarget: Boolean(existing),
    otherBranchTenantIds: otherMemberships.map((membership) => membership.organization.tenantId),
    directTenantIds: tenantMemberships.map((membership) => membership.tenantId),
  });
  if (error) throw new Error(error);
}

export async function ensureTenantMembership(userId: string, organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return;
  const member = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: branch.tenantId, userId } },
    create: {
      tenantId: branch.tenantId,
      userId,
      role: tenantRoleFromBranchRole(member?.role),
    },
    update: {},
  });
}

/** Aligne le rôle d'organisation sur le rôle de succursale, sans l'abaisser. */
export async function promoteTenantRole(userId: string, organizationId: string) {
  const branch = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return;
  const member = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { role: true },
  });
  const incoming = tenantRoleFromBranchRole(member?.role);
  const existing = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId: branch.tenantId, userId } },
  });
  if (!existing) {
    await prisma.tenantMember.create({
      data: { tenantId: branch.tenantId, userId, role: incoming },
    });
    return;
  }
  const next = mergeTenantRole(existing.role, incoming);
  if (next === existing.role) return;
  await prisma.tenantMember.update({
    where: { id: existing.id },
    data: { role: next },
  });
}

export async function getUserOrganizationMembership(
  userId: string,
  organizationId: string,
) {
  return prisma.member.findFirst({
    where: { userId, organizationId },
    select: {
      id: true,
      role: true,
      organizationId: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function getSessionOrganizationContext(
  userId: string,
  activeOrganizationId: string | null | undefined,
) {
  if (activeOrganizationId) {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId: activeOrganizationId },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    if (member) {
      return {
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
        role: normalizeOrgRole(member.role),
      };
    }
  }

  const first = await prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!first) return null;

  return {
    id: first.organization.id,
    name: first.organization.name,
    slug: first.organization.slug,
    role: normalizeOrgRole(first.role),
  };
}

export async function listUserOrganizations(userId: string) {
  const members = await prisma.member.findMany({
    where: {
      userId,
      organization: { archivedAt: null, tenant: { archivedAt: null } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  return members.map((m) => ({
    ...m.organization,
    role: normalizeOrgRole(m.role),
  }));
}
