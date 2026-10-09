import Link from "next/link";
import { ImageIcon, MegaphoneIcon, UsersIcon } from "lucide-react";

type StatCard = {
  label: string;
  hint: string;
  value: number;
  href: string;
  icon: typeof UsersIcon;
  /** Couleur d’accent (CSS) */
  accent: string;
  /** Fond doux de l’icône */
  tint: string;
};

export function OverviewStatCards({
  orgSlug,
  contacts,
  campaigns,
  media,
}: {
  orgSlug: string;
  contacts: number;
  campaigns: number;
  media: number;
}) {
  const cards: StatCard[] = [
    {
      label: "Contacts",
      hint: "Base destinataires",
      value: contacts,
      href: `/o/${orgSlug}/contacts`,
      icon: UsersIcon,
      accent: "#1f5f8b",
      tint: "color-mix(in oklab, #1f5f8b 12%, white)",
    },
    {
      label: "Campagnes",
      hint: "Envois WhatsApp & SMS",
      value: campaigns,
      href: `/o/${orgSlug}/campaigns`,
      icon: MegaphoneIcon,
      accent: "var(--tvs-red)",
      tint: "color-mix(in oklab, var(--tvs-red) 12%, white)",
    },
    {
      label: "Médias",
      hint: "Images & vidéos",
      value: media,
      href: `/o/${orgSlug}/media`,
      icon: ImageIcon,
      accent: "var(--tvs-blue)",
      tint: "var(--tvs-blue-soft)",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className="group surface relative overflow-hidden p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_color-mix(in_oklab,var(--tvs-blue)_10%,transparent)]"
            style={{
              borderColor: `color-mix(in oklab, ${card.accent} 28%, var(--border))`,
            }}
          >
            <div
              className="pointer-events-none absolute -top-8 -right-6 size-20 rounded-full opacity-40 transition group-hover:opacity-60"
              style={{
                background: `radial-gradient(circle, ${card.tint} 0%, transparent 70%)`,
              }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <p
                  className="text-xs font-medium"
                  style={{ color: card.accent }}
                >
                  {card.label}
                </p>
                <p className="mt-0.5 text-[0.7rem] leading-tight text-[var(--fg-muted)]">
                  {card.hint}
                </p>
                <p
                  className="mt-2 text-2xl font-semibold tracking-tight tabular-nums"
                  style={{ color: card.accent }}
                >
                  {new Intl.NumberFormat("fr-FR").format(card.value)}
                </p>
              </div>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-105"
                style={{
                  background: card.tint,
                  color: card.accent,
                }}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
