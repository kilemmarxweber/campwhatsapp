import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  getOrganizationBySlug,
  requireOrganizationPermission,
} from "@/lib/auth/organization-permission";
import { isOwnerOrgRole } from "@/lib/permissions";
import { listAssignableRoleSlugs } from "@/lib/roles/sync";
import { EquipeClient } from "@/components/equipe-client";

export default async function EquipePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  let canManage = false;
  try {
    await requireOrganizationPermission(org.id, { equipe: ["manage"] });
    canManage = true;
  } catch {
    await requireOrganizationPermission(org.id, { equipe: ["read"] });
  }

  const [members, roles] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: org.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    listAssignableRoleSlugs(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Équipe
        </h1>
        <p className="text-[var(--fg-muted)]">
          Membres de la succursale {org.name}
        </p>
      </div>
      <EquipeClient
        organizationId={org.id}
        orgSlug={orgSlug}
        members={members.filter((member) => !isOwnerOrgRole(member.role))}
        roles={roles}
        canManage={canManage}
      />
    </div>
  );
}
