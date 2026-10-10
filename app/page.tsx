import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LandingPage } from "@/components/landing-page";
import { SiteJsonLd } from "@/components/site-json-ld";
import type { LandingOrgShowcase } from "@/components/landing-hero-visual";
import { SITE } from "@/lib/site";
import { publicUploadUrl } from "@/lib/upload-url";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE.name} — ${SITE.tagline}`,
  },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
  },
};

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  const [tenants, imageTemplate] = await Promise.all([
    prisma.tenantOrganization.findMany({
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
    }),
    prisma.messageTemplate.findFirst({
      where: {
        messageType: "image",
        channel: "whatsapp",
        mediaId: { not: null },
        media: { kind: "image" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        media: {
          select: {
            storagePath: true,
            filename: true,
          },
        },
      },
    }),
  ]);

  const promoPreview = imageTemplate?.media
    ? {
        title: imageTemplate.name,
        imageUrl: publicUploadUrl(imageTemplate.media.storagePath),
        imageAlt: imageTemplate.media.filename || imageTemplate.name,
      }
    : null;

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

  return (
    <>
      <SiteJsonLd />
      <LandingPage organizations={organizations} promoPreview={promoPreview} />
    </>
  );
}
