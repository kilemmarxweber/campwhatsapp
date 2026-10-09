import ExcelJS from "exceljs";
import { readUploadBuffer } from "@/lib/upload-file.server";
import {
  CONTACT_BASE_COLUMNS,
  CONTACT_DEFAULT_VARIABLE_COLUMNS,
  isBaseColumn,
} from "@/lib/contacts/columns";

const TVS_BLUE = "FF253C80";
const TVS_RED = "FFDC4226";
const HEADER_FILL = TVS_BLUE;

export type ContactExportRow = {
  phone: string;
  name: string | null;
  email: string | null;
  variables: unknown;
};

export type ExportContactsMeta = {
  tenantName: string;
  branchName: string;
  exportedAt: Date;
  logoPath: string | null;
};

function collectVariableKeys(contacts: ContactExportRow[]): string[] {
  const keys = new Set<string>();
  for (const c of contacts) {
    const v = c.variables;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        const key = k.trim().toLowerCase();
        if (key && !isBaseColumn(key)) {
          keys.add(key);
        }
      }
    }
  }
  return [...keys].sort();
}

function asVariableMap(variables: unknown): Record<string, string> {
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables as Record<string, unknown>)) {
    const key = k.trim().toLowerCase();
    if (!key || isBaseColumn(key)) continue;
    if (v == null) {
      out[key] = "";
      continue;
    }
    out[key] = String(v);
  }
  return out;
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  cell.border = {
    bottom: { style: "thin", color: { argb: TVS_RED } },
  };
}

/** Force le texte pour que le ré-import ne perde pas le + / les chiffres. */
function writeTextCell(row: ExcelJS.Row, col: number, value: string) {
  const cell = row.getCell(col);
  cell.value = value;
  cell.numFmt = "@";
}

export async function buildContactsWorkbook(
  contacts: ContactExportRow[],
  meta: ExportContactsMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TVS Campaigns";
  workbook.created = meta.exportedAt;

  const varCols =
    contacts.length === 0
      ? [...CONTACT_DEFAULT_VARIABLE_COLUMNS]
      : collectVariableKeys(contacts);
  const headers = [...CONTACT_BASE_COLUMNS, ...varCols];

  // Feuille Contacts en premier — même fichier = modèle d’import
  const sheet = workbook.addWorksheet("Contacts", {
    properties: { defaultColWidth: 16 },
  });

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headers.forEach((header, index) => {
    const col = index + 1;
    const column = sheet.getColumn(col);
    column.width =
      header === "phone" ? 20 : header === "email" ? 28 : header === "name" ? 22 : 16;
    // Format texte sur toute la colonne (saisie manuelle + export)
    column.numFmt = "@";
    const cell = headerRow.getCell(col);
    cell.value = header;
    styleHeaderCell(cell);
  });
  headerRow.commit();

  for (const c of contacts) {
    const vars = asVariableMap(c.variables);
    const row = sheet.addRow([]);
    headers.forEach((header, index) => {
      const col = index + 1;
      let value = "";
      if (header === "phone") value = c.phone ?? "";
      else if (header === "name") value = c.name ?? "";
      else if (header === "email") value = c.email ?? "";
      else value = vars[header] ?? "";
      writeTextCell(row, col, value);
    });
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  const info = workbook.addWorksheet("Infos", {
    views: [{ showGridLines: false }],
  });
  info.getColumn(1).width = 4;
  info.getColumn(2).width = 56;

  let logoRowEnd = 1;
  if (meta.logoPath) {
    try {
      const logoBuf = await readUploadBuffer(meta.logoPath);
      const lower = meta.logoPath.toLowerCase();
      const ext: "png" | "jpeg" | null = lower.endsWith(".png")
        ? "png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "jpeg"
          : null;
      if (!ext) throw new Error("Format logo non supporté dans Excel");
      const imageId = workbook.addImage({
        buffer: logoBuf as unknown as ExcelJS.Buffer,
        extension: ext,
      });
      info.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 120, height: 48 },
      });
      logoRowEnd = 4;
    } catch {
      // logo absent sur disque
    }
  }

  const titleRow = Math.max(logoRowEnd, 2);
  const titleCell = info.getCell(`B${titleRow}`);
  titleCell.value = meta.tenantName;
  titleCell.font = { size: 18, bold: true, color: { argb: TVS_BLUE } };

  info.getCell(`B${titleRow + 1}`).value = `Succursale : ${meta.branchName}`;
  info.getCell(`B${titleRow + 2}`).value =
    `Exporté le ${meta.exportedAt.toLocaleString("fr-FR")}`;
  info.getCell(`B${titleRow + 3}`).value =
    "Ce fichier sert aussi de modèle d’import : modifiez la feuille « Contacts » puis réimportez-le.";
  info.getCell(`B${titleRow + 4}`).value =
    "Colonnes : phone (obligatoire, format texte +E.164) · name · email · variables libres.";
  info.getCell(`B${titleRow + 5}`).value =
    contacts.length === 0
      ? "Aucun contact — remplissez les lignes sous les en-têtes puis importez."
      : `${contacts.length} contact(s) — ne renommez pas les en-têtes phone / name / email.`;

  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 12000,
      height: 8000,
      firstSheet: 0,
      activeTab: 0,
      visibility: "visible",
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
