import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LandingPage } from "@/components/landing-page";
import { SiteJsonLd } from "@/components/site-json-ld";
import type {
  LandingOrgShowcase,
  LandingPromoPreview,
} from "@/components/landing-hero-visual";
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

async function promoForBranches(
  branchIds: string[],
): Promise<LandingPromoPreview | null> {
  if (branchIds.length === 0) return null;

  const imageTemplate = await prisma.messageTemplate.findFirst({
    where: {
      organizationId: { in: branchIds },
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
  });

  if (imageTemplate?.media) {
    return {
      title: imageTemplate.name,
      imageUrl: publicUploadUrl(imageTemplate.media.storagePath),
      imageAlt: imageTemplate.media.filename || imageTemplate.name,
    };
  }

  // Fallback : dernier template WhatsApp (nom seul, sans image)
  const anyTemplate = await prisma.messageTemplate.findFirst({
    where: {
      organizationId: { in: branchIds },
      channel: "whatsapp",
    },
    orderBy: { createdAt: "desc" },
    select: { name: true },
  });

  if (!anyTemplate) return null;

  return {
    title: anyTemplate.name,
    imageUrl: "",
    imageAlt: anyTemplate.name,
  };
}

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

      const [promoPreview, messagesOk, messagesFailed] = await Promise.all([
        promoForBranches(ids),
        ids.length === 0
          ? Promise.resolve(0)
          : prisma.campaignRecipient.count({
              where: {
                status: { in: ["sent", "delivered", "read"] },
                campaign: { organizationId: { in: ids } },
              },
            }),
        ids.length === 0
          ? Promise.resolve(0)
          : prisma.campaignRecipient.count({
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
        promoPreview,
      };
    }),
  );

  return (
    <>
      <SiteJsonLd />
      <LandingPage organizations={organizations} />
    </>
  );
}
