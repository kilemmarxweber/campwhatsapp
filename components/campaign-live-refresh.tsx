"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Rafraîchit la page tant que la campagne envoie (statuts destinataires). */
export function CampaignLiveRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    router.refresh();
    const id = window.setInterval(() => {
      router.refresh();
    }, 3_000);

    return () => window.clearInterval(id);
  }, [active, router]);

  if (!active) return null;

  return (
    <p className="text-sm text-[var(--fg-muted)]" aria-live="polite">
      Envoi en cours — file ~14 s entre chaque message · mise à jour auto…
    </p>
  );
}
