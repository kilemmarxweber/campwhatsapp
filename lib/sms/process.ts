import prisma from "@/lib/prisma";
import { renderTemplate } from "@/lib/campaigns/render-template";
import { sendTwilioSms, TwilioSmsError } from "@/lib/sms/client";
import { getTwilioSmsCredentials } from "@/lib/sms/config";

const SMS_MAX_LENGTH = 1600;

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

function isRateLimit(err: unknown) {
  return (
    err instanceof TwilioSmsError &&
    (err.status === 429 || /rate limit|20429/i.test(err.message))
  );
}

function isAuthFailure(err: unknown) {
  return (
    err instanceof TwilioSmsError && (err.status === 401 || err.status === 403)
  );
}

/** Envoi d'une campagne SMS via Twilio. Le canal WhatsApp n'est pas concerné. */
export async function processSmsCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      organization: { select: { tenantId: true } },
      recipients: {
        where: { status: { in: ["pending", "failed"] } },
        include: { contact: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign || campaign.channel !== "sms") return;
  if (campaign.status === "cancelled") return;

  let credentials: Awaited<ReturnType<typeof getTwilioSmsCredentials>>;
  try {
    credentials = await getTwilioSmsCredentials(campaign.organization.tenantId);
  } catch (err) {
    const error = err instanceof Error ? err.message : "SMS Twilio non configuré.";
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

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", startedAt: campaign.startedAt ?? new Date() },
  });

  let stopRemaining = false;
  let stopError: string | null = null;

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

    if (body.length > SMS_MAX_LENGTH) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          renderedBody: body,
          status: "failed",
          error: `Message trop long pour un SMS (${body.length} caractères, max ${SMS_MAX_LENGTH}).`,
        },
      });
      continue;
    }

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { renderedBody: body, status: "queued" },
    });

    try {
      const result = await sendTwilioSms({
        accountSid: credentials.accountSid,
        authToken: credentials.authToken,
        from: credentials.fromNumber,
        to: recipient.contact.phone,
        body,
      });
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          klamboMessageId: result.sid,
          sentAt: new Date(),
          error: null,
          renderedBody: body,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Erreur d'envoi SMS";
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "failed", error, renderedBody: body },
      });
      if (isRateLimit(err)) {
        await prisma.campaignRecipient.updateMany({
          where: { campaignId, status: { in: ["pending", "queued"] } },
          data: { status: "pending" },
        });
        stopRemaining = true;
        break;
      }
      if (isAuthFailure(err)) {
        stopRemaining = true;
        stopError = error;
        break;
      }
    }
  }

  if (stopRemaining && stopError) {
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
      status:
        remaining > 0 ? "sending" : failed === total ? "failed" : "completed",
      completedAt: remaining > 0 ? null : new Date(),
    },
  });
}
