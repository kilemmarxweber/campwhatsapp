"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AppHeader } from "@/components/app-header";
import {
  appearanceCssVars,
  intlLocale,
  type AppLocale,
  type OrgAppearance,
} from "@/lib/appearance";
import { messagesFor, type Messages } from "@/lib/i18n/messages";
import type { ProfileUser } from "@/components/user-profile-menu";

type OrgAppearanceContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  colors: OrgAppearance;
  setColors: (colors: OrgAppearance) => void;
  copy: Messages;
};

const OrgAppearanceContext = createContext<OrgAppearanceContextValue | null>(null);

export function useOrgAppearance() {
  const value = useContext(OrgAppearanceContext);
  if (!value) throw new Error("Apparence hors organisation");
  return value;
}

export function OrgFrame({
  appearance,
  orgSlug,
  title,
  subtitle,
  homeHref,
  showOrganisationsLink,
  showSiegeLink,
  contextLabel,
  user,
  children,
}: {
  appearance: OrgAppearance;
  orgSlug: string;
  title: string;
  subtitle?: string;
  homeHref: string;
  showOrganisationsLink: boolean;
  showSiegeLink: boolean;
  contextLabel?: string;
  user: ProfileUser;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<AppLocale>(appearance.locale);
  const [colors, setColors] = useState(appearance);
  const copy = messagesFor(locale);
  const base = `/o/${orgSlug}`;

  useEffect(() => {
    const root = document.documentElement;
    root.lang = intlLocale(locale);
    const vars = appearanceCssVars(colors);
    const previous = new Map<string, string>();
    for (const [key, value] of Object.entries(vars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }
    return () => {
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
    };
  }, [locale, colors]);

  return (
    <OrgAppearanceContext.Provider value={{ locale, setLocale, colors, setColors, copy }}>
      <div
        className="min-h-screen"
        style={appearanceCssVars(colors) as CSSProperties}
        lang={intlLocale(locale)}
      >
        <AppHeader
          title={title}
          subtitle={subtitle}
          homeHref={homeHref}
          showOrganisationsLink={showOrganisationsLink}
          showSiegeLink={showSiegeLink}
          contextLabel={contextLabel}
          brand={copy.brand}
          menuLabels={copy.menu}
          user={user}
          navItems={[
            { href: base, label: copy.nav.overview },
            { href: `${base}/contacts`, label: copy.nav.contacts },
            { href: `${base}/campaigns`, label: copy.nav.campaigns },
            { href: `${base}/media`, label: copy.nav.media },
            { href: `${base}/templates`, label: copy.nav.templates },
            { href: `${base}/equipe`, label: copy.nav.team },
            { href: `${base}/settings`, label: copy.nav.settings },
          ]}
        />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </OrgAppearanceContext.Provider>
  );
}
