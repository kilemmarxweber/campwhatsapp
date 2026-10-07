"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { isAppAdminRole } from "@/lib/permissions";
import {
  seedSystemGlobalRoles,
  syncAllGlobalRolesToOrg,
} from "@/lib/roles/sync";

export async function createSuccursale(input: {
  name: string;
  slug: string;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Non authentifié");
  if (!isAppAdminRole(session.user.role)) {
    throw new Error("Seuls les administrateurs siège peuvent créer une succursale");
  }

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug) throw new Error("Nom et slug requis");

  const tenantName = input.tenantName?.trim() ?? "";
  const tenantSlug = input.tenantSlug?.trim().toLowerCase() ?? "";
  if (!input.tenantId && (!tenantName || !tenantSlug)) {
    throw new Error("Nom et slug de l'organisation requis");
  }
  const tenant = input.tenantId
    ? await prisma.tenantOrganization.findUnique({ where: { id: input.tenantId } })
    : await prisma.tenantOrganization.create({ data: { name: tenantName, slug: tenantSlug } });
  if (!tenant) throw new Error("Organisation introuvable");

  const created = await auth.api.createOrganization({
    headers: await headers(),
    body: { name, slug },
  });

  if (!created) throw new Error("Création impossible");

  await prisma.organization.update({
    where: { id: created.id },
    data: { tenantId: tenant.id },
  });
  await ensureTenantOwner(created.id);

  await seedSystemGlobalRoles();
  await syncAllGlobalRolesToOrg(created.id);

  revalidatePath("/dashboard");
  revalidatePath("/admin/succursales");
  return created;
}

async function ensureTenantOwner(branchId: string) {
  const owner = await prisma.member.findFirst({
    where: { organizationId: branchId, role: "owner" },
    select: { userId: true },
  });
  if (!owner) return;
  const branch = await prisma.organization.findUnique({
    where: { id: branchId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return;
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: branch.tenantId, userId: owner.userId } },
    create: { tenantId: branch.tenantId, userId: owner.userId, role: "owner" },
    update: {},
  });
}

export async function provisionSuccursaleExtras(organizationId: string) {
  await seedSystemGlobalRoles();
  await syncAllGlobalRolesToOrg(organizationId);
}

export async function inviteToSuccursale(input: {
  organizationId: string;
  orgSlug: string;
  email: string;
  role: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email requis");

  const invitation = await auth.api.createInvitation({
    headers: await headers(),
    body: {
      email,
      role: input.role,
      organizationId: input.organizationId,
    },
  });

  revalidatePath(`/o/${input.orgSlug}/equipe`);
  return invitation;
}

export async function cancelInvitation(input: {
  organizationId: string;
  orgSlug: string;
  invitationId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  await auth.api.cancelInvitation({
    headers: await headers(),
    body: { invitationId: input.invitationId },
  });

  revalidatePath(`/o/${input.orgSlug}/equipe`);
}

export async function updateMemberRole(input: {
  organizationId: string;
  orgSlug: string;
  memberId: string;
  role: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  await auth.api.updateMemberRole({
    headers: await headers(),
    body: {
      memberId: input.memberId,
      role: input.role,
      organizationId: input.organizationId,
    },
  });

  revalidatePath(`/o/${input.orgSlug}/equipe`);
}

export async function removeMember(input: {
  organizationId: string;
  orgSlug: string;
  memberIdOrEmail: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  await auth.api.removeMember({
    headers: await headers(),
    body: {
      memberIdOrEmail: input.memberIdOrEmail,
      organizationId: input.organizationId,
    },
  });

  revalidatePath(`/o/${input.orgSlug}/equipe`);
}
