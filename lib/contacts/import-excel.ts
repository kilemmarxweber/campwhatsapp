import * as XLSX from "xlsx";
import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "@/lib/phone";
import {
  CONTACT_EMAIL_HEADERS,
  CONTACT_NAME_HEADERS,
  CONTACT_PHONE_HEADERS,
  CONTACT_RESERVED_HEADERS,
  excelCellToString,
  normalizeHeaderKey,
} from "@/lib/contacts/columns";

export type ImportRowResult =
  | {
      ok: true;
      phone: string;
      name?: string;
      email?: string;
      variables: Record<string, string>;
    }
  | { ok: false; row: number; reason: string };

function pickContactsSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  const named = workbook.SheetNames.find(
    (n) => n.trim().toLowerCase() === "contacts",
  );
  if (named) return workbook.Sheets[named] ?? null;
  // Ne pas prendre « Infos » par erreur
  const fallback = workbook.SheetNames.find(
    (n) => n.trim().toLowerCase() !== "infos",
  );
  if (fallback) return workbook.Sheets[fallback] ?? null;
  const first = workbook.SheetNames[0];
  return first ? workbook.Sheets[first] ?? null : null;
}

function sheetRowsAsObjects(sheet: XLSX.WorkSheet): {
  rows: Record<string, unknown>[];
  headerRowNumber: number;
} {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date)[]>(
    sheet,
    {
      header: 1,
      defval: "",
      raw: true,
      blankrows: false,
    },
  );

  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 40); i++) {
    const cells = (matrix[i] ?? []).map((c) =>
      normalizeHeaderKey(excelCellToString(c)),
    );
    if (cells.some((c) => CONTACT_PHONE_HEADERS.has(c))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    return { rows: [], headerRowNumber: 1 };
  }

  const headerCells = (matrix[headerIdx] ?? []).map((c) =>
    normalizeHeaderKey(excelCellToString(c)),
  );

  const rows: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? [];
    if (line.every((c) => !excelCellToString(c))) continue;

    const obj: Record<string, unknown> = {};
    headerCells.forEach((key, col) => {
      if (!key) return;
      // Première occurrence du header gagne (évite d’écraser phone)
      if (key in obj) return;
      obj[key] = line[col] ?? "";
    });
    rows.push(obj);
  }

  return { rows, headerRowNumber: headerIdx + 1 };
}

function pickMappedValue(
  map: Record<string, string>,
  headers: Set<string>,
): string {
  for (const key of headers) {
    const value = map[key];
    if (value) return value;
  }
  return "";
}

export function parseContactsExcel(
  buffer: ArrayBuffer | Buffer,
  defaultCountry: CountryCode = "CD",
): ImportRowResult[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: true,
  });
  const sheet = pickContactsSheet(workbook);
  if (!sheet) return [];

  const { rows, headerRowNumber } = sheetRowsAsObjects(sheet);
  const seenPhones = new Set<string>();

  return rows.map((row, index) => {
    const excelRow = headerRowNumber + index + 1;
    const entries = Object.entries(row).map(([k, v]) => [
      normalizeHeaderKey(k),
      excelCellToString(v),
    ]) as [string, string][];
    const map = Object.fromEntries(entries);

    const phoneRaw = pickMappedValue(map, CONTACT_PHONE_HEADERS);
    if (!phoneRaw) {
      return {
        ok: false as const,
        row: excelRow,
        reason: "Ligne vide ou sans téléphone",
      };
    }

    const phone = normalizePhone(phoneRaw, defaultCountry);
    if (!phone) {
      return {
        ok: false as const,
        row: excelRow,
        reason: `Téléphone invalide: "${phoneRaw}"`,
      };
    }

    if (seenPhones.has(phone)) {
      return {
        ok: false as const,
        row: excelRow,
        reason: `Doublon dans le fichier: ${phone}`,
      };
    }
    seenPhones.add(phone);

    const name = pickMappedValue(map, CONTACT_NAME_HEADERS) || undefined;
    const email = pickMappedValue(map, CONTACT_EMAIL_HEADERS) || undefined;

    const variables: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (!CONTACT_RESERVED_HEADERS.has(k) && v) {
        variables[k] = v;
      }
    }

    return {
      ok: true as const,
      phone,
      name,
      email,
      variables,
    };
  });
}
