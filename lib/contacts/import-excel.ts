import * as XLSX from "xlsx";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "@/lib/phone";

export type ImportRowResult =
  | { ok: true; phone: string; name?: string; email?: string; variables: Record<string, string> }
  | { ok: false; row: number; reason: string };

const PHONE_HEADERS = new Set([
  "phone",
  "telephone",
  "tel",
  "mobile",
  "whatsapp",
]);

function pickContactsSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const named = workbook.SheetNames.find(
    (n) => n.trim().toLowerCase() === "contacts",
  );
  if (named) return workbook.Sheets[named] ?? null;
  const first = workbook.SheetNames[0];
  return first ? workbook.Sheets[first] ?? null : null;
}

function sheetRowsAsObjects(sheet: XLSX.WorkSheet): {
  rows: Record<string, unknown>[];
  headerRowNumber: number;
} {
  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
  });

  let headerIdx = 0;
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const cells = (matrix[i] ?? []).map((c) =>
      String(c ?? "")
        .trim()
        .toLowerCase(),
    );
    if (cells.some((c) => PHONE_HEADERS.has(c))) {
      headerIdx = i;
      break;
    }
  }

  const headerCells = (matrix[headerIdx] ?? []).map((c) =>
    String(c ?? "").trim(),
  );
  const rows: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    if (line.every((c) => !String(c ?? "").trim())) continue;
    const obj: Record<string, unknown> = {};
    headerCells.forEach((key, col) => {
      if (!key) return;
      obj[key] = line[col] ?? "";
    });
    rows.push(obj);
  }

  return { rows, headerRowNumber: headerIdx + 1 };
}

export function parseContactsExcel(
  buffer: ArrayBuffer | Buffer,
  defaultCountry: CountryCode = "CD",
): ImportRowResult[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = pickContactsSheet(workbook);
  if (!sheet) return [];

  const { rows, headerRowNumber } = sheetRowsAsObjects(sheet);

  return rows.map((row, index) => {
    const entries = Object.entries(row).map(([k, v]) => [
      k.trim().toLowerCase(),
      String(v ?? "").trim(),
    ]) as [string, string][];
    const map = Object.fromEntries(entries);

    const phoneRaw =
      map.phone ?? map.telephone ?? map.tel ?? map.mobile ?? map.whatsapp ?? "";
    const nameHint = (map.name ?? map.nom ?? "").toLowerCase();
    if (
      phoneRaw === "+243844000000" &&
      nameHint.includes("exemple")
    ) {
      return {
        ok: false as const,
        row: headerRowNumber + index + 1,
        reason: "Ligne d’exemple ignorée",
      };
    }
    if (!phoneRaw) {
      return {
        ok: false as const,
        row: headerRowNumber + index + 1,
        reason: "Ligne vide ou sans téléphone",
      };
    }

    const phone = normalizePhone(phoneRaw, defaultCountry);
    if (!phone) {
      return {
        ok: false as const,
        row: headerRowNumber + index + 1,
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
