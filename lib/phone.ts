import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

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
