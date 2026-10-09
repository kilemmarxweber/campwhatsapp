"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  saveInfobipWhatsappSettings,
  setWhatsappProvider,
} from "@/lib/whatsapp/actions";
import { DEFAULT_INFOBIP_WHATSAPP_BASE_URL } from "@/lib/whatsapp/validate";
import type { WhatsappProvider } from "@/lib/whatsapp/config";

export function WhatsappProviderSettings({
  tenantId,
  organizationId,
  orgSlug,
  organizationName,
  initial,
  klambo,
}: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  organizationName: string;
  initial: {
    apiKey: string;
    apiKeyMasked: string | null;
    baseUrl: string;
    fromNumber: string;
    configured: boolean;
    provider: WhatsappProvider;
  };
  klambo: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<WhatsappProvider>(initial.provider);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || DEFAULT_INFOBIP_WHATSAPP_BASE_URL);
  const [fromNumber, setFromNumber] = useState(initial.fromNumber);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setProvider(initial.provider);
    setApiKey(initial.apiKey);
    setBaseUrl(initial.baseUrl || DEFAULT_INFOBIP_WHATSAPP_BASE_URL);
    setFromNumber(initial.fromNumber);
  }, [initial.provider, initial.apiKey, initial.baseUrl, initial.fromNumber]);

  function choose(next: WhatsappProvider) {
    setProvider(next);
    startTransition(async () => {
      const result = await setWhatsappProvider({
        tenantId,
        organizationId,
        orgSlug,
        provider: next,
      });
      if (!result.ok) {
        toast.error(result.message);
        setProvider(initial.provider);
        return;
      }
      toast.success(next === "infobip" ? "WhatsApp Infobip activé" : "WhatsApp Klambo activé");
      router.refresh();
    });
  }

  const configured = initial.configured && Boolean(initial.apiKey);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex w-full flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--tvs-blue-soft)]/35 p-1">
        <button
          type="button"
          className={
            provider === "klambo"
              ? "btn btn-primary flex-1"
              : "btn btn-ghost flex-1"
          }
          disabled={pending}
          onClick={() => choose("klambo")}
        >
          Klambo
        </button>
        <button
          type="button"
          className={
            provider === "infobip"
              ? "btn btn-primary flex-1"
              : "btn btn-ghost flex-1"
          }
          disabled={pending}
          onClick={() => choose("infobip")}
        >
          Infobip
        </button>
      </div>

      {provider === "klambo" ? klambo : null}

      {provider === "infobip" ? (
        <div className="flex w-full max-w-4xl flex-col gap-6">
          <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
                État de la connexion
              </p>
              <p className="mt-1 font-mono text-sm text-[var(--fg-muted)]">
                {configured
                  ? `Clé ${initial.apiKeyMasked} · ${initial.fromNumber}`
                  : "Aucun compte WhatsApp Infobip enregistré"}
              </p>
            </div>
            <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
              {configured ? "Connecté" : "Non configuré"}
            </span>
          </div>

          <form
            className="surface flex flex-col gap-6 p-6 sm:p-7"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await saveInfobipWhatsappSettings({
                  tenantId,
                  organizationId,
                  orgSlug,
                  apiKey,
                  baseUrl,
                  fromNumber,
                });
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                toast.success("WhatsApp Infobip enregistré");
                router.refresh();
              });
            }}
          >
            <div>
              <h2 className="text-lg font-medium text-[var(--tvs-blue-deep)]">
                WhatsApp Infobip
              </h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Clé API et URL de base propres à {organizationName}, distinctes
                du SMS et de Klambo. Les messages partent en modèle approuvé.
              </p>
            </div>
            <div className="field">
              <label htmlFor="wa-infobip-base">URL de base API</label>
              <input
                id="wa-infobip-base"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value.trim())}
                placeholder={DEFAULT_INFOBIP_WHATSAPP_BASE_URL}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="wa-infobip-key">Clé API</label>
              <div className="relative">
                <input
                  id="wa-infobip-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Clé API du portail Infobip"
                  className="pr-11"
                  autoComplete="off"
                  required={!configured}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-[var(--fg-muted)]"
                  onClick={() => setShowKey((value) => !value)}
                  aria-label={showKey ? "Masquer la clé" : "Afficher la clé"}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
                En-tête <code className="font-mono">Authorization: App …</code>. La clé est chiffrée.
              </p>
            </div>
            <div className="field">
              <label htmlFor="wa-infobip-from">Numéro expéditeur</label>
              <input
                id="wa-infobip-from"
                value={fromNumber}
                onChange={(event) => setFromNumber(event.target.value.trim())}
                placeholder="447860088970"
                required
              />
              <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
                Numéro WhatsApp enregistré chez Infobip, par exemple 447860088970.
                Ce n&apos;est pas le téléphone qui reçoit le message.
              </p>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary" disabled={pending} type="submit">
                {pending ? "Vérification…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
