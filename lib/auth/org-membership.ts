import prisma from "@/lib/prisma";
import { normalizeOrgRole } from "@/lib/permissions";

export async function assertUserCanJoinOrganization(
  userId: string,
  organizationId: string,
) {
  const existing = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Vous êtes déjà membre de cette organisation.");
  }
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
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true, logo: true } },
    },
  });
  return members.map((m) => ({
    ...m.organization,
    role: normalizeOrgRole(m.role),
  }));
}
