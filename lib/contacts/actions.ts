"use server";

import { revalidatePath } from "next/cache";
import type { CountryCode } from "libphonenumber-js";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { normalizePhone } from "@/lib/phone";
import { parseContactsExcel } from "@/lib/contacts/import-excel";

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

  const settings = await prisma.klamboConfig.findUnique({
    where: { id: "default" },
    select: { defaultCountry: true },
  });
  const phone = normalizePhone(
    input.phone,
    (settings?.defaultCountry as CountryCode) || "CD",
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
  await prisma.contact.delete({
    where: { id: input.contactId },
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

  const settings = await prisma.klamboConfig.findUnique({
    where: { id: "default" },
    select: { defaultCountry: true },
  });
  const country = (settings?.defaultCountry as CountryCode) || "CD";

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

export async function createContactList(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  contactIds: string[];
}) {
  await requireOrganizationPermission(input.organizationId, {
    contacts: ["create"],
  });

  const list = await prisma.contactList.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      members: {
        create: input.contactIds.map((contactId) => ({ contactId })),
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
  await prisma.contactList.delete({ where: { id: input.listId } });
  revalidatePath(`/o/${input.orgSlug}/contacts`);
}

