"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveKlamboSettings } from "@/lib/klambo/actions";

export function KlamboSettingsForm({
  organizationId,
  orgSlug,
  initial,
}: {
  organizationId: string;
  orgSlug: string;
  initial: {
    apiKeyMasked: string | null;
    baseUrl: string;
    defaultCountry: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [defaultCountry, setDefaultCountry] = useState(initial.defaultCountry);

  return (
    <form
      className="surface flex max-w-xl flex-col gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!apiKey.trim()) {
          toast.error("Collez une clé API");
          return;
        }
        startTransition(async () => {
          try {
            await saveKlamboSettings({
              organizationId,
              orgSlug,
              apiKey,
              baseUrl,
              defaultCountry,
            });
            toast.success("Paramètres enregistrés");
            setApiKey("");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
          }
        });
      }}
    >
      <h2 className="text-lg font-medium">KlamboWhatsapp</h2>
      <p className="text-sm text-[var(--fg-muted)]">
        Clé actuelle : {initial.apiKeyMasked ?? "non configurée"}
      </p>
      <div className="field">
        <label>Nouvelle clé API (sk_test_… / sk_live_…)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_live_…"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label>Base URL</label>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      </div>
      <div className="field">
        <label>Pays téléphone par défaut (ISO)</label>
        <input
          value={defaultCountry}
          onChange={(e) => setDefaultCountry(e.target.value.toUpperCase())}
          maxLength={2}
        />
      </div>
      <p className="text-xs text-[var(--fg-muted)]">
        Webhook statut :{" "}
        <code className="text-[var(--accent)]">
          {typeof window !== "undefined"
            ? `${window.location.origin}/api/webhooks/klambo`
            : "/api/webhooks/klambo"}
        </code>
      </p>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Enregistrer
      </button>
    </form>
  );
}
