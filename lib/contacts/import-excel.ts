import * as XLSX from "xlsx";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "@/lib/phone";

export type ImportRowResult =
  | { ok: true; phone: string; name?: string; email?: string; variables: Record<string, string> }
  | { ok: false; row: number; reason: string };

export function parseContactsExcel(
  buffer: ArrayBuffer | Buffer,
  defaultCountry: CountryCode = "CD",
): ImportRowResult[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows.map((row, index) => {
    const entries = Object.entries(row).map(([k, v]) => [
      k.trim().toLowerCase(),
      String(v ?? "").trim(),
    ]) as [string, string][];
    const map = Object.fromEntries(entries);

    const phoneRaw =
      map.phone ?? map.telephone ?? map.tel ?? map.mobile ?? map.whatsapp ?? "";
    const phone = normalizePhone(phoneRaw, defaultCountry);
    if (!phone) {
      return {
        ok: false as const,
        row: index + 2,
        reason: `Téléphone invalide: "${phoneRaw}"`,
      };
    }

    const name = map.name ?? map.nom ?? map.fullname ?? undefined;
    const email = map.email ?? map.mail ?? undefined;
    const reserved = new Set([
      "phone",
      "telephone",
      "tel",
      "mobile",
      "whatsapp",
      "name",
      "nom",
      "fullname",
      "email",
      "mail",
    ]);
    const variables: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (!reserved.has(k) && v) variables[k] = v;
    }

    return {
      ok: true as const,
      phone,
      name: name || undefined,
      email: email || undefined,
      variables,
    };
  });
}
