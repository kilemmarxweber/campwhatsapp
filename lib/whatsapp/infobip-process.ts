import prisma from "@/lib/prisma";
import {
  toInfobipPlaceholders,
  valuesForPlaceholderKeys,
} from "@/lib/campaigns/render-template";
import { InfobipSmsError } from "@/lib/sms/client";
import { getInfobipWhatsappCredentials } from "@/lib/whatsapp/config";
import { sendInfobipWhatsappTemplate } from "@/lib/whatsapp/infobip-client";
import {
  absoluteUploadUrl,
  isInfobipReachableMediaUrl,
} from "@/lib/whatsapp/media-url";

function contactVars(contact: {
  name: string | null;
  phone: string;
  email: string | null;
  variables: unknown;
}) {
  const custom =
    contact.variables &&
    typeof contact.variables === "object" &&
    !Array.isArray(contact.variables)
      ? (contact.variables as Record<string, unknown>)
      : {};
  return {
    name: contact.name ?? "",
    phone: contact.phone,
    email: contact.email ?? "",
    ...Object.fromEntries(
      Object.entries(custom).map(([key, value]) => [key, value == null ? "" : String(value)]),
    ),
  };
}

export async function processInfobipWhatsappCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      organization: { select: { tenantId: true } },
      media: true,
      recipients: {
        where: { status: { in: ["pending", "failed"] } },
        include: { contact: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign || campaign.channel !== "whatsapp") return;
  if (campaign.status === "cancelled") return;

  const templateName = campaign.whatsappTemplateName?.trim() ?? "";
  const language = campaign.whatsappLanguage?.trim() || "en";
  if (!templateName) {
    const error =
      "Indiquez le nom du modèle Infobip (templateName) sur le template WhatsApp.";
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed", completedAt: new Date() },
    });
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, status: { in: ["pending", "queued", "failed"] } },
      data: { status: "failed", error },
    });
    throw new Error(error);
  }

  let credentials: Awaited<ReturnType<typeof getInfobipWhatsappCredentials>>;
  try {
    credentials = await getInfobipWhatsappCredentials(campaign.organization.tenantId);
  } catch (err) {
    const error = err instanceof Error ? err.message : "WhatsApp Infobip non configuré.";
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "failed", completedAt: new Date() },
    });
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, status: { in: ["pending", "queued", "failed"] } },
      data: { status: "failed", error },
    });
    throw err;
  }

  const wantsMedia =
    campaign.messageType === "image" || campaign.messageType === "video";
  let header: { type: "IMAGE" | "VIDEO"; mediaUrl: string } | undefined;
  if (wantsMedia) {
    if (!campaign.media) {
      const error = "Un média est requis pour ce modèle WhatsApp.";
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed", completedAt: new Date() },
      });
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, status: { in: ["pending", "queued", "failed"] } },
        data: { status: "failed", error },
      });
      throw new Error(error);
    }
    const mediaUrl = absoluteUploadUrl(campaign.media.storagePath);
    if (!isInfobipReachableMediaUrl(mediaUrl)) {
      const error =
        "Infobip ne peut pas télécharger ce média : il doit être servi en https public, pas depuis cet ordinateur.";
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed", completedAt: new Date() },
      });
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, status: { in: ["pending", "queued", "failed"] } },
        data: { status: "failed", error },
      });
      throw new Error(error);
    }
    header = {
      type: campaign.messageType === "image" ? "IMAGE" : "VIDEO",
      mediaUrl,
    };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", startedAt: campaign.startedAt ?? new Date() },
  });

  let stopError: string | null = null;
  for (const recipient of campaign.recipients) {
    const live = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (live?.status === "cancelled") break;

    const vars = contactVars(recipient.contact);
    const placeholders = valuesForPlaceholderKeys(
      toInfobipPlaceholders(campaign.bodyTemplate).keys,
      vars,
    );
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { renderedBody: campaign.bodyTemplate, status: "queued" },
    });

    try {
      const result = await sendInfobipWhatsappTemplate({
        apiKey: credentials.apiKey,
        baseUrl: credentials.baseUrl,
        from: credentials.fromNumber,
        to: recipient.contact.phone,
        templateName,
        language,
        placeholders,
        header,
      });
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          klamboMessageId: result.messageId,
          sentAt: new Date(),
          error: null,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Erreur d'envoi WhatsApp";
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", error },
      });
      if (err instanceof InfobipSmsError && (err.status === 401 || err.status === 403)) {
        stopError = error;
        break;
      }
    }
  }

  if (stopError) {
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, status: { in: ["pending", "queued"] } },
      data: { status: "failed", error: stopError },
    });
  }

  const remaining = await prisma.campaignRecipient.count({
    where: { campaignId, status: { in: ["pending", "queued"] } },
  });
  const failed = await prisma.campaignRecipient.count({
    where: { campaignId, status: "failed" },
  });
  const total = await prisma.campaignRecipient.count({ where: { campaignId } });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: remaining > 0 ? "sending" : failed === total ? "failed" : "completed",
      completedAt: remaining > 0 ? null : new Date(),
    },
  });
}
