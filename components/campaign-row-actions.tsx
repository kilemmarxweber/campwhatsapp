"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCampaign,
  resendCampaign,
} from "@/lib/campaigns/actions";

export function CampaignRowActions({
  organizationId,
  orgSlug,
  campaignId,
  status,
}: {
  organizationId: string;
  orgSlug: string;
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canEdit = status !== "sending";
  const canResend = ["completed", "cancelled", "failed"].includes(status);
  const canDelete = status !== "sending";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {canResend ? (
        <button
          type="button"
          className="btn btn-ghost !px-2 !py-2"
          disabled={pending}
          title="Renvoyer"
          aria-label="Renvoyer"
          onClick={() => {
            if (
              !confirm(
                "Renvoyer cette campagne à tous les destinataires ?",
              )
            ) {
              return;
            }
            startTransition(async () => {
              try {
                await resendCampaign({
                  organizationId,
                  orgSlug,
                  campaignId,
                });
                toast.success("Renvoi démarré");
                router.push(`/o/${orgSlug}/campaigns/${campaignId}`);
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <RefreshCw className="size-4" />
        </button>
      ) : null}
      {canEdit ? (
        <Link
          href={`/o/${orgSlug}/campaigns/${campaignId}/edit`}
          className="btn btn-ghost !px-2 !py-2"
          title="Modifier"
          aria-label="Modifier"
        >
          <Pencil className="size-4" />
        </Link>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className="btn btn-danger !px-2 !py-2"
          disabled={pending}
          title="Supprimer"
          aria-label="Supprimer"
          onClick={() => {
            if (!confirm("Supprimer définitivement cette campagne ?")) {
              return;
            }
            startTransition(async () => {
              try {
                await deleteCampaign({
                  organizationId,
                  orgSlug,
                  campaignId,
                });
                toast.success("Campagne supprimée");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              }
            });
          }}
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
