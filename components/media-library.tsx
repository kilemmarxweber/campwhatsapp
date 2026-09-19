"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMediaAsset } from "@/lib/campaigns/actions";
import { MediaThumb } from "@/components/media-thumb";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";

type Asset = {
  id: string;
  filename: string;
  kind: string;
  size: number;
  storagePath: string;
  klamboMediaId: string | null;
};

export function MediaLibrary({
  organizationId,
  orgSlug,
  assets,
}: {
  organizationId: string;
  orgSlug: string;
  assets: Asset[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (assets.length === 0) {
    return <p className="text-[var(--fg-muted)]">Aucun média</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((a) => (
        <div key={a.id} className="surface overflow-hidden p-3">
          <MediaThumb
            storagePath={a.storagePath}
            kind={a.kind}
            filename={a.filename}
          />
          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.filename}</p>
              <p className="text-xs text-[var(--fg-muted)]">
                {a.kind} · {(a.size / 1024).toFixed(1)} Ko ·{" "}
                {a.klamboMediaId ? "sur Klambo" : "local seulement"}
              </p>
            </div>
            <ConfirmAlertDialogButton
              className="btn btn-danger !px-2 !py-2 shrink-0"
              pending={pending}
              disabled={pending}
              title="Supprimer ce média ?"
              description={`« ${a.filename} » sera retiré de la bibliothèque et du disque. Les templates/campagnes liés perdront la référence.`}
              confirmLabel="Supprimer"
              variant="destructive"
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await deleteMediaAsset({
                      organizationId,
                      orgSlug,
                      mediaId: a.id,
                    });
                    toast.success("Média supprimé");
                    router.refresh();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erreur");
                  }
                })
              }
            >
              <Trash2 className="size-4" aria-label="Supprimer" />
            </ConfirmAlertDialogButton>
          </div>
        </div>
      ))}
    </div>
  );
}
