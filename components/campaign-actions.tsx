"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  cancelCampaign,
  deleteCampaign,
  resendCampaign,
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
  const canResend = ["completed", "cancelled", "failed"].includes(status);
  const canEdit = status !== "sending";
  const canDelete = status !== "sending";

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
      {canResend && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => {
            if (
              !confirm("Renvoyer cette campagne à tous les destinataires ?")
            ) {
              return;
            }
            startTransition(async () => {
              try {
                await resendCampaign({ organizationId, orgSlug, campaignId });
                toast.success("Renvoi démarré");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          Renvoyer
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
      {canEdit && (
        <Link
          href={`/o/${orgSlug}/campaigns/${campaignId}/edit`}
          className="btn btn-ghost"
        >
          Modifier
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("Supprimer définitivement cette campagne ?")) {
              return;
            }
            startTransition(async () => {
              try {
                await deleteCampaign({ organizationId, orgSlug, campaignId });
                toast.success("Campagne supprimée");
                router.push(`/o/${orgSlug}/campaigns`);
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          Supprimer
        </button>
      )}
    </div>
  );
}
