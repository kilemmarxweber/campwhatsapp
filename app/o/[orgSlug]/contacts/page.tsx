import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { ContactsClient } from "@/components/contacts-client";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const [contacts, lists] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, phone: true, name: true, email: true },
    }),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Contacts
        </h1>
        <p className="text-[var(--fg-muted)]">
          Base destinataires ({contacts.length}) · {lists.length} liste
          {lists.length === 1 ? "" : "s"}
        </p>
      </div>
      <ContactsClient
        organizationId={org.id}
        orgSlug={orgSlug}
        contacts={contacts}
        lists={lists}
      />
    </div>
  );
}
