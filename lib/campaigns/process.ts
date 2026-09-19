import prisma from "@/lib/prisma";
import { getKlamboClient } from "@/lib/klambo/org";
import { renderTemplate } from "@/lib/campaigns/render-template";
import { readUploadBuffer } from "@/lib/upload-file.server";

const SEND_DELAY_MS = 14_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
      Object.entries(custom).map(([k, v]) => [k, v == null ? "" : String(v)]),
    ),
  };
}

export async function processCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      media: true,
      recipients: {
        where: { status: { in: ["pending", "failed"] } },
        include: { contact: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) throw new Error("Campagne introuvable");
  if (campaign.status === "cancelled") return;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", startedAt: new Date() },
  });

  const { client } = await getKlamboClient();

  let klamboMediaId = campaign.media?.klamboMediaId ?? null;

  if (
    (campaign.messageType === "image" || campaign.messageType === "video") &&
    campaign.media
  ) {
    const buf = await readUploadBuffer(campaign.media.storagePath);

    if (campaign.messageType === "image" && buf.byteLength < 2_000) {
      throw new Error(
        `Image trop petite (${buf.byteLength} o). Uploadez une vraie photo JPEG/PNG (max 5 Mo).`,
      );
    }
    if (campaign.messageType === "video" && buf.byteLength < 10_000) {
      throw new Error(
        `Vidéo trop petite (${buf.byteLength} o). Uploadez un vrai fichier MP4 (max 16 Mo).`,
      );
    }

    // 1) Si UPLOAD_DIR partagé : register sans re-copie
    // 2) Sinon : multipart POST /v1/media (option A)
    try {
      const registered = await client.registerMedia({
        relative_path: campaign.media.storagePath.replace(/\\/g, "/"),
        mime_type: campaign.media.mimeType,
        filename: campaign.media.filename,
      });
      klamboMediaId = registered.id;
    } catch {
      const uploaded = await client.uploadMedia(
        buf,
        campaign.media.filename,
        campaign.media.mimeType,
      );
      klamboMediaId = uploaded.id;
    }

    await prisma.mediaAsset.update({
      where: { id: campaign.media.id },
      data: { klamboMediaId },
    });
  }

  if (
    (campaign.messageType === "image" || campaign.messageType === "video") &&
    !klamboMediaId
  ) {
    throw new Error("Média Klambo manquant pour cette campagne");
  }

  for (let i = 0; i < campaign.recipients.length; i++) {
    const recipient = campaign.recipients[i]!;
    const live = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (live?.status === "cancelled") break;

    const body = renderTemplate(
      campaign.bodyTemplate,
      contactVars(recipient.contact),
    );

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { renderedBody: body, status: "queued" },
    });

    try {
      const payload =
        campaign.messageType === "text"
          ? {
              to: recipient.contact.phone,
              type: "text" as const,
              text: body,
              idempotency_key: `${campaignId}:${recipient.contactId}`,
            }
          : {
              to: recipient.contact.phone,
              type: campaign.messageType,
              caption: body,
              media: { id: klamboMediaId! },
              filename: campaign.media?.filename,
              idempotency_key: `${campaignId}:${recipient.contactId}`,
            };

      const result = await client.send(payload);
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          klamboMessageId: result.id,
          sentAt: new Date(),
          error: null,
          renderedBody: body,
        },
      });
    } catch (err) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : "Erreur d'envoi",
          renderedBody: body,
        },
      });
    }

    if (i < campaign.recipients.length - 1) {
      await sleep(SEND_DELAY_MS);
    }
  }

  const remaining = await prisma.campaignRecipient.count({
    where: {
      campaignId,
      status: { in: ["pending", "queued"] },
    },
  });

  const failed = await prisma.campaignRecipient.count({
    where: { campaignId, status: "failed" },
  });

  const total = await prisma.campaignRecipient.count({
    where: { campaignId },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status:
        remaining > 0
          ? "sending"
          : failed === total
            ? "failed"
            : "completed",
      completedAt: remaining > 0 ? null : new Date(),
    },
  });
}

/** Lance le traitement sans bloquer la réponse HTTP. */
export function enqueueCampaign(campaignId: string) {
  void processCampaign(campaignId).catch((err) => {
    console.error("[campaign]", campaignId, err);
    void prisma.campaign
      .update({
        where: { id: campaignId },
        data: { status: "failed" },
      })
      .catch(() => undefined);
  });
}
