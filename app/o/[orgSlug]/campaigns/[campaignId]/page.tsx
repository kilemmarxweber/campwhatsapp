import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOrganizationBySlug } from "@/lib/auth/organization-permission";
import { CampaignActions } from "@/components/campaign-actions";
import { MessageCardPreview } from "@/components/message-card-preview";
import { renderTemplate } from "@/lib/campaigns/render-template";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; campaignId: string }>;
}) {
  const { orgSlug, campaignId } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: org.id },
    include: {
      media: true,
      recipients: {
        include: { contact: { select: { phone: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!campaign) notFound();

  const sample = campaign.recipients[0]?.contact;
  const previewCaption = sample
    ? renderTemplate(campaign.bodyTemplate, {
        name: sample.name ?? "",
        phone: sample.phone,
      })
    : campaign.bodyTemplate;

  const stats = {
    total: campaign.recipients.length,
    sent: campaign.recipients.filter((r) =>
      ["sent", "delivered", "read"].includes(r.status),
    ).length,
    failed: campaign.recipients.filter((r) => r.status === "failed").length,
    pending: campaign.recipients.filter((r) =>
      ["pending", "queued"].includes(r.status),
    ).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{campaign.name}</h1>
          <p className="text-[var(--fg-muted)]">
            {campaign.messageType} ·{" "}
            <span className="badge">{campaign.status}</span>
          </p>
        </div>
        <CampaignActions
          organizationId={org.id}
          orgSlug={orgSlug}
          campaignId={campaign.id}
          status={campaign.status}
          failedCount={stats.failed}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Envoyés", stats.sent],
          ["Échecs", stats.failed],
          ["En attente", stats.pending],
        ].map(([label, value]) => (
          <div key={label as string} className="surface p-4">
            <p className="text-sm text-[var(--fg-muted)]">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--tvs-blue-deep)]">
            Carte envoyée
          </p>
          <MessageCardPreview
            messageType={campaign.messageType}
            caption={previewCaption}
            media={
              campaign.media
                ? {
                    storagePath: campaign.media.storagePath,
                    kind: campaign.media.kind,
                    filename: campaign.media.filename,
                  }
                : null
            }
          />
        </div>
        <div className="surface p-5">
          <p className="mb-2 text-sm text-[var(--fg-muted)]">
            Template brut
            {campaign.media?.klamboMediaId ? " · Klambo OK" : ""}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {campaign.bodyTemplate}
          </pre>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Message</th>
              <th>Statut</th>
              <th>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {campaign.recipients.map((r) => (
              <tr key={r.id}>
                <td>
                  <div>{r.contact.name || "—"}</div>
                  <div className="font-mono text-xs text-[var(--fg-muted)]">
                    {r.contact.phone}
                  </div>
                </td>
                <td className="max-w-xs truncate text-sm">{r.renderedBody}</td>
                <td>
                  <span className="badge">{r.status}</span>
                </td>
                <td className="text-sm text-[var(--danger)]">
                  {r.error || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
