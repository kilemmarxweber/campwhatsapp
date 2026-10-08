import prisma from "@/lib/prisma";
import { KlamboClient } from "@/lib/klambo/client";

const WEBHOOK_EVENTS = [
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
];

export async function registerKlamboWebhook(
  tenantId: string,
  apiKey: string,
  baseUrl: string,
) {
  const appUrl =
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (!appUrl || appUrl.includes("localhost")) {
    return null;
  }
  try {
    const client = new KlamboClient(apiKey, baseUrl);
    const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/klambo`;
    const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);
    if (result.secret) {
      await prisma.klamboConfig.update({
        where: { tenantId },
        data: { webhookSecret: result.secret },
      });
    }
    return result;
  } catch (err) {
    console.warn("[klambo] registerWebhook failed:", err);
    return null;
  }
}
