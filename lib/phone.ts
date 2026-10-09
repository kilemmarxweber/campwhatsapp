import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = "CD",
): string | null {
  let cleaned = raw.trim();
  if (!cleaned) return null;

  // Excel / CSV : espaces, tirets, points entre chiffres
  cleaned = cleaned.replace(/[\s().\-]/g, "");
  // Apostrophe texte Excel
  if (cleaned.startsWith("'")) cleaned = cleaned.slice(1);

  let phone = parsePhoneNumberFromString(cleaned, defaultCountry);
  if ((!phone || !phone.isValid()) && /^\d{10,15}$/.test(cleaned)) {
    phone = parsePhoneNumberFromString(`+${cleaned}`);
  }
  if (!phone || !phone.isValid()) return null;
  return phone.format("E.164");
}

export type NationalPhoneCheck =
  | { ok: true; e164: string }
  | { ok: false; message: string };

/** Valide un numéro national saisi (sans indicatif) pour un pays donné. */
export function checkNationalPhone(
  nationalRaw: string,
  country: CountryCode,
): NationalPhoneCheck {
  const national = digitsOnly(nationalRaw);
  if (!national) {
    return { ok: false, message: "Saisissez le numéro local (chiffres uniquement)" };
  }

  const lengthIssue = validatePhoneNumberLength(national, country);
  if (lengthIssue === "TOO_SHORT") {
    return {
      ok: false,
      message: "Numéro incomplet pour ce pays — ajoutez les chiffres manquants",
    };
  }
  if (lengthIssue === "TOO_LONG") {
    return {
      ok: false,
      message: "Numéro trop long pour ce pays",
    };
  }
  if (lengthIssue === "INVALID_LENGTH" || lengthIssue === "NOT_A_NUMBER") {
    return {
      ok: false,
      message: "Longueur incorrecte pour ce pays",
    };
  }
  if (lengthIssue === "INVALID_COUNTRY") {
    return { ok: false, message: "Pays non pris en charge" };
  }

  if (!isValidPhoneNumber(national, country)) {
    return {
      ok: false,
      message: "Numéro invalide pour ce pays — vérifiez les chiffres",
    };
  }

  const phone = parsePhoneNumberFromString(national, country);
  if (!phone?.isValid()) {
    return {
      ok: false,
      message: "Numéro invalide pour ce pays — vérifiez les chiffres",
    };
  }

  return { ok: true, e164: phone.format("E.164") };
}

/** Décompose un E.164 stocké pour préremplir le sélecteur pays + national. */
export function splitStoredPhone(
  e164: string,
  fallbackCountry: CountryCode = "CD",
): { country: CountryCode; national: string } {
  const phone = parsePhoneNumberFromString(e164);
  if (phone?.country && phone.nationalNumber) {
    return {
      country: phone.country,
      national: phone.nationalNumber,
    };
  }
  return { country: fallbackCountry, national: digitsOnly(e164) };
}
