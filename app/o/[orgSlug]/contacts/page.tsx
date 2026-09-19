import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { ContactsClient } from "@/components/contacts-client";
import {
  getPageSize,
  parsePageParam,
} from "@/components/table-pagination";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const { page: pageRaw } = await searchParams;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const pageSize = getPageSize();
  const page = parsePageParam(pageRaw);
  const where = { organizationId: org.id };

  const [totalContacts, lists] = await Promise.all([
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
  ]);

  const totalPages = Math.max(1, Math.ceil(totalContacts / pageSize));
  const currentPage = Math.min(page, totalPages);

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, phone: true, name: true, email: true },
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
          Base destinataires ({totalContacts}) · {lists.length} liste
          {lists.length === 1 ? "" : "s"}
        </p>
      </div>
      <ContactsClient
        organizationId={org.id}
        orgSlug={orgSlug}
        contacts={contacts}
        lists={lists}
        page={currentPage}
        totalContacts={totalContacts}
      />
    </div>
  );
}
