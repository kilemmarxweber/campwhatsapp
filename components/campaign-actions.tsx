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
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";

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
        <ConfirmAlertDialogButton
          className="btn btn-primary"
          pending={pending}
          disabled={pending}
          title="Renvoyer la campagne ?"
          description="Tous les destinataires seront remis en file et recevront à nouveau le message (délai ~14 s entre chaque envoi)."
          confirmLabel="Renvoyer"
          variant="default"
          onConfirm={() =>
            startTransition(async () => {
              try {
                await resendCampaign({ organizationId, orgSlug, campaignId });
                toast.success("Renvoi démarré");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            })
          }
        >
          Renvoyer
        </ConfirmAlertDialogButton>
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
        <ConfirmAlertDialogButton
          className="btn btn-danger"
          pending={pending}
          disabled={pending}
          title="Supprimer la campagne ?"
          description="Cette action est définitive. Les destinataires et l’historique d’envoi seront effacés."
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={() =>
            startTransition(async () => {
              try {
                await deleteCampaign({ organizationId, orgSlug, campaignId });
                toast.success("Campagne supprimée");
                router.push(`/o/${orgSlug}/campaigns`);
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            })
          }
        >
          Supprimer
        </ConfirmAlertDialogButton>
      )}
    </div>
  );
}
