import prisma from "@/lib/prisma";
import type {
  CampaignChannel,
  RecipientStatus,
} from "@/prisma/generated/prisma/client";

const COMPLETED_STATUSES: RecipientStatus[] = ["sent", "delivered", "read"];
const FAILED_STATUSES: RecipientStatus[] = ["failed"];

export type ChannelMessageStats = {
  channel: "whatsapp" | "sms";
  completed: number;
  failed: number;
};

export type DateRange = {
  from: Date;
  to: Date;
};

export type CampaignReportRow = {
  id: string;
  name: string;
  channel: "whatsapp" | "sms";
  status: string;
  messageType: string;
  createdAt: Date;
  completedAt: Date | null;
  recipientsTotal: number;
  recipientsCompleted: number;
  recipientsFailed: number;
};

function recipientDateFilter(range?: DateRange) {
  if (!range) return {};
  return {
    createdAt: {
      gte: range.from,
      lt: range.to,
    },
  };
}

async function countForChannel(
  organizationId: string,
  channel: CampaignChannel,
  statuses: RecipientStatus[],
  range?: DateRange,
) {
  return prisma.campaignRecipient.count({
    where: {
      status: { in: statuses },
      ...recipientDateFilter(range),
      campaign: {
        organizationId,
        channel,
      },
    },
  });
}

export async function getOrganizationMessageStats(
  organizationId: string,
  range?: DateRange,
): Promise<{ whatsapp: ChannelMessageStats; sms: ChannelMessageStats }> {
  const [waOk, waFail, smsOk, smsFail] = await Promise.all([
    countForChannel(organizationId, "whatsapp", COMPLETED_STATUSES, range),
    countForChannel(organizationId, "whatsapp", FAILED_STATUSES, range),
    countForChannel(organizationId, "sms", COMPLETED_STATUSES, range),
    countForChannel(organizationId, "sms", FAILED_STATUSES, range),
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

export async function getCampaignReportRows(
  organizationId: string,
  range: DateRange,
): Promise<CampaignReportRow[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: range.from,
        lt: range.to,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      channel: true,
      status: true,
      messageType: true,
      createdAt: true,
      completedAt: true,
      recipients: {
        select: { status: true },
      },
    },
  });

  return campaigns.map((c) => {
    let recipientsCompleted = 0;
    let recipientsFailed = 0;
    for (const r of c.recipients) {
      if (COMPLETED_STATUSES.includes(r.status)) recipientsCompleted += 1;
      if (FAILED_STATUSES.includes(r.status)) recipientsFailed += 1;
    }
    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      messageType: c.messageType,
      createdAt: c.createdAt,
      completedAt: c.completedAt,
      recipientsTotal: c.recipients.length,
      recipientsCompleted,
      recipientsFailed,
    };
  });
}

/** Début / fin de journée locale (date ISO YYYY-MM-DD). */
export function parseReportRange(input: {
  from?: string;
  to?: string;
}): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const defaultFrom = new Date(year, month, 1);
  const defaultTo = new Date(year, month + 1, 1);

  const from = input.from ? parseDayStart(input.from) : defaultFrom;
  let toExclusive = input.to ? parseDayStart(input.to) : defaultTo;

  // `to` inclusif → lendemain 00:00
  if (input.to) {
    toExclusive = new Date(toExclusive);
    toExclusive.setDate(toExclusive.getDate() + 1);
  }

  if (toExclusive <= from) {
    toExclusive = new Date(from);
    toExclusive.setDate(toExclusive.getDate() + 1);
  }

  return { from, to: toExclusive };
}

function parseDayStart(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  return new Date(y, m, d, 0, 0, 0, 0);
}

export function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Dernier jour inclus de la plage exclusive `to`. */
export function inclusiveEndDate(range: DateRange): Date {
  const end = new Date(range.to);
  end.setDate(end.getDate() - 1);
  return end;
}
