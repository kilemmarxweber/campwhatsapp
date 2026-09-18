"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  cancelCampaign,
  retryFailedRecipients,
  startCampaign,
} from "@/lib/campaigns/actions";

export function CampaignActions({
  organizationId,
  orgSlug,
  campaignId,
  status,
  failedCount,
}: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
  status: string;
  failedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "failed") && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await startCampaign({ organizationId, orgSlug, campaignId });
                toast.success("Envoi démarré");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            })
          }
        >
          Lancer
        </button>
      )}
      {status === "sending" && (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await cancelCampaign({ organizationId, orgSlug, campaignId });
              toast.message("Campagne annulée");
              router.refresh();
            })
          }
        >
          Annuler
        </button>
      )}
      {failedCount > 0 && (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await retryFailedRecipients({
                  organizationId,
                  orgSlug,
                  campaignId,
                });
                toast.success("Relance des échecs");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            })
          }
        >
          Relancer échecs ({failedCount})
        </button>
      )}
    </div>
  );
}
