import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LandingPage } from "@/components/landing-page";
import type { LandingOrgShowcase } from "@/components/landing-hero-visual";

export const metadata: Metadata = {
  title: "Campagnes — WhatsApp & SMS",
  description:
    "Plateforme d’envoi WhatsApp et SMS pour les entreprises : contacts, templates, campagnes et rapports.",
};

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  const tenants = await prisma.tenantOrganization.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      branches: {
        where: { archivedAt: null },
        select: {
          id: true,
          _count: {
            select: {
              contacts: true,
              campaigns: true,
            },
          },
        },
      },
    },
  });

  const organizations: LandingOrgShowcase[] = await Promise.all(
    tenants.map(async (tenant) => {
      const ids = tenant.branches.map((b) => b.id);
      const contacts = tenant.branches.reduce(
        (sum, b) => sum + b._count.contacts,
        0,
      );
      const campaigns = tenant.branches.reduce(
        (sum, b) => sum + b._count.campaigns,
        0,
      );

      if (ids.length === 0) {
        return {
          id: tenant.id,
          name: tenant.name,
          contacts,
          campaigns,
          messagesOk: 0,
          messagesFailed: 0,
        };
      }

      const [messagesOk, messagesFailed] = await Promise.all([
        prisma.campaignRecipient.count({
          where: {
            status: { in: ["sent", "delivered", "read"] },
            campaign: { organizationId: { in: ids } },
          },
        }),
        prisma.campaignRecipient.count({
          where: {
            status: "failed",
            campaign: { organizationId: { in: ids } },
          },
        }),
      ]);

      return {
        id: tenant.id,
        name: tenant.name,
        contacts,
        campaigns,
        messagesOk,
        messagesFailed,
      };
    }),
  );

  return <LandingPage organizations={organizations} />;
}
