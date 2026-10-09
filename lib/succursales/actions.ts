"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGovernanceContext } from "@/lib/auth/governance";
import {
  canCreateBranchInTenant,
  canCreateOrganization,
  TENANT_ROLE,
} from "@/lib/auth/governance-rules";
import { promoteTenantRole } from "@/lib/auth/org-membership";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { hashPassword } from "better-auth/crypto";
import { sendMemberCreatedEmail } from "@/lib/email/send-member-created";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import { sendProfileUpdatedEmail } from "@/lib/email/send-profile-updated";
import { generateSecurePassword } from "@/lib/generate-password";
import { ORG_ROLE, APP_ROLE, isOwnerOrgRole } from "@/lib/permissions";
import {
  seedSystemGlobalRoles,
  syncAllGlobalRolesToOrg,
} from "@/lib/roles/sync";

export async function createTenantOrganization(input: { name: string; slug: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false as const, message: "Non authentifié" };
  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (!canCreateOrganization(access?.level ?? null)) {
    return { ok: false as const, message: "Seul le propriétaire peut créer une organisation" };
  }

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug) return { ok: false as const, message: "Nom et slug requis" };
  const existing = await prisma.tenantOrganization.findUnique({ where: { slug } });
  if (existing) return { ok: false as const, message: "Ce slug d'organisation existe déjà" };

  try {
    const tenant = await prisma.tenantOrganization.create({ data: { name, slug } });
    await prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
      create: { tenantId: tenant.id, userId: session.user.id, role: TENANT_ROLE.OWNER },
      update: { role: TENANT_ROLE.OWNER },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Création impossible";
    return { ok: false as const, message };
  }

  revalidatePath("/organisations");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function createSuccursale(input: {
  name: string;
  slug: string;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Non authentifié");
  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (!access) {
    throw new Error("Seuls le propriétaire et l'administrateur peuvent créer une succursale");
  }

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (!name || !slug) throw new Error("Nom et slug requis");
  const slugTaken = await prisma.organization.findUnique({ where: { slug } });
  if (slugTaken) throw new Error("Ce slug de succursale existe déjà");

  const tenantName = input.tenantName?.trim() ?? "";
  const tenantSlug = input.tenantSlug?.trim().toLowerCase() ?? "";
  if (!input.tenantId && !canCreateOrganization(access.level)) {
    throw new Error("Seul le propriétaire peut créer une organisation");
  }
  if (!input.tenantId && (!tenantName || !tenantSlug)) {
    throw new Error("Nom et slug de l'organisation requis");
  }
  if (
    input.tenantId &&
    !canCreateBranchInTenant({
      level: access.level,
      tenantId: input.tenantId,
      ownTenantIds: access.tenantIds,
    })
  ) {
    throw new Error("Vous ne pouvez créer une succursale que dans votre organisation");
  }
  const tenant = input.tenantId
    ? await prisma.tenantOrganization.findUnique({ where: { id: input.tenantId } })
    : await prisma.tenantOrganization.create({ data: { name: tenantName, slug: tenantSlug } });
  if (!tenant) throw new Error("Organisation introuvable");
  if (tenant.archivedAt) {
    throw new Error("Cette organisation est archivée. Restaurez-la avant d'ajouter une succursale.");
  }

  const created = await auth.api.createOrganization({
    headers: await headers(),
    body: { name, slug, tenantId: tenant.id },
  });

  if (!created) throw new Error("Création impossible");

  await prisma.organization.update({
    where: { id: created.id },
    data: { tenantId: tenant.id },
  });
  if (access.level === "admin") {
    await prisma.member.updateMany({
      where: { organizationId: created.id, userId: session.user.id },
      data: { role: ORG_ROLE.ADMIN },
    });
    await prisma.tenantMember.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
      create: { tenantId: tenant.id, userId: session.user.id, role: TENANT_ROLE.ADMIN },
      update: { role: TENANT_ROLE.ADMIN },
    });
  } else {
    await ensureTenantOwner(created.id);
  }

  await seedSystemGlobalRoles();
  await syncAllGlobalRolesToOrg(created.id);

  revalidatePath("/dashboard");
  revalidatePath("/organisations");
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

