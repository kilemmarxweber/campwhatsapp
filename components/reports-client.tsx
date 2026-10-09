"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OverviewMessageCharts } from "@/components/overview-message-charts";
import { usePendingOverlay } from "@/components/page-loader";
import type { ChannelMessageStats } from "@/lib/campaigns/message-stats";

type CampaignRow = {
  id: string;
  name: string;
  channel: "whatsapp" | "sms";
  status: string;
  messageType: string;
  createdAt: string;
  recipientsTotal: number;
  recipientsCompleted: number;
  recipientsFailed: number;
};

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filenameFromHeader(header: string | null, fallback: string) {
  if (!header) return fallback;
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

export function ReportsClient({
  orgSlug,
  from,
  to,
  whatsapp,
  sms,
  campaigns,
}: {
  orgSlug: string;
  from: string;
  to: string;
  whatsapp: ChannelMessageStats;
  sms: ChannelMessageStats;
  campaigns: CampaignRow[];
}) {
  const router = useRouter();
  const { pending, startTransition } = usePendingOverlay("Export…");
  const [navPending, startNav] = useTransition();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  function applyPeriod() {
    if (!fromValue || !toValue) {
      toast.error("Indiquez une période complète");
      return;
    }
    if (fromValue > toValue) {
      toast.error("La date de début doit précéder la fin");
      return;
    }
    startNav(() => {
      const params = new URLSearchParams({
        from: fromValue,
        to: toValue,
      });
      router.push(`/o/${orgSlug}/rapports?${params.toString()}`);
    });
  }

  function setThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const f = start.toISOString().slice(0, 10);
    const t = end.toISOString().slice(0, 10);
    setFromValue(f);
    setToValue(t);
    startNav(() => {
      router.push(`/o/${orgSlug}/rapports?from=${f}&to=${t}`);
    });
  }

  async function exportReport(format: "xlsx" | "pdf") {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          from: fromValue,
          to: toValue,
          format,
        });
        const res = await fetch(
          `/api/o/${encodeURIComponent(orgSlug)}/rapports/export?${params}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          let message = "Export échoué";
          try {
            const body = (await res.json()) as { message?: string };
            if (body.message) message = body.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }
        const blob = await res.blob();
        const fallback = `rapport-${orgSlug}.${format === "pdf" ? "pdf" : "xlsx"}`;
        triggerBlobDownload(
          blob,
          filenameFromHeader(res.headers.get("Content-Disposition"), fallback),
        );
        toast.success(format === "pdf" ? "PDF téléchargé" : "Excel téléchargé");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export échoué");
      }
    });
  }

  const busy = pending || navPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div className="field">
            <label htmlFor="report-from">Du</label>
            <input
              id="report-from"
              type="date"
              value={fromValue}
              onChange={(e) => setFromValue(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="report-to">Au</label>
            <input
              id="report-to"
              type="date"
              value={toValue}
              onChange={(e) => setToValue(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button type="button" disabled={busy} onClick={applyPeriod}>
            Appliquer
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={setThisMonth}
          >
            Ce mois
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => exportReport("xlsx")}
          >
            <FileSpreadsheetIcon />
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => exportReport("pdf")}
          >
            <FileTextIcon />
            PDF
          </Button>
        </div>
      </div>

      <OverviewMessageCharts
        whatsapp={whatsapp}
        sms={sms}
        title="Messages sur la période"
        subtitle={`Du ${from} au ${to} — réussis vs échoués`}
      />

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="font-medium">Campagnes de la période</h2>
            <p className="text-xs text-[var(--fg-muted)]">
              {campaigns.length} campagne{campaigns.length === 1 ? "" : "s"}
            </p>
          </div>
          <DownloadIcon className="size-4 text-[var(--fg-muted)]" aria-hidden />
        </div>
        {campaigns.length === 0 ? (
          <p className="p-6 text-sm text-[var(--fg-muted)]">
            Aucune campagne créée sur cette période.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Canal</th>
                  <th>Statut</th>
                  <th>Destinataires</th>
                  <th>Réussis</th>
                  <th>Échoués</th>
                  <th>Créée le</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td className="capitalize">{c.channel}</td>
                    <td>
                      <span className="badge">{c.status}</span>
                    </td>
                    <td>{c.recipientsTotal}</td>
                    <td>{c.recipientsCompleted}</td>
                    <td>{c.recipientsFailed}</td>
                    <td className="text-sm text-[var(--fg-muted)]">
                      {c.createdAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
