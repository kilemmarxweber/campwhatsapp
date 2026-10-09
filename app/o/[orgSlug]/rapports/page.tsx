import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import {
  getCampaignReportRows,
  getOrganizationMessageStats,
  inclusiveEndDate,
  parseReportRange,
  toInputDate,
} from "@/lib/campaigns/message-stats";
import { ReportsClient } from "@/components/reports-client";

export default async function RapportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { orgSlug } = await params;
  const { from: fromRaw, to: toRaw } = await searchParams;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const range = parseReportRange({ from: fromRaw, to: toRaw });
  const from = toInputDate(range.from);
  const to = toInputDate(inclusiveEndDate(range));

  const [messageStats, campaigns] = await Promise.all([
    getOrganizationMessageStats(org.id, range),
    getCampaignReportRows(org.id, range),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--tvs-blue-deep)]">
          Rapport
        </h1>
        <p className="text-[var(--fg-muted)]">
          Statistiques WhatsApp &amp; SMS sur une période — export PDF ou Excel
        </p>
      </div>

      <ReportsClient
        orgSlug={orgSlug}
        from={from}
        to={to}
        whatsapp={messageStats.whatsapp}
        sms={messageStats.sms}
        campaigns={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          messageType: c.messageType,
          createdAt: toInputDate(c.createdAt),
          recipientsTotal: c.recipientsTotal,
          recipientsCompleted: c.recipientsCompleted,
          recipientsFailed: c.recipientsFailed,
        }))}
      />
    </div>
  );
}
