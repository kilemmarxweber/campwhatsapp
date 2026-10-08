export const APP_LOCALES = ["fr", "en", "pt"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_COLORS = {
  colorRed: "#dc4226",
  colorWhite: "#ffffff",
  colorBlue: "#253c80",
} as const;

export const LOCALE_OPTIONS = [
  { value: "fr", nativeLabel: "Français" },
  { value: "en", nativeLabel: "English" },
  { value: "pt", nativeLabel: "Português (Portugal)" },
] as const;

export type OrgAppearance = {
  colorRed: string;
  colorWhite: string;
  colorBlue: string;
  locale: AppLocale;
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): AppLocale {
  if (typeof value !== "string") return "fr";
  const base = value.trim().toLowerCase().split("-")[0];
  if (base === "en") return "en";
  if (base === "pt") return "pt";
  return "fr";
}

export function intlLocale(locale: AppLocale) {
  if (locale === "en") return "en-GB";
  if (locale === "pt") return "pt-PT";
  return "fr-FR";
}

export function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeAppearance(
  input?: (Partial<Omit<OrgAppearance, "locale">> & { locale?: string | null }) | null,
): OrgAppearance {
  const red = input?.colorRed?.trim() ?? "";
  const white = input?.colorWhite?.trim() ?? "";
  const blue = input?.colorBlue?.trim() ?? "";
  return {
    colorRed: isHexColor(red) ? red.toLowerCase() : DEFAULT_COLORS.colorRed,
    colorWhite: isHexColor(white) ? white.toLowerCase() : DEFAULT_COLORS.colorWhite,
    colorBlue: isHexColor(blue) ? blue.toLowerCase() : DEFAULT_COLORS.colorBlue,
    locale: normalizeLocale(input?.locale),
  };
}

function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mix(base: string, target: string, targetWeight: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  const w = targetWeight;
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w,
  );
}

function foregroundFor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#121826" : "#ffffff";
}

export function appearanceCssVars(input: OrgAppearance): Record<string, string> {
  const blueDeep = mix(input.colorBlue, "#000000", 0.28);
  const blueSoft = mix(input.colorBlue, input.colorWhite, 0.88);
  const page = mix(input.colorWhite, input.colorBlue, 0.04);
  const onBlue = foregroundFor(input.colorBlue);
  return {
    "--tvs-red": input.colorRed,
    "--tvs-red-deep": mix(input.colorRed, "#000000", 0.18),
    "--tvs-blue": input.colorBlue,
    "--tvs-blue-deep": blueDeep,
    "--tvs-blue-soft": blueSoft,
    "--brand": input.colorRed,
    "--danger": input.colorRed,
    "--destructive": input.colorRed,
    "--primary": input.colorBlue,
    "--primary-foreground": onBlue,
    "--ring": input.colorBlue,
    "--accent": blueSoft,
    "--accent-foreground": blueDeep,
    "--secondary": blueSoft,
    "--secondary-foreground": blueDeep,
    "--background": page,
    "--bg": page,
    "--card": input.colorWhite,
    "--bg-elevated": input.colorWhite,
    "--popover": input.colorWhite,
    "--sidebar": input.colorWhite,
    "--sidebar-primary": input.colorBlue,
    "--sidebar-primary-foreground": onBlue,
    "--sidebar-accent": blueSoft,
    "--sidebar-ring": input.colorBlue,
    "--chart-1": input.colorBlue,
    "--chart-2": input.colorRed,
  };
}
