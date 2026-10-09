"use server";

import { revalidatePath } from "next/cache";
import type { CountryCode } from "libphonenumber-js";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { getDefaultCountryForBranch } from "@/lib/klambo/org";
import { normalizePhone } from "@/lib/phone";
import { parseContactsExcel } from "@/lib/contacts/import-excel";
import { buildContactsWorkbook } from "@/lib/contacts/export-excel";

export async function createContact(input: {
  organizationId: string;
  orgSlug: string;
  phone: string;
  name?: string;
  email?: string;
  variables?: Record<string, string>;
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["create"],
  });

  const phone = normalizePhone(
    input.phone,
    (await getDefaultCountryForBranch(input.organizationId)) as CountryCode,
  );
  if (!phone) throw new Error("Numéro de téléphone invalide");

  const contact = await prisma.contact.create({
    data: {
      organizationId: input.organizationId,
      phone,
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      variables: input.variables ?? {},
    },
  });

  revalidatePath(`/o/${input.orgSlug}/contacts`);
  return contact;
}

export async function deleteContact(input: {
  organizationId: string;
  orgSlug: string;
  contactId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["delete"],
  });
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!contact) throw new Error("Contact introuvable");
  await prisma.contact.delete({
    where: { id: contact.id },
  });
  revalidatePath(`/o/${input.orgSlug}/contacts`);
}

export async function importContactsFromExcel(input: {
  organizationId: string;
  orgSlug: string;
  base64: string;
  filename: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["import"],
  });

  const country = (await getDefaultCountryForBranch(
    input.organizationId,
  )) as CountryCode;

  const buffer = Buffer.from(input.base64, "base64");
  const rows = parseContactsExcel(buffer, country);

  let created = 0;
  let updated = 0;
  const errors: { row: number; reason: string }[] = [];

  for (const row of rows) {
    if (!row.ok) {
      errors.push({ row: row.row, reason: row.reason });
      continue;
    }
    const existing = await prisma.contact.findUnique({
      where: {
        organizationId_phone: {
          organizationId: input.organizationId,
          phone: row.phone,
        },
      },
    });
    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          name: row.name ?? existing.name,
          email: row.email ?? existing.email,
          variables: {
            ...((existing.variables as Record<string, string>) ?? {}),
            ...row.variables,
          },
        },
      });
      updated += 1;
    } else {
      await prisma.contact.create({
        data: {
          organizationId: input.organizationId,
          phone: row.phone,
          name: row.name ?? null,
          email: row.email ?? null,
          variables: row.variables,
        },
      });
      created += 1;
    }
  }

  revalidatePath(`/o/${input.orgSlug}/contacts`);
  return { created, updated, errors, filename: input.filename };
}

export async function exportContactsExcel(input: {
  organizationId: string;
  orgSlug: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["read"],
  });

  const org = await prisma.organization.findFirst({
    where: { id: input.organizationId },
    include: { tenant: { select: { name: true, logoPath: true } } },
  });
  if (!org?.tenant) throw new Error("Succursale introuvable");

  const contacts = await prisma.contact.findMany({
    where: { organizationId: input.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      phone: true,
      name: true,
      email: true,
      variables: true,
    },
  });

  const exportedAt = new Date();
  const buffer = await buildContactsWorkbook(contacts, {
    tenantName: org.tenant.name,
    branchName: org.name,
    exportedAt,
    logoPath: org.tenant.logoPath,
  });

  const stamp = exportedAt.toISOString().slice(0, 10);
  const filename = `contacts-${input.orgSlug}-${stamp}.xlsx`;

  return {
    filename,
    base64: buffer.toString("base64"),
    count: contacts.length,
  };
}

export async function createContactList(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  contactIds: string[];
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["create"],
  });

  const uniqueIds = [...new Set(input.contactIds)];
  const contacts = uniqueIds.length
    ? await prisma.contact.findMany({
        where: { organizationId: input.organizationId, id: { in: uniqueIds } },
        select: { id: true },
      })
    : [];
  if (contacts.length !== uniqueIds.length) {
    throw new Error("Un ou plusieurs contacts n'appartiennent pas à cette succursale");
  }

  const list = await prisma.contactList.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      members: {
        create: contacts.map((contact) => ({ contactId: contact.id })),
      },
    },
  });

  revalidatePath(`/o/${input.orgSlug}/contacts`);
  return list;
}

export async function deleteContactList(input: {
  organizationId: string;
  orgSlug: string;
  listId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["delete"],
  });
  const list = await prisma.contactList.findFirst({
    where: { id: input.listId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!list) throw new Error("Liste introuvable");
  await prisma.contactList.delete({ where: { id: list.id } });
  revalidatePath(`/o/${input.orgSlug}/contacts`);
}

