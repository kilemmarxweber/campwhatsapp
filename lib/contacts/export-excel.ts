import ExcelJS from "exceljs";
import { readUploadBuffer } from "@/lib/upload-file.server";

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

const BASE_COLUMNS = ["phone", "name", "email"] as const;

function collectVariableKeys(contacts: ContactExportRow[]): string[] {
  const keys = new Set<string>();
  for (const c of contacts) {
    const v = c.variables;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        keys.add(k.toLowerCase());
      }
    }
  }
  return [...keys].sort();
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
  info.mergeCells(`B${titleRow}:B${titleRow}`);
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

  const sheet = workbook.addWorksheet("Contacts");
  const varCols = collectVariableKeys(contacts);
  const headers = [...BASE_COLUMNS, ...varCols];

  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: h === "phone" ? 18 : h === "email" ? 28 : 16,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
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
  });

  for (const c of contacts) {
    const vars =
      c.variables && typeof c.variables === "object" && !Array.isArray(c.variables)
        ? (c.variables as Record<string, string>)
        : {};
    const row: Record<string, string> = {
      phone: c.phone,
      name: c.name ?? "",
      email: c.email ?? "",
    };
    for (const key of varCols) {
      row[key] = vars[key] ?? vars[key.toLowerCase()] ?? "";
    }
    sheet.addRow(row);
  }

  if (contacts.length === 0) {
    const example: Record<string, string> = {
      phone: "+243844000000",
      name: "Exemple Client",
      email: "client@example.com",
    };
    for (const key of varCols) {
      example[key] = key === "ville" ? "Kinshasa" : key === "modele" ? "HLX 150" : "";
    }
    const exRow = sheet.addRow(example);
    exRow.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF888888" } };
    });
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
