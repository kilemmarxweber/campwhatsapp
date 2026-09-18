import { readFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { getKlamboClient } from "@/lib/klambo/org";
import { renderTemplate } from "@/lib/campaigns/render-template";

const SEND_DELAY_MS = 200;

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
    campaign.media &&
    !klamboMediaId
  ) {
    const absolute = path.isAbsolute(campaign.media.storagePath)
      ? campaign.media.storagePath
      : path.join(process.cwd(), campaign.media.storagePath);
    const buf = await readFile(absolute);
    const blob = new Blob([buf], { type: campaign.media.mimeType });
    const uploaded = await client.uploadMedia(blob, campaign.media.filename);
    klamboMediaId = uploaded.id;
    await prisma.mediaAsset.update({
      where: { id: campaign.media.id },
      data: { klamboMediaId },
    });
  }

  for (const recipient of campaign.recipients) {
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

    await sleep(SEND_DELAY_MS);
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
