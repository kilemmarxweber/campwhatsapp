/** Colonnes fixes — export et import partagent exactement ces noms. */
export const CONTACT_BASE_COLUMNS = ["phone", "name", "email"] as const;

export type ContactBaseColumn = (typeof CONTACT_BASE_COLUMNS)[number];

/** Colonnes variables du modèle vide (réutilisable à l’import). */
export const CONTACT_DEFAULT_VARIABLE_COLUMNS = ["ville", "modele"] as const;

export const CONTACT_PHONE_HEADERS = new Set([
  "phone",
  "telephone",
  "téléphone",
  "tel",
  "tél",
  "mobile",
  "whatsapp",
  "numero",
  "numéro",
  "number",
]);

export const CONTACT_NAME_HEADERS = new Set([
  "name",
  "nom",
  "fullname",
  "full_name",
  "fullname",
  "contact",
]);

export const CONTACT_EMAIL_HEADERS = new Set([
  "email",
  "mail",
  "e-mail",
  "courriel",
]);

export const CONTACT_RESERVED_HEADERS = new Set([
  ...CONTACT_PHONE_HEADERS,
  ...CONTACT_NAME_HEADERS,
  ...CONTACT_EMAIL_HEADERS,
]);

export function isBaseColumn(key: string): key is ContactBaseColumn {
  return (CONTACT_BASE_COLUMNS as readonly string[]).includes(key);
}

/**
 * Convertit une cellule Excel en texte sans perdre les chiffres
 * (évite la notation scientifique sur les numéros longs).
 */
export function excelCellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    // Téléphones / IDs longs stockés en nombre
    if (Math.abs(value) >= 1e10 && Number.isInteger(value)) {
      return Math.trunc(value).toString();
    }
    if (Number.isInteger(value)) return value.toString();
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    // Cellule riche ExcelJS / SheetJS parfois { text, result, ... }
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text.trim();
    if (typeof record.result === "string" || typeof record.result === "number") {
      return excelCellToString(record.result);
    }
    if (typeof record.w === "string") return record.w.trim();
    if (typeof record.v === "string" || typeof record.v === "number") {
      return excelCellToString(record.v);
    }
  }
  return String(value).trim();
}

/** Normalise un en-tête de colonne pour le matching import. */
export function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_+\-]/g, "");
}
