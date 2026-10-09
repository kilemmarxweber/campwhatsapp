import { NextResponse } from "next/server";
import {
  getOrganizationBySlug,
  requireOrganizationPermission,
} from "@/lib/auth/organization-permission";
import {
  getCampaignReportRows,
  getOrganizationMessageStats,
  parseReportRange,
  toInputDate,
  inclusiveEndDate,
} from "@/lib/campaigns/message-stats";
import {
  buildReportPdf,
  buildReportWorkbook,
} from "@/lib/campaigns/report-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orgSlug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { orgSlug } = await params;
    const org = await getOrganizationBySlug(orgSlug);
    if (!org?.tenant) {
      return NextResponse.json(
        { message: "Succursale introuvable" },
        { status: 404 },
      );
    }

    await requireOrganizationPermission(org.id, { campaigns: ["read"] });

    const url = new URL(request.url);
    const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();
    const range = parseReportRange({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });

    const [messageStats, campaigns] = await Promise.all([
      getOrganizationMessageStats(org.id, range),
      getCampaignReportRows(org.id, range),
    ]);

    const payload = {
      orgName: org.tenant.name,
      branchName: org.name,
      range,
      whatsapp: messageStats.whatsapp,
      sms: messageStats.sms,
      campaigns,
    };

    const stampFrom = toInputDate(range.from);
    const stampTo = toInputDate(inclusiveEndDate(range));
    const baseName = `rapport-${orgSlug}-${stampFrom}_${stampTo}`;

    if (format === "pdf") {
      const buffer = buildReportPdf(payload);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(buffer.byteLength),
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = await buildReportWorkbook(payload);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export impossible";
    const status =
      message === "Non authentifié"
        ? 401
        : message.includes("refusé") || message.includes("Permission")
          ? 403
          : 500;
    return NextResponse.json({ message }, { status });
  }
}
