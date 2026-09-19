export type TemplateVars = Record<string, string | number | null | undefined>;

const PLACEHOLDER_SOURCE = "\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}";

function placeholderRegex() {
  return new RegExp(PLACEHOLDER_SOURCE, "gi");
}

function normalizeVars(vars: TemplateVars): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    out[key.toLowerCase()] = value == null ? "" : String(value);
  }
  return out;
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  const normalized = normalizeVars(vars);
  return template.replace(placeholderRegex(), (_, key: string) => {
    return normalized[key.toLowerCase()] ?? "";
  });
}

export function extractTemplateKeys(template: string): string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(placeholderRegex())) {
    const key = match[1];
    if (key) keys.add(key.toLowerCase());
  }
  return [...keys];
}

/** Variables de base toujours proposées à l’insertion. */
export const BASE_CONTACT_VARS = ["name", "phone", "email"] as const;
