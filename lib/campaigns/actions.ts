"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { composeTemplateCaption } from "@/lib/campaigns/compose-caption";
import { enqueueCampaign } from "@/lib/campaigns/process";
import { renderTemplate } from "@/lib/campaigns/render-template";
import { writeOrgUpload } from "@/lib/upload-file.server";
import { getKlamboClient } from "@/lib/klambo/org";

async function resolveCampaignContent(input: {
  organizationId: string;
  templateId: string;
  note?: string;
}) {
  const template = await prisma.messageTemplate.findFirst({
    where: {
      id: input.templateId,
      organizationId: input.organizationId,
    },
  });
  if (!template) throw new Error("Template introuvable");

  if (
    (template.messageType === "image" || template.messageType === "video") &&
    !template.mediaId
  ) {
    throw new Error("Le template image/vidéo n'a pas de média");
  }

  const bodyTemplate = composeTemplateCaption(
    template.body,
    template,
    input.note,
  );
  if (!bodyTemplate.trim()) {
    throw new Error("Le message du template est vide");
  }

  return {
    bodyTemplate,
    messageType: template.messageType as "text" | "image" | "video",
    mediaId: template.mediaId,
  };
}

export async function createCampaign(input: {
  organizationId: string;
  orgSlug: string;
  name: string;
  /** Contenu image / style / liens : toujours depuis le template. */
  templateId: string;
  /** Texte simple ajouté sous le template (optionnel). */
  note?: string;
  contactListId?: string | null;
  contactIds?: string[];
  sendNow?: boolean;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["create"],
  });

  const content = await resolveCampaignContent({
    organizationId: input.organizationId,
    templateId: input.templateId,
    note: input.note,
  });

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
      bodyTemplate: content.bodyTemplate,
      messageType: content.messageType,
      mediaId: content.mediaId || null,
      contactListId: input.contactListId || null,
      status: "draft",
      recipients: {
        create: contacts.map((c) => ({
          contactId: c.id,
          renderedBody: renderTemplate(content.bodyTemplate, {
            name: c.name ?? "",
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

export async function resendCampaign(input: {
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
    include: {
      recipients: { include: { contact: true } },
    },
  });
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "sending") {
    throw new Error("La campagne est déjà en cours d'envoi");
  }
  if (campaign.recipients.length === 0) {
    throw new Error("Aucun destinataire à renvoyer");
  }

  await prisma.$transaction(
    campaign.recipients.map((r) =>
      prisma.campaignRecipient.update({
        where: { id: r.id },
        data: {
          renderedBody: renderTemplate(campaign.bodyTemplate, {
            name: r.contact.name ?? "",
            phone: r.contact.phone,
            email: r.contact.email ?? "",
            ...((r.contact.variables as Record<string, string>) ?? {}),
          }),
          status: "pending",
          error: null,
          klamboMessageId: null,
          sentAt: null,
        },
      }),
    ),
  );

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "sending",
      startedAt: null,
      completedAt: null,
    },
  });

  enqueueCampaign(campaign.id);
  revalidatePath(`/o/${input.orgSlug}/campaigns`);
  revalidatePath(`/o/${input.orgSlug}/campaigns/${campaign.id}`);
}

export async function updateCampaign(input: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
  name: string;
  templateId: string;
  note?: string;
  contactListId?: string | null;
  contactIds?: string[];
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["update"],
  });

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: input.campaignId,
      organizationId: input.organizationId,
    },
  });
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "sending") {
    throw new Error("Impossible de modifier une campagne en cours d'envoi");
  }
  if (!input.name.trim()) {
    throw new Error("Le nom de la campagne est requis");
  }

  const content = await resolveCampaignContent({
    organizationId: input.organizationId,
    templateId: input.templateId,
    note: input.note,
  });

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

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: contactIds },
    },
  });

  await prisma.$transaction([
    prisma.campaignRecipient.deleteMany({
      where: { campaignId: campaign.id },
    }),
    prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        name: input.name.trim(),
        bodyTemplate: content.bodyTemplate,
        messageType: content.messageType,
        mediaId: content.mediaId || null,
        contactListId: input.contactListId || null,
        status: "draft",
        startedAt: null,
        completedAt: null,
        recipients: {
          create: contacts.map((c) => ({
            contactId: c.id,
            renderedBody: renderTemplate(content.bodyTemplate, {
              name: c.name ?? "",
              phone: c.phone,
              email: c.email ?? "",
              ...((c.variables as Record<string, string>) ?? {}),
            }),
            status: "pending",
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/o/${input.orgSlug}/campaigns`);
  revalidatePath(`/o/${input.orgSlug}/campaigns/${campaign.id}`);
  return campaign;
}

export async function deleteCampaign(input: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
}) {
  await requireOrganizationPermission(input.organizationId, {
    campaigns: ["delete"],
  });

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: input.campaignId,
      organizationId: input.organizationId,
    },
  });
  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "sending") {
    throw new Error("Annulez d'abord la campagne en cours d'envoi");
  }

  await prisma.campaign.delete({ where: { id: campaign.id } });
  revalidatePath(`/o/${input.orgSlug}/campaigns`);
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
  const allowedImage = ["image/jpeg", "image/png"];
  const allowedVideo = ["video/mp4", "video/3gpp"];
  if (isImage && !allowedImage.includes(input.mimeType)) {
    throw new Error("Image : JPEG ou PNG uniquement (limite Klambo/WhatsApp)");
  }
  if (isVideo && !allowedVideo.includes(input.mimeType)) {
    throw new Error("Vidéo : MP4 ou 3GPP uniquement (limite Klambo/WhatsApp)");
  }
  if (isImage && size < 2_000) {
    throw new Error("Image trop petite — utilisez une vraie photo");
  }
  if (isVideo && size < 10_000) {
    throw new Error("Vidéo trop petite — utilisez un vrai fichier MP4");
  }
  if (isImage && size > 5 * 1024 * 1024) {
    throw new Error("Image max 5 Mo (limite Klambo)");
  }
  if (isVideo && size > 16 * 1024 * 1024) {
    throw new Error("Vidéo max 16 Mo (limite Klambo)");
  }

  const kind = isImage ? "image" : "video";
  const { relativePath } = await writeOrgUpload({
    organizationId: input.organizationId,
    filename: input.filename,
    buffer: buf,
  });

  let klamboMediaId: string | null = null;
  try {
    const { client } = await getKlamboClient();
    try {
      const registered = await client.registerMedia({
        relative_path: relativePath.replace(/\\/g, "/"),
        mime_type: input.mimeType,
        filename: input.filename,
      });
      klamboMediaId = registered.id;
    } catch {
      const uploaded = await client.uploadMedia(
        buf,
        input.filename,
        input.mimeType,
      );
      klamboMediaId = uploaded.id;
    }
  } catch (err) {
    console.warn(
      "[uploadMediaAsset] push Klambo différé:",
      err instanceof Error ? err.message : err,
    );
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      organizationId: input.organizationId,
      filename: input.filename,
      mimeType: input.mimeType,
      size,
      kind,
      storagePath: relativePath,
      klamboMediaId,
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
  messageType?: "text" | "image" | "video";
  mediaId?: string | null;
  link1Label?: string | null;
  link1Url?: string | null;
  link2Label?: string | null;
  link2Url?: string | null;
}) {
  await requireOrganizationPermission(input.organizationId, {
    templates: ["create"],
  });

  const messageType = input.messageType ?? "text";
  if (
    (messageType === "image" || messageType === "video") &&
    !input.mediaId
  ) {
    throw new Error("Un média est requis pour un template image/vidéo");
  }

  if (input.mediaId) {
    const media = await prisma.mediaAsset.findFirst({
      where: { id: input.mediaId, organizationId: input.organizationId },
    });
    if (!media) throw new Error("Média introuvable");
    if (media.kind !== messageType) {
      throw new Error("Le type de média ne correspond pas au template");
    }
  }

  const link1Url = input.link1Url?.trim() || null;
  const link2Url = input.link2Url?.trim() || null;
  if (link1Url && !/^https?:\/\//i.test(link1Url)) {
    throw new Error("Le lien 1 doit commencer par http:// ou https://");
  }
  if (link2Url && !/^https?:\/\//i.test(link2Url)) {
    throw new Error("Le lien 2 doit commencer par http:// ou https://");
  }

  const tpl = await prisma.messageTemplate.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      body: input.body,
      messageType,
      mediaId: messageType === "text" ? null : input.mediaId || null,
      link1Label: link1Url ? input.link1Label?.trim() || "Lien" : null,
      link1Url,
      link2Label: link2Url ? input.link2Label?.trim() || "Lien" : null,
      link2Url,
    },
  });
  revalidatePath(`/o/${input.orgSlug}/templates`);
  revalidatePath(`/o/${input.orgSlug}/campaigns/new`);
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
