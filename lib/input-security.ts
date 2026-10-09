/**
 * Filtres / validations d’entrée côté client & serveur.
 * Objectif : n’accepter que les caractères attendus selon le type de champ.
 */

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PERSON_NAME_MAX_LENGTH = 120;
export const SAFE_TEXT_MAX_LENGTH = 500;

/** Pendant la saisie email : charset RFC-ish, sans espaces ni contrôles. */
const EMAIL_INPUT_CHARS = /[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@-]/g;

/**
 * Email complet (un seul @, domaine avec au moins un point).
 * Strict volontairement pour bloquer les payloads hors norme.
 */
const EMAIL_STRICT =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Caractères de contrôle (hors tab/newline utiles pour textarea). */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const CONTROL_CHARS_STRICT = /[\u0000-\u001F\u007F]/g;

export function filterEmailInput(raw: string): string {
  return String(raw ?? "")
    .replace(CONTROL_CHARS_STRICT, "")
    .replace(/\s+/g, "")
    .replace(EMAIL_INPUT_CHARS, "")
    .slice(0, EMAIL_MAX_LENGTH);
}

export function normalizeEmail(raw: string): string {
  return filterEmailInput(raw).trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 5 || email.length > EMAIL_MAX_LENGTH) return false;
  if ((email.match(/@/g) ?? []).length !== 1) return false;
  if (email.includes("..")) return false;
  return EMAIL_STRICT.test(email);
}

export function emailValidationMessage(raw: string): string | null {
  if (!raw.trim()) return "Email requis";
  if (!isValidEmail(raw)) {
    return "Email invalide — utilisez un format vous@domaine.com (caractères standards uniquement)";
  }
  return null;
}

/** Mot de passe : pas de contrôles / null bytes ; longueur bornée. */
export function filterPasswordInput(raw: string): string {
  return String(raw ?? "")
    .replace(CONTROL_CHARS_STRICT, "")
    .slice(0, PASSWORD_MAX_LENGTH);
}

export function validatePassword(
  raw: string,
  opts?: { requireComplexity?: boolean },
): { ok: true; value: string } | { ok: false; message: string } {
  const value = filterPasswordInput(raw);
  if (value.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
    };
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
    };
  }
  if (opts?.requireComplexity) {
    if (!/[A-Za-zÀ-ÿ]/.test(value) || !/[0-9]/.test(value)) {
      return {
        ok: false,
        message: "Le mot de passe doit contenir au moins une lettre et un chiffre",
      };
    }
  }
  return { ok: true, value };
}

/** Mot de passe à la connexion : filtre + bornes, sans forcer la complexité. */
export function validateSignInPassword(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = filterPasswordInput(raw);
  if (!value) return { ok: false, message: "Mot de passe requis" };
  if (value.length < 6) {
    return { ok: false, message: "Mot de passe trop court" };
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `Mot de passe trop long (max ${PASSWORD_MAX_LENGTH})`,
    };
  }
  return { ok: true, value };
}

export function filterPersonName(raw: string): string {
  return String(raw ?? "")
    .replace(CONTROL_CHARS_STRICT, "")
    .replace(/[<>{}[\]\\]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, PERSON_NAME_MAX_LENGTH);
}

export function filterSafeText(
  raw: string,
  maxLength = SAFE_TEXT_MAX_LENGTH,
): string {
  return String(raw ?? "")
    .replace(CONTROL_CHARS, "")
    .slice(0, maxLength);
}

export function filterCampaignName(raw: string): string {
  return filterSafeText(raw, 120).replace(/\s+/g, " ");
}

export function isSafeCallbackPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return true;
}
