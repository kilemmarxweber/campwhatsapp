"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import {
  isHexColor,
  normalizeLocale,
  type AppLocale,
} from "@/lib/appearance";

export async function updateTenantAppearance(input: {
  organizationId: string;
  orgSlug: string;
  colorRed: string;
  colorWhite: string;
  colorBlue: string;
  locale: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    equipe: ["manage"],
  });

  const colorRed = input.colorRed.trim().toLowerCase();
  const colorWhite = input.colorWhite.trim().toLowerCase();
  const colorBlue = input.colorBlue.trim().toLowerCase();
  if (![colorRed, colorWhite, colorBlue].every(isHexColor)) {
    throw new Error("Couleur invalide");
  }
  const locale: AppLocale = normalizeLocale(input.locale);

  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) throw new Error("Organisation introuvable");

  await prisma.tenantOrganization.update({
    where: { id: branch.tenantId },
    data: { colorRed, colorWhite, colorBlue, locale },
  });

  revalidatePath(`/o/${input.orgSlug}`, "layout");
  revalidatePath(`/o/${input.orgSlug}/settings`);
}
