"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KlamboSettingsForm } from "@/components/klambo-settings-form";
import { InfobipSmsSettingsForm } from "@/components/twilio-sms-settings-form";
import { updateTenantAppearance } from "@/lib/appearance/actions";
import {
  DEFAULT_COLORS,
  LOCALE_OPTIONS,
  isHexColor,
  type AppLocale,
  type OrgAppearance,
} from "@/lib/appearance";
import { useOrgAppearance } from "@/components/org-frame";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsView({
  organizationId,
  orgSlug,
  tenantId,
  organizationName,
  canManage,
  webhookEndpoint,
  klambo,
  sms,
}: {
  organizationId: string;
  orgSlug: string;
  tenantId: string;
  organizationName: string;
  canManage: boolean;
  webhookEndpoint: string;
  klambo: {
    apiKey: string;
    apiKeyMasked: string | null;
    baseUrl: string;
    defaultCountry: string;
    hasWebhookSecret: boolean;
    configured: boolean;
    corrupt: boolean;
  };
  sms: {
    apiKey: string;
    apiKeyMasked: string | null;
    baseUrl: string;
    sender: string;
    configured: boolean;
    keyCorrupt: boolean;
  };
}) {
  const { copy, locale, setLocale, colors, setColors } = useOrgAppearance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [red, setRed] = useState(colors.colorRed);
  const [white, setWhite] = useState(colors.colorWhite);
  const [blue, setBlue] = useState(colors.colorBlue);
  const [tab, setTab] = useState<"appearance" | "whatsapp" | "sms">("appearance");

  useEffect(() => {
    function fromHash() {
      const hash = window.location.hash.replace("#", "");
      if (hash === "whatsapp" || hash === "sms" || hash === "appearance") {
        setTab(hash);
      }
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function selectTab(next: "appearance" | "whatsapp" | "sms") {
    setTab(next);
    const url = `${window.location.pathname}${window.location.search}#${next}`;
    window.history.replaceState(null, "", url);
  }

  function applyColors(next: OrgAppearance) {
    setRed(next.colorRed);
    setWhite(next.colorWhite);
    setBlue(next.colorBlue);
    setColors({ ...next, locale });
  }

  function onColor(channel: "colorRed" | "colorWhite" | "colorBlue", value: string) {
    const next = { colorRed: red, colorWhite: white, colorBlue: blue, locale };
    next[channel] = value;
    if (channel === "colorRed") setRed(value);
    if (channel === "colorWhite") setWhite(value);
    if (channel === "colorBlue") setBlue(value);
    if (isHexColor(value)) setColors(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">{copy.settings.title}</h1>
        <p className="text-muted-foreground">{copy.settings.subtitle}</p>
      </div>

      <div
        role="tablist"
        aria-label={copy.settings.title}
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1"
      >
        <SettingsTab
          id="appearance"
          selected={tab === "appearance"}
          onSelect={() => selectTab("appearance")}
        >
          {copy.settings.appearance}
        </SettingsTab>
        <SettingsTab
          id="whatsapp"
          selected={tab === "whatsapp"}
          onSelect={() => selectTab("whatsapp")}
          badge={klambo.configured ? copy.settings.connected : copy.settings.notConfigured}
          badgeOk={klambo.configured}
        >
          {copy.settings.whatsappTitle}
        </SettingsTab>
        <SettingsTab
          id="sms"
          selected={tab === "sms"}
          onSelect={() => selectTab("sms")}
          badge={sms.configured ? copy.settings.connected : copy.settings.notConfigured}
          badgeOk={sms.configured}
        >
          SMS
        </SettingsTab>
      </div>

      {tab === "appearance" ? (
      <form
        id="settings-panel-appearance"
        role="tabpanel"
        aria-labelledby="settings-tab-appearance"
        className="surface flex max-w-xl flex-col gap-6 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canManage) return;
          startTransition(async () => {
            try {
              await updateTenantAppearance({
                organizationId,
                orgSlug,
                colorRed: red,
                colorWhite: white,
                colorBlue: blue,
                locale,
              });
              toast.success(copy.settings.saved);
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erreur");
            }
          });
        }}
      >
        <div>
          <h2 className="text-lg font-medium text-primary">{copy.settings.appearance}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.settings.appearanceDesc}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{copy.settings.language}</p>
          <p className="text-sm text-muted-foreground">{copy.settings.languageDesc}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LOCALE_OPTIONS.map((option) => {
              const selected = locale === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  disabled={!canManage || pending}
                  className={cn(
                    "h-auto flex-col items-start gap-0.5 px-3 py-3 text-left",
                    selected && "ring-2 ring-primary/30",
                  )}
                  onClick={() => setLocale(option.value as AppLocale)}
                >
                  <span className="text-sm font-semibold">{option.nativeLabel}</span>
                  <span
                    className={cn(
                      "text-[11px] font-normal",
                      selected ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {option.value.toUpperCase()}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{copy.settings.colors}</p>
          <ColorField
            label={copy.settings.red}
            value={red}
            disabled={!canManage || pending}
            onChange={(value) => onColor("colorRed", value)}
          />
          <ColorField
            label={copy.settings.white}
            value={white}
            disabled={!canManage || pending}
            onChange={(value) => onColor("colorWhite", value)}
          />
          <ColorField
            label={copy.settings.blue}
            value={blue}
            disabled={!canManage || pending}
            onChange={(value) => onColor("colorBlue", value)}
          />
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? copy.settings.saving : copy.settings.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                applyColors({
                  ...DEFAULT_COLORS,
                  locale,
                })
              }
            >
              {copy.settings.reset}
            </Button>
          </div>
        ) : null}
      </form>
      ) : null}

      {tab === "whatsapp" ? (
      <section
        id="whatsapp"
        role="tabpanel"
        aria-labelledby="settings-tab-whatsapp"
        className="flex flex-col gap-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-primary">{copy.settings.whatsappTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.settings.whatsappBody}</p>
        </div>
        {klambo.corrupt ? (
          <p className="max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            La clé API enregistrée ne peut plus être déchiffrée. Collez-la à
            nouveau et enregistrez.
          </p>
        ) : null}
        {canManage ? (
          <KlamboSettingsForm
            tenantId={tenantId}
            organizationId={organizationId}
            orgSlug={orgSlug}
            webhookEndpoint={webhookEndpoint}
            initial={klambo}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {klambo.configured ? copy.settings.connected : copy.settings.notConfigured}
          </p>
        )}
      </section>
      ) : null}

      {tab === "sms" ? (
      <section
        id="sms"
        role="tabpanel"
        aria-labelledby="settings-tab-sms"
        className="flex flex-col gap-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-primary">SMS</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compte Infobip de {organizationName}, partagé par toutes ses succursales.
          </p>
        </div>
        {sms.keyCorrupt ? (
          <p className="max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            La clé API enregistrée ne peut plus être déchiffrée. Collez-la à
            nouveau et enregistrez.
          </p>
        ) : null}
        {canManage ? (
          <InfobipSmsSettingsForm
            tenantId={tenantId}
            organizationId={organizationId}
            orgSlug={orgSlug}
            organizationName={organizationName}
            initial={sms}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {sms.configured ? copy.settings.connected : copy.settings.notConfigured}
          </p>
        )}
      </section>
      ) : null}
    </div>
  );
}

function SettingsTab({
  id,
  selected,
  onSelect,
  badge,
  badgeOk,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
  badgeOk?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`settings-tab-${id}`}
      aria-selected={selected}
      aria-controls={`settings-panel-${id}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
      onClick={onSelect}
    >
      {children}
      {badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            selected
              ? "bg-primary-foreground/15 text-primary-foreground"
              : badgeOk
                ? "bg-[var(--tvs-blue-soft)] text-[var(--tvs-blue)]"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const picker = isHexColor(value) ? value : "#000000";
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={picker}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-28 rounded-md border border-border bg-card px-2 py-1.5 font-mono text-sm"
          spellCheck={false}
        />
      </span>
    </label>
  );
}
