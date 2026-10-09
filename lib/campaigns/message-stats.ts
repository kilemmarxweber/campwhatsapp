import prisma from "@/lib/prisma";
import type { CampaignChannel, RecipientStatus } from "@/prisma/generated/prisma/client";

const COMPLETED_STATUSES: RecipientStatus[] = ["sent", "delivered", "read"];
const FAILED_STATUSES: RecipientStatus[] = ["failed"];

export type ChannelMessageStats = {
  channel: "whatsapp" | "sms";
  completed: number;
  failed: number;
};

async function countForChannel(
  organizationId: string,
  channel: CampaignChannel,
  statuses: RecipientStatus[],
) {
  return prisma.campaignRecipient.count({
    where: {
      status: { in: statuses },
      campaign: {
        organizationId,
        channel,
      },
    },
  });
}

export async function getOrganizationMessageStats(
  organizationId: string,
): Promise<{ whatsapp: ChannelMessageStats; sms: ChannelMessageStats }> {
  const [waOk, waFail, smsOk, smsFail] = await Promise.all([
    countForChannel(organizationId, "whatsapp", COMPLETED_STATUSES),
    countForChannel(organizationId, "whatsapp", FAILED_STATUSES),
    countForChannel(organizationId, "sms", COMPLETED_STATUSES),
    countForChannel(organizationId, "sms", FAILED_STATUSES),
  ]);

  return {
    whatsapp: {
      channel: "whatsapp",
      completed: waOk,
      failed: waFail,
    },
    sms: {
      channel: "sms",
      completed: smsOk,
      failed: smsFail,
    },
  };
}
