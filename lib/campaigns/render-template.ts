export type TemplateVars = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value = vars[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}

export function extractTemplateKeys(template: string): string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER)) {
    keys.add(match[1]);
  }
  return [...keys];
}
