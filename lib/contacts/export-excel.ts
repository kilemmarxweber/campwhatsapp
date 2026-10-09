import ExcelJS from "exceljs";
import { readUploadBuffer } from "@/lib/upload-file.server";

const TVS_BLUE = "FF253C80";
const TVS_RED = "FFDC4226";
const HEADER_FILL = TVS_BLUE;

/** Colonnes variables proposées quand la base est vide (modèle d’import). */
const DEFAULT_VARIABLE_COLUMNS = ["ville", "modele"] as const;

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

const BASE_COLUMNS = ["phone", "name", "email"] as const;

function collectVariableKeys(contacts: ContactExportRow[]): string[] {
  const keys = new Set<string>();
  for (const c of contacts) {
    const v = c.variables;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        const key = k.trim().toLowerCase();
        if (key && !(BASE_COLUMNS as readonly string[]).includes(key)) {
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
    if (!key) continue;
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

export async function buildContactsWorkbook(
  contacts: ContactExportRow[],
  meta: ExportContactsMeta,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TVS Campaigns";
  workbook.created = meta.exportedAt;

  const info = workbook.addWorksheet("Infos", {
    views: [{ showGridLines: false }],
  });
  info.getColumn(1).width = 4;
  info.getColumn(2).width = 52;

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
    "Remplissez la feuille « Contacts » puis réimportez le fichier.";
  info.getCell(`B${titleRow + 4}`).value =
    "Colonnes obligatoires : phone · optionnelles : name, email, variables (ville, modele, …).";
  info.getCell(`B${titleRow + 5}`).value =
    contacts.length === 0
      ? "Aucun contact en base — les en-têtes sont prêts à remplir."
      : `${contacts.length} contact(s) exporté(s).`;

  const sheet = workbook.addWorksheet("Contacts");
  const varCols =
    contacts.length === 0
      ? [...DEFAULT_VARIABLE_COLUMNS]
      : collectVariableKeys(contacts);
  const headers = [...BASE_COLUMNS, ...varCols];

  // En-têtes toujours écrits explicitement (même sans ligne de données).
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headers.forEach((header, index) => {
    const col = index + 1;
    sheet.getColumn(col).width =
      header === "phone" ? 18 : header === "email" ? 28 : 16;
    const cell = headerRow.getCell(col);
    cell.value = header;
    styleHeaderCell(cell);
  });
  headerRow.commit();

  for (const c of contacts) {
    const vars = asVariableMap(c.variables);
    const values = headers.map((header) => {
      if (header === "phone") return c.phone;
      if (header === "name") return c.name ?? "";
      if (header === "email") return c.email ?? "";
      return vars[header] ?? "";
    });
    sheet.addRow(values);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  // Ouvrir directement sur la feuille Contacts (index 1)
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 12000,
      height: 8000,
      firstSheet: 1,
      activeTab: 1,
      visibility: "visible",
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
