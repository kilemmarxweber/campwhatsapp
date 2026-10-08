"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { saveTwilioSmsSettings } from "@/lib/sms/actions";

export function TwilioSmsSettingsForm({
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
    accountSid: string;
    authToken: string;
    authTokenMasked: string | null;
    fromNumber: string;
    configured: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accountSid, setAccountSid] = useState(initial.accountSid);
  const [authToken, setAuthToken] = useState(initial.authToken);
  const [fromNumber, setFromNumber] = useState(initial.fromNumber);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    setAccountSid(initial.accountSid);
    setAuthToken(initial.authToken);
    setFromNumber(initial.fromNumber);
  }, [initial.accountSid, initial.authToken, initial.fromNumber]);

  const configured = initial.configured && Boolean(initial.authToken);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            État de la connexion
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--fg-muted)]">
            {configured
              ? `Token ${initial.authTokenMasked}`
              : "Aucun compte Twilio enregistré"}
          </p>
        </div>
        <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
          {configured ? "Connecté" : "Non configuré"}
        </span>
      </div>

      <form
        className="surface flex flex-col gap-6 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              const result = await saveTwilioSmsSettings({
                tenantId,
                organizationId,
                orgSlug,
                accountSid,
                authToken,
                fromNumber,
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
            Compte Twilio
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Abonnement Twilio de {organizationName}. Ses succursales envoient
            les SMS avec ce compte. WhatsApp continue d&apos;utiliser Klambo.
          </p>
        </div>

        <div className="field">
          <label htmlFor="twilio-account-sid">Account SID</label>
          <input
            id="twilio-account-sid"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value.trim())}
            placeholder="AC…"
            autoComplete="off"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="twilio-auth-token">Auth Token</label>
          <div className="relative">
            <input
              id="twilio-auth-token"
              type={showToken ? "text" : "password"}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Auth Token de la console Twilio"
              autoComplete="off"
              className="pr-11"
              required
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-[var(--fg-muted)] hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? "Masquer le token" : "Afficher le token"}
            >
              {showToken ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Account SID et Auth Token se trouvent dans la{" "}
            <a
              href="https://console.twilio.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--tvs-blue)] underline underline-offset-2"
            >
              console Twilio
            </a>
            . Le token est chiffré en base. Canal documenté :{" "}
            <a
              href="https://www.twilio.com/fr-fr/messaging/channels/sms"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--tvs-blue)] underline underline-offset-2"
            >
              SMS Twilio
            </a>
            .
          </p>
        </div>

        <div className="field">
          <label htmlFor="twilio-from">Numéro expéditeur</label>
          <input
            id="twilio-from"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value.trim())}
            placeholder="+1…"
            autoComplete="off"
            required
          />
          <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
            Numéro Twilio au format international. C&apos;est la valeur{" "}
            <code className="font-mono">From</code> des SMS.
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
