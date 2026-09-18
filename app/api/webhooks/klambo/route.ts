import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getKlamboConfig, verifyKlamboSignature } from "@/lib/klambo/org";

type WebhookBody = {
  id?: string;
  type?: string;
  message_id?: string;
  data?: {
    id?: string;
    status?: string;
    to?: string;
  };
};

const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  "message.sent": "sent",
  "message.delivered": "delivered",
  "message.read": "read",
  "message.failed": "failed",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");
  const eventType = request.headers.get("x-event-type") ?? "";

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const messageId = body.message_id ?? body.data?.id ?? body.id;
  if (!messageId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const recipient = await prisma.campaignRecipient.findFirst({
    where: { klamboMessageId: messageId },
    include: { campaign: { select: { organizationId: true } } },
  });

  if (!recipient) {
    return NextResponse.json({ ok: true, unmatched: true });
  }

  const settings = await getKlamboConfig();

  if (settings?.webhookSecret) {
    const valid = verifyKlamboSignature(
      rawBody,
      signature,
      settings.webhookSecret,
    );
    if (!valid) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }
  }

  const mapped =
    STATUS_MAP[eventType] ??
    STATUS_MAP[body.type ?? ""] ??
    STATUS_MAP[body.data?.status ?? ""];

  if (mapped) {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: mapped,
        ...(mapped === "failed"
          ? { error: "Échec signalé par Klambo" }
          : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
