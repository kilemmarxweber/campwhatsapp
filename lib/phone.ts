import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = "CD",
): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const phone = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!phone || !phone.isValid()) return null;
  return phone.format("E.164");
}
