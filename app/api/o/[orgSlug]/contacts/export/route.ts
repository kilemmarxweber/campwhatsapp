import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getOrganizationBySlug,
  requireOrganizationPermission,
} from "@/lib/auth/organization-permission";
import { buildContactsWorkbook } from "@/lib/contacts/export-excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orgSlug: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { orgSlug } = await params;
    const org = await getOrganizationBySlug(orgSlug);
    if (!org?.tenant) {
      return NextResponse.json(
        { message: "Succursale introuvable" },
        { status: 404 },
      );
    }

    await requireOrganizationPermission(org.id, { contacts: ["read"] });

    let logoPath: string | null = null;
    try {
      const logoRows = await prisma.$queryRaw<{ logoPath: string | null }[]>`
        SELECT "logoPath" FROM "tenant_organization"
        WHERE "id" = ${org.tenant.id}
        LIMIT 1
      `;
      logoPath = logoRows[0]?.logoPath ?? null;
    } catch {
      logoPath = null;
    }

    const contacts = await prisma.contact.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: {
        phone: true,
        name: true,
        email: true,
        variables: true,
      },
    });

    const exportedAt = new Date();
    const buffer = await buildContactsWorkbook(contacts, {
      tenantName: org.tenant.name,
      branchName: org.name,
      exportedAt,
      logoPath,
    });

    const stamp = exportedAt.toISOString().slice(0, 10);
    const filename = `contacts-${orgSlug}-${stamp}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Contacts-Count": String(contacts.length),
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
