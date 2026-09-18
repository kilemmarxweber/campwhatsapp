"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { enqueueCampaign } from "@/lib/campaigns/process";
import { renderTemplate } from "@/lib/campaigns/render-template";

export async function createCampaign(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  bodyTemplate: string;
  messageType: "text" | "image" | "video";
  mediaId?: string | null;
  contactListId?: string | null;
  contactIds?: string[];
  sendNow?: boolean;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["create"],
  });

  if (!input.bodyTemplate.trim()) {
    throw new Error("Le message ne peut pas être vide");
  }

  let contactIds = input.contactIds ?? [];
  if (input.contactListId) {
    const members = await prisma.contactListMember.findMany({
      where: { listId: input.contactListId },
      select: { contactId: true },
    });
    contactIds = members.map((m) => m.contactId);
  }

  if (contactIds.length === 0) {
    throw new Error("Sélectionnez au moins un contact ou une liste");
  }

  if (
    (input.messageType === "image" || input.messageType === "video") &&
    !input.mediaId
  ) {
    throw new Error("Un média est requis pour ce type de campagne");
  }

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: contactIds },
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      bodyTemplate: input.bodyTemplate,
      messageType: input.messageType,
      mediaId: input.mediaId || null,
      contactListId: input.contactListId || null,
      status: "draft",
      recipients: {
        create: contacts.map((c) => ({
          contactId: c.id,
          renderedBody: renderTemplate(input.bodyTemplate, {
            name: c.name ?? "",
            prenom: c.name?.split(" ")[0] ?? "",
            phone: c.phone,
            email: c.email ?? "",
            ...((c.variables as Record<string, string>) ?? {}),
          }),
          status: "pending",
        })),
      },
    },
  });

  if (input.sendNow) {
    await requireOrganizationPermission(input.organizationId, {
      campaigns: ["send"],
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending" },
    });
    enqueueCampaign(campaign.id);
  }

  revalidatePath(`/o/${input.orgSlug}/campaigns`);
  return campaign;
}

export async function startCampaign(input: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["send"],
  });

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: input.campaignId,
      organizationId: input.organizationId,
    },
  });
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "sending") {
    return campaign;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "sending" },
  });
  enqueueCampaign(campaign.id);
  revalidatePath(`/o/${input.orgSlug}/campaigns`);
  revalidatePath(`/o/${input.orgSlug}/campaigns/${campaign.id}`);
  return campaign;
}

export async function cancelCampaign(input: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["update"],
  });
  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: { status: "cancelled" },
  });
  revalidatePath(`/o/${input.orgSlug}/campaigns`);
  revalidatePath(`/o/${input.orgSlug}/campaigns/${input.campaignId}`);
}

export async function retryFailedRecipients(input: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["send"],
  });

  await prisma.campaignRecipient.updateMany({
    where: { campaignId: input.campaignId, status: "failed" },
    data: { status: "pending", error: null },
  });

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: { status: "sending", completedAt: null },
  });

  enqueueCampaign(input.campaignId);
  revalidatePath(`/o/${input.orgSlug}/campaigns/${input.campaignId}`);
}

export async function uploadMediaAsset(input: {
  organizationId: string;
  orgSlug: string;
  filename: string;
  mimeType: string;
  base64: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    media: ["create"],
  });

  const buf = Buffer.from(input.base64, "base64");
  const size = buf.byteLength;
  const isImage = input.mimeType.startsWith("image/");
  const isVideo = input.mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Seules les images et vidéos sont acceptées");
  }
  if (isImage && size > 5 * 1024 * 1024) {
    throw new Error("Image max 5 Mo (limite Klambo)");
  }
  if (isVideo && size > 16 * 1024 * 1024) {
    throw new Error("Vidéo max 16 Mo (limite Klambo)");
  }

  const kind = isImage ? "image" : "video";
  const dir = path.join(
    process.cwd(),
    "uploads",
    input.organizationId,
  );
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${input.filename.replace(/[^\w.\-]+/g, "_")}`;
  const storagePath = path.join("uploads", input.organizationId, safeName);
  await writeFile(path.join(process.cwd(), storagePath), buf);

  const asset = await prisma.mediaAsset.create({
    data: {
      organizationId: input.organizationId,
      filename: input.filename,
      mimeType: input.mimeType,
      size,
      kind,
      storagePath,
    },
  });

  revalidatePath(`/o/${input.orgSlug}/media`);
  return asset;
}

export async function createTemplate(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  body: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    templates: ["create"],
  });
  const tpl = await prisma.messageTemplate.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      body: input.body,
    },
  });
  revalidatePath(`/o/${input.orgSlug}/templates`);
  return tpl;
}

export async function deleteTemplate(input: {
  organizationId: string;
  orgSlug: string;
  templateId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    templates: ["delete"],
  });
  await prisma.messageTemplate.delete({ where: { id: input.templateId } });
  revalidatePath(`/o/${input.orgSlug}/templates`);
}
