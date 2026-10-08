"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  canManage,
  configured,
  isSiege,
}: {
  organizationId: string;
  orgSlug: string;
  canManage: boolean;
  configured: boolean;
  isSiege: boolean;
}) {
  const { copy, locale, setLocale, colors, setColors } = useOrgAppearance();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [red, setRed] = useState(colors.colorRed);
  const [white, setWhite] = useState(colors.colorWhite);
  const [blue, setBlue] = useState(colors.colorBlue);

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

      <form
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

      <div className="surface flex max-w-xl flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-primary">{copy.settings.whatsappTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.settings.whatsappBody}</p>
          </div>
          <span className={configured ? "badge badge-ok" : "badge badge-warn"}>
            {configured ? copy.settings.connected : copy.settings.notConfigured}
          </span>
        </div>
        {isSiege ? (
          <a href="/admin/klambo" className="btn btn-primary w-fit">
            {copy.settings.openWhatsapp}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.settings.askAdmin}</p>
        )}
      </div>
    </div>
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
