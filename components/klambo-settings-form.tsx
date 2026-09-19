"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { saveKlamboSettings } from "@/lib/klambo/actions";

export function KlamboSettingsForm({
  initial,
  webhookEndpoint,
}: {
  initial: {
    apiKey: string;
    apiKeyMasked: string | null;
    baseUrl: string;
    defaultCountry: string;
    hasWebhookSecret: boolean;
    configured: boolean;
  };
  webhookEndpoint: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [defaultCountry, setDefaultCountry] = useState(initial.defaultCountry);

  useEffect(() => {
    setApiKey(initial.apiKey);
    setBaseUrl(initial.baseUrl);
    setDefaultCountry(initial.defaultCountry);
  }, [initial.apiKey, initial.baseUrl, initial.defaultCountry]);

  const configured = initial.configured && Boolean(initial.apiKey);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            État de la connexion
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--fg-muted)]">
            {configured
              ? `Clé ${initial.apiKeyMasked}`
              : "Aucune clé enregistrée"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={configured ? "badge badge-ok" : "badge badge-warn"}
          >
            {configured ? "Connecté" : "Non configuré"}
          </span>
          <span
            className={
              initial.hasWebhookSecret ? "badge badge-ok" : "badge badge-warn"
            }
          >
            {initial.hasWebhookSecret
              ? "Webhook actif"
              : "Webhook local (non enregistré)"}
          </span>
        </div>
      </div>

      <form
        className="surface flex flex-col gap-6 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!apiKey.trim()) {
            toast.error("Collez une clé API");
            return;
          }
          startTransition(async () => {
            try {
              await saveKlamboSettings({
                apiKey: apiKey.trim(),
                baseUrl,
                defaultCountry,
              });
              toast.success("Paramètres enregistrés");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      >
        <div>
          <h2 className="text-lg font-medium text-[var(--tvs-blue-deep)]">
            Identifiants
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Une seule clé pour toutes les succursales. Utilisez l’œil pour
            afficher ou masquer la valeur.
          </p>
        </div>

        <div className="field">
          <label htmlFor="klambo-api-key">Clé API</label>
          <div className="relative">
            <input
              id="klambo-api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_… ou sk_test_…"
              autoComplete="off"
              className="pr-11"
              required
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-[var(--fg-muted)] hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Masquer la clé" : "Afficher la clé"}
            >
              {showKey ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Obtenez une clé sur{" "}
            <a
              href="https://whatsapp.klambocore.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--tvs-blue)] underline underline-offset-2"
            >
              whatsapp.klambocore.com
            </a>
            . Pour la prod, utilisez une clé{" "}
            <code className="font-mono">sk_live_…</code> avec Base URL{" "}
            <code className="font-mono">https://whatsapp-api.klambocore.com</code>
            . Une clé <code className="font-mono">sk_test_…</code> locale
            nécessite une Base URL locale (ex.{" "}
            <code className="font-mono">http://localhost:3005</code>).
          </p>
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <h3 className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            Options
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="field sm:col-span-2">
              <label htmlFor="klambo-base-url">Base URL</label>
              <input
                id="klambo-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="klambo-country">Pays téléphone (ISO)</label>
              <input
                id="klambo-country"
                value={defaultCountry}
                onChange={(e) =>
                  setDefaultCountry(e.target.value.toUpperCase())
                }
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md bg-[var(--tvs-blue-soft)] px-4 py-3 text-sm text-[var(--tvs-blue-deep)]">
          <p className="font-medium">Endpoint statut</p>
          <code className="mt-1 block break-all text-xs">{webhookEndpoint}</code>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
