import { notFound } from "next/navigation";
import type { CountryCode } from "libphonenumber-js";
import type { Prisma } from "@/prisma/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { getDefaultCountryForBranch } from "@/lib/klambo/org";
import { ContactsClient } from "@/components/contacts-client";
import {
  getPageSize,
  parsePageParam,
} from "@/components/table-pagination";

function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim().slice(0, 80);
}

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageRaw, q: qRaw } = await searchParams;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const pageSize = getPageSize();
  const page = parsePageParam(pageRaw);
  const q = parseSearchQuery(qRaw);

  const where: Prisma.ContactWhereInput = {
    organizationId: org.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/[\s().\-]/g, "") } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [totalContacts, lists, defaultCountryRaw] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contactList.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
    }),
    getDefaultCountryForBranch(org.id),
  ]);
  const defaultCountry = (defaultCountryRaw || "CD") as CountryCode;

  const totalPages = Math.max(1, Math.ceil(totalContacts / pageSize));
  const currentPage = Math.min(page, totalPages);

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [
      { archivedAt: { sort: "asc", nulls: "first" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      archivedAt: true,
    },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Contacts
        </h1>
        <p className="text-[var(--fg-muted)]">
          Base destinataires ({totalContacts}
          {q ? ` · filtre « ${q} »` : ""}) · {lists.length} groupe
          {lists.length === 1 ? "" : "s"}
        </p>
      </div>
      <ContactsClient
        organizationId={org.id}
        orgSlug={orgSlug}
        defaultCountry={defaultCountry}
        contacts={contacts}
        lists={lists}
        page={currentPage}
        totalContacts={totalContacts}
        searchQuery={q}
      />
    </div>
  );
}
