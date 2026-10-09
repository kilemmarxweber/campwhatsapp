"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { saveSmsSettings } from "@/lib/sms/actions";
import {
  DEFAULT_INFOBIP_BASE_URL,
  DEFAULT_INFOBIP_SENDER,
} from "@/lib/sms/validate";

export function InfobipSmsSettingsForm({
  tenantId,
  organizationId,
  orgSlug,
  organizationName,
  initial,
}: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  organizationName: string;
  initial: {
    apiKey: string;
    apiKeyMasked: string | null;
    baseUrl: string;
    sender: string;
    configured: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || DEFAULT_INFOBIP_BASE_URL);
  const [sender, setSender] = useState(initial.sender || DEFAULT_INFOBIP_SENDER);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setApiKey(initial.apiKey);
    setBaseUrl(initial.baseUrl || DEFAULT_INFOBIP_BASE_URL);
    setSender(initial.sender || DEFAULT_INFOBIP_SENDER);
  }, [initial.apiKey, initial.baseUrl, initial.sender]);

  const configured = initial.configured && Boolean(initial.apiKey);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            État de la connexion
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--fg-muted)]">
            {configured
              ? `Clé ${initial.apiKeyMasked}`
              : "Aucun compte Infobip enregistré"}
          </p>
        </div>
        <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
          {configured ? "Connecté" : "Non configuré"}
        </span>
      </div>

      <form
        className="surface flex flex-col gap-6 p-6 sm:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              const result = await saveSmsSettings({
                tenantId,
                organizationId,
                orgSlug,
                apiKey,
                baseUrl,
                sender,
              });
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              toast.success("Paramètres SMS enregistrés");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      >
        <div>
          <h2 className="text-lg font-medium text-[var(--tvs-blue-deep)]">
            Compte Infobip
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Clé API et URL de base de {organizationName}. Ses succursales
            envoient les SMS avec ce compte. WhatsApp continue d&apos;utiliser
            Klambo.
          </p>
        </div>

        <div className="field">
          <label htmlFor="infobip-base-url">URL de base API</label>
          <input
            id="infobip-base-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value.trim())}
            placeholder={DEFAULT_INFOBIP_BASE_URL}
            autoComplete="off"
            required
          />
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Indiquée dans le{" "}
            <a
              href="https://portal.infobip.com/onboarding-guide"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--tvs-blue)] underline underline-offset-2"
            >
              guide Infobip
            </a>
            , par exemple https://l2gerd.api.infobip.com.
          </p>
        </div>

        <div className="field">
          <label htmlFor="infobip-api-key">Clé API</label>
          <div className="relative">
            <input
              id="infobip-api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Clé API du portail Infobip"
              autoComplete="off"
              className="pr-11"
              required={!configured}
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-[var(--fg-muted)] hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Masquer la clé" : "Afficher la clé"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Envoyée dans l&apos;en-tête <code className="font-mono">Authorization: App …</code>.
            La clé est chiffrée en base. Laissez le champ tel quel pour conserver
            la clé déjà enregistrée.
          </p>
        </div>

        <div className="field">
          <label htmlFor="infobip-sender">Expéditeur</label>
          <input
            id="infobip-sender"
            value={sender}
            onChange={(e) => setSender(e.target.value.trim())}
            placeholder={DEFAULT_INFOBIP_SENDER}
            autoComplete="off"
            required
          />
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Valeur <code className="font-mono">sender</code> des SMS, par exemple ServiceSMS.
          </p>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "Vérification…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
