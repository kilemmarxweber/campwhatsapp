import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

const displayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["fr"], { type: "region" })
    : null;

/** Priorité Afrique centrale / pays fréquents TVS */
const PRIORITY_COUNTRIES: CountryCode[] = [
  "CD",
  "CG",
  "CF",
  "GA",
  "CM",
  "RW",
  "BI",
  "UG",
  "KE",
  "TZ",
  "ZA",
  "SN",
  "CI",
  "BJ",
  "TG",
  "BF",
  "ML",
  "NE",
  "GN",
  "FR",
  "BE",
  "CH",
  "CA",
  "US",
  "GB",
];

export type PhoneCountryOption = {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
  /** Longueur indicative du numéro national (mobile) */
  nationalLength: number;
  placeholder: string;
};

export function countryFlagEmoji(iso: string): string {
  const cc = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";
  return String.fromCodePoint(
    ...[...cc].map((ch) => 127397 + ch.charCodeAt(0)),
  );
}

function countryLabel(code: CountryCode): string {
  try {
    return displayNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function buildOption(code: CountryCode): PhoneCountryOption {
  const example = getExampleNumber(code, examples);
  const national = example?.nationalNumber ?? "";
  return {
    code,
    name: countryLabel(code),
    callingCode: getCountryCallingCode(code),
    flag: countryFlagEmoji(code),
    nationalLength: national.length || 9,
    placeholder: national || "Numéro local",
  };
}

let cached: PhoneCountryOption[] | null = null;

export function getPhoneCountryOptions(): PhoneCountryOption[] {
  if (cached) return cached;
  const priority = new Set(PRIORITY_COUNTRIES);
  const all = getCountries()
    .map(buildOption)
    .sort((a, b) => {
      const pa = priority.has(a.code) ? PRIORITY_COUNTRIES.indexOf(a.code) : 999;
      const pb = priority.has(b.code) ? PRIORITY_COUNTRIES.indexOf(b.code) : 999;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, "fr");
    });
  cached = all;
  return all;
}

export function findPhoneCountry(
  code: string | null | undefined,
): PhoneCountryOption {
  const options = getPhoneCountryOptions();
  const upper = (code || "CD").toUpperCase() as CountryCode;
  return options.find((o) => o.code === upper) ?? options[0]!;
}