export async function createSuccursaleMember(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  email: string;
  role: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role.trim();
  if (!email || !name || !role) throw new Error("Nom, email et rôle requis");
  assertAssignableRole(role);

  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true, tenant: { select: { name: true } } },
  });
  if (!branch) throw new Error("Succursale introuvable");

  const roleRow = await prisma.globalRole.findUnique({
    where: { slug: role },
    select: { name: true },
  });
  const roleLabel = roleRow?.name ?? role;
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  let userId: string;
  let temporaryPassword: string | undefined;
  if (existing) {
    const already = await prisma.member.findFirst({
      where: { userId: existing.id, organizationId: branch.id },
      select: { id: true },
    });
    if (already) throw new Error("Ce membre fait déjà partie de la succursale");
    userId = existing.id;
  } else {
    temporaryPassword = generateSecurePassword(16);
    const created = await auth.api.createUser({
      body: {
        email,
        name,
        password: temporaryPassword,
        role: APP_ROLE.USER,
      },
    });
    if (!created?.user?.id) throw new Error("Création du compte impossible");
    userId = created.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, mustChangePassword: true },
    });
  }

  await auth.api.addMember({
    headers: await headers(),
    body: {
      userId,
      role: role as "owner",
      organizationId: branch.id,
    },
  });

  try {
    await sendMemberCreatedEmail({
      to: email,
      name: existing?.name || name,
      organizationName: branch.tenant?.name ?? branch.name,
      branchName: branch.name,
      roleLabel,
      temporaryPassword,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "envoi impossible";
    throw new Error(`Membre créé, mais l'email n'a pas été envoyé (${detail})`);
  }

  revalidatePath(`/o/${input.orgSlug}/equipe`);
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

  assertAssignableRole(input.role);
  const member = await findBranchMember(input.organizationId, input.memberId);
  if (isOwnerOrgRole(member.role)) {
    throw new Error("Le rôle du propriétaire ne peut pas être modifié");
  }
  await prisma.member.update({
    where: { id: member.id },
    data: { role: input.role },
  });
  await promoteTenantRole(member.user.id, input.organizationId);

  revalidatePath(`/o/${input.orgSlug}/equipe`);
  revalidatePath("/organisations");
}

export async function removeMember(input: {
  organizationId: string;
  orgSlug: string;
  memberIdOrEmail: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const member = await findBranchMember(
    input.organizationId,
    input.memberIdOrEmail,
  );
  if (isOwnerOrgRole(member.role)) {
    throw new Error("Le propriétaire ne peut pas être supprimé");
  }
  await prisma.member.delete({ where: { id: member.id } });

  revalidatePath(`/o/${input.orgSlug}/equipe`);
}

function assertAssignableRole(role: string) {
  if (isOwnerOrgRole(role)) {
    throw new Error("Le rôle propriétaire ne peut pas être assigné");
  }
}

async function findBranchMember(organizationId: string, memberIdOrEmail: string) {
  const key = memberIdOrEmail.trim();
  const member = await prisma.member.findFirst({
    where: {
      organizationId,
      OR: [{ id: key }, { user: { email: key.toLowerCase() } }],
    },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!member) throw new Error("Membre introuvable");
  return member;
}

export async function updateSuccursaleMember(input: {
  organizationId: string;
  orgSlug: string;
  memberId: string;
  name: string;
  email: string;
  role: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = input.role.trim();
  if (!name || !email || !role) throw new Error("Nom, email et rôle requis");

  const member = await findBranchMember(input.organizationId, input.memberId);
  const nextRole = isOwnerOrgRole(member.role) ? member.role : role;
  if (!isOwnerOrgRole(member.role)) assertAssignableRole(nextRole);
  if (email !== member.user.email) {
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken && taken.id !== member.user.id) {
      throw new Error("Cet email est déjà utilisé");
    }
  }

  await prisma.user.update({
    where: { id: member.user.id },
    data: { name, email },
  });

  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  try {
    await sendProfileUpdatedEmail({
      to: email,
      name,
      branchName: branch?.name,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "envoi impossible";
    throw new Error(`Membre mis à jour, mais l'email n'a pas été envoyé (${detail})`);
  }

  if (member.role !== nextRole) {
    await prisma.member.update({
      where: { id: member.id },
      data: { role: nextRole },
    });
    await promoteTenantRole(member.user.id, input.organizationId);
  }

  revalidatePath(`/o/${input.orgSlug}/equipe`);
  revalidatePath("/organisations");
}

export async function resetMemberPassword(input: {
  organizationId: string;
  orgSlug: string;
  memberId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const member = await findBranchMember(input.organizationId, input.memberId);
  const temporaryPassword = generateSecurePassword(16);
  const hashed = await hashPassword(temporaryPassword);
  const account = await prisma.account.findFirst({
    where: { userId: member.user.id, providerId: "credential" },
    select: { id: true },
  });
  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashed },
    });
  } else {
    const now = new Date();
    await prisma.account.create({
      data: {
        id: crypto.randomUUID().replace(/-/g, ""),
        accountId: member.user.id,
        providerId: "credential",
        userId: member.user.id,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  await prisma.user.update({
    where: { id: member.user.id },
    data: { mustChangePassword: true },
  });
  await prisma.session.deleteMany({ where: { userId: member.user.id } });

  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { name: true },
  });
  try {
    await sendPasswordResetEmail({
      to: member.user.email,
      name: member.user.name,
      temporaryPassword,
      branchName: branch?.name,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "envoi impossible";
    throw new Error(`L'email de réinitialisation n'a pas été envoyé (${detail})`);
  }

  revalidatePath(`/o/${input.orgSlug}/equipe`);
}

type ActionResult = { ok: true } | { ok: false; message: string };

function normalizeRecordSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return slug;
}

async function managerContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false as const, message: "Non authentifié" };
  const access = await getGovernanceContext(session.user.id, session.user.role);
  if (!access) {
    return { ok: false as const, message: "Accès refusé" };
  }
  return { ok: true as const, access };
}

function refreshOrgLists(slug?: string) {
  revalidatePath("/organisations");
  revalidatePath("/dashboard");
  revalidatePath("/admin/klambo");
  revalidatePath("/admin/sms");
  if (slug) revalidatePath(`/organisations/${slug}`);
}

async function deleteBranchById(branchId: string) {
  await prisma.session.updateMany({
    where: { activeOrganizationId: branchId },
    data: { activeOrganizationId: null },
  });
  await prisma.organization.delete({ where: { id: branchId } });
}

export async function updateTenantOrganization(input: {
  tenantId: string;
  name: string;
  slug: string;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  if (!canCreateOrganization(manager.access.level)) {
    return { ok: false, message: "Seul le propriétaire peut modifier une organisation" };
  }
  const name = input.name.trim();
  const slug = normalizeRecordSlug(input.slug);
  if (!name || !slug) return { ok: false, message: "Nom et slug requis" };
  const current = await prisma.tenantOrganization.findUnique({
    where: { id: input.tenantId },
    select: { id: true, slug: true },
  });
  if (!current) return { ok: false, message: "Organisation introuvable" };
  const taken = await prisma.tenantOrganization.findFirst({
    where: { slug, NOT: { id: current.id } },
    select: { id: true },
  });
  if (taken) return { ok: false, message: "Ce slug d'organisation existe déjà" };
  await prisma.tenantOrganization.update({
    where: { id: current.id },
    data: { name, slug },
  });
  refreshOrgLists(current.slug);
  refreshOrgLists(slug);
  return { ok: true };
}

export async function setTenantOrganizationArchived(input: {
  tenantId: string;
  archived: boolean;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  if (!canCreateOrganization(manager.access.level)) {
    return { ok: false, message: "Seul le propriétaire peut archiver une organisation" };
  }
  const current = await prisma.tenantOrganization.findUnique({
    where: { id: input.tenantId },
    select: { slug: true },
  });
  if (!current) return { ok: false, message: "Organisation introuvable" };
  await prisma.tenantOrganization.update({
    where: { id: input.tenantId },
    data: { archivedAt: input.archived ? new Date() : null },
  });
  refreshOrgLists(current.slug);
  return { ok: true };
}

export async function deleteTenantOrganization(input: {
  tenantId: string;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  if (!canCreateOrganization(manager.access.level)) {
    return { ok: false, message: "Seul le propriétaire peut supprimer une organisation" };
  }
  const current = await prisma.tenantOrganization.findUnique({
    where: { id: input.tenantId },
    select: { id: true, slug: true, branches: { select: { id: true } } },
  });
  if (!current) return { ok: false, message: "Organisation introuvable" };
  try {
    for (const branch of current.branches) {
      await deleteBranchById(branch.id);
    }
    await prisma.tenantOrganization.delete({ where: { id: current.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible";
    return { ok: false, message };
  }
  refreshOrgLists(current.slug);
  return { ok: true };
}

export async function updateSuccursale(input: {
  branchId: string;
  name: string;
  slug: string;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  const name = input.name.trim();
  const slug = normalizeRecordSlug(input.slug);
  if (!name || !slug) return { ok: false, message: "Nom et slug requis" };
  const current = await prisma.organization.findUnique({
    where: { id: input.branchId },
    select: { id: true, slug: true, tenantId: true, tenant: { select: { slug: true } } },
  });
  if (!current) return { ok: false, message: "Succursale introuvable" };
  if (
    !canCreateBranchInTenant({
      level: manager.access.level,
      tenantId: current.tenantId,
      ownTenantIds: manager.access.tenantIds,
    })
  ) {
    return { ok: false, message: "Vous ne pouvez modifier que les succursales de votre organisation" };
  }
  const taken = await prisma.organization.findFirst({
    where: { slug, NOT: { id: current.id } },
    select: { id: true },
  });
  if (taken) return { ok: false, message: "Ce slug de succursale existe déjà" };
  await prisma.organization.update({
    where: { id: current.id },
    data: { name, slug },
  });
  refreshOrgLists(current.tenant.slug);
  revalidatePath(`/o/${current.slug}`);
  revalidatePath(`/o/${slug}`);
  return { ok: true };
}

export async function setSuccursaleArchived(input: {
  branchId: string;
  archived: boolean;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  const current = await prisma.organization.findUnique({
    where: { id: input.branchId },
    select: { id: true, tenantId: true, tenant: { select: { slug: true } } },
  });
  if (!current) return { ok: false, message: "Succursale introuvable" };
  if (
    !canCreateBranchInTenant({
      level: manager.access.level,
      tenantId: current.tenantId,
      ownTenantIds: manager.access.tenantIds,
    })
  ) {
    return { ok: false, message: "Vous ne pouvez archiver que les succursales de votre organisation" };
  }
  if (input.archived) {
    await prisma.session.updateMany({
      where: { activeOrganizationId: current.id },
      data: { activeOrganizationId: null },
    });
  }
  await prisma.organization.update({
    where: { id: current.id },
    data: { archivedAt: input.archived ? new Date() : null },
  });
  refreshOrgLists(current.tenant.slug);
  return { ok: true };
}

export async function deleteSuccursale(input: {
  branchId: string;
}): Promise<ActionResult> {
  const manager = await managerContext();
  if (!manager.ok) return manager;
  const current = await prisma.organization.findUnique({
    where: { id: input.branchId },
    select: { id: true, slug: true, tenantId: true, tenant: { select: { slug: true } } },
  });
  if (!current) return { ok: false, message: "Succursale introuvable" };
  if (
    !canCreateBranchInTenant({
      level: manager.access.level,
      tenantId: current.tenantId,
      ownTenantIds: manager.access.tenantIds,
    })
  ) {
    return { ok: false, message: "Vous ne pouvez supprimer que les succursales de votre organisation" };
  }
  try {
    await deleteBranchById(current.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suppression impossible";
    return { ok: false, message };
  }
  refreshOrgLists(current.tenant.slug);
  revalidatePath(`/o/${current.slug}`);
  return { ok: true };
}
