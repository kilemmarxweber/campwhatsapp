import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CampaignReportRow,
  ChannelMessageStats,
  DateRange,
} from "@/lib/campaigns/message-stats";
import { inclusiveEndDate, toInputDate } from "@/lib/campaigns/message-stats";

export type ReportExportPayload = {
  orgName: string;
  branchName: string;
  range: DateRange;
  whatsapp: ChannelMessageStats;
  sms: ChannelMessageStats;
  campaigns: CampaignReportRow[];
};

function periodLabel(range: DateRange) {
  return `${toInputDate(range.from)} → ${toInputDate(inclusiveEndDate(range))}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export async function buildReportWorkbook(
  payload: ReportExportPayload,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TVS Campaigns";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Résumé");
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 22;
  summary.getColumn(3).width = 18;

  summary.addRow(["Rapport campagnes"]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FF253C80" } };
  summary.addRow(["Organisation", payload.orgName]);
  summary.addRow(["Succursale", payload.branchName]);
  summary.addRow(["Période", periodLabel(payload.range)]);
  summary.addRow([]);
  summary.addRow(["Canal", "Réussis", "Échoués"]);
  summary.getRow(6).font = { bold: true };
  summary.getRow(6).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF253C80" },
  };
  summary.getRow(6).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.addRow([
    "WhatsApp",
    payload.whatsapp.completed,
    payload.whatsapp.failed,
  ]);
  summary.addRow(["SMS", payload.sms.completed, payload.sms.failed]);
  summary.addRow([
    "Total",
    payload.whatsapp.completed + payload.sms.completed,
    payload.whatsapp.failed + payload.sms.failed,
  ]);

  const sheet = workbook.addWorksheet("Campagnes");
  const headers = [
    "Nom",
    "Canal",
    "Type",
    "Statut",
    "Créée le",
    "Destinataires",
    "Réussis",
    "Échoués",
  ];
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF253C80" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
  sheet.columns = [
    { width: 28 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  for (const c of payload.campaigns) {
    sheet.addRow([
      c.name,
      c.channel,
      c.messageType,
      c.status,
      toInputDate(c.createdAt),
      c.recipientsTotal,
      c.recipientsCompleted,
      c.recipientsFailed,
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildReportPdf(payload: ReportExportPayload): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  doc.setFontSize(16);
  doc.setTextColor(37, 60, 128);
  doc.text("Rapport campagnes", margin, 18);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Organisation : ${payload.orgName}`, margin, 28);
  doc.text(`Succursale : ${payload.branchName}`, margin, 34);
  doc.text(`Période : ${periodLabel(payload.range)}`, margin, 40);

  autoTable(doc, {
    startY: 48,
    head: [["Canal", "Réussis", "Échoués", "Total"]],
    body: [
      [
        "WhatsApp",
        fmt(payload.whatsapp.completed),
        fmt(payload.whatsapp.failed),
        fmt(payload.whatsapp.completed + payload.whatsapp.failed),
      ],
      [
        "SMS",
        fmt(payload.sms.completed),
        fmt(payload.sms.failed),
        fmt(payload.sms.completed + payload.sms.failed),
      ],
      [
        "Total",
        fmt(payload.whatsapp.completed + payload.sms.completed),
        fmt(payload.whatsapp.failed + payload.sms.failed),
        fmt(
          payload.whatsapp.completed +
            payload.whatsapp.failed +
            payload.sms.completed +
            payload.sms.failed,
        ),
      ],
    ],
    headStyles: { fillColor: [37, 60, 128] },
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });

  const afterSummary =
    (
      doc as unknown as {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable?.finalY ?? 70;

  doc.setFontSize(12);
  doc.setTextColor(37, 60, 128);
  doc.text("Campagnes de la période", margin, afterSummary + 12);

  autoTable(doc, {
    startY: afterSummary + 16,
    head: [["Nom", "Canal", "Statut", "Dest.", "OK", "Échec"]],
    body: payload.campaigns.map((c) => [
      c.name.slice(0, 40),
      c.channel,
      c.status,
      String(c.recipientsTotal),
      String(c.recipientsCompleted),
      String(c.recipientsFailed),
    ]),
    headStyles: { fillColor: [37, 60, 128] },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
