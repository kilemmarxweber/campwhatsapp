import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret } from "../lib/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function summarize(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  const structure = row.structure as { body?: { text?: string } } | undefined;
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    status: row.status,
    category: row.category,
    body: structure?.body?.text ?? null,
  };
}

async function main() {
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { campaignId: "cmv0cd6o6000268vr2668cjtb" },
    select: {
      status: true,
      error: true,
      klamboMessageId: true,
      sentAt: true,
      campaign: {
        select: { status: true, whatsappTemplateName: true, whatsappLanguage: true },
      },
    },
  });
  console.log("recipient", recipient);
  return;
  const contacts = await prisma.contact.findMany({
    where: { phone: { contains: "844952966" } },
    select: {
      id: true,
      name: true,
      phone: true,
      organization: { select: { id: true, slug: true, tenantId: true } },
    },
  });
  console.log("contacts", JSON.stringify(contacts));

  const configs = await prisma.infobipWhatsappConfig.findMany({
    select: {
      tenantId: true,
      baseUrl: true,
      fromNumber: true,
      apiKeyEnc: true,
      tenant: { select: { slug: true, whatsappProvider: true } },
    },
  });
  console.log(
    "configs",
    configs.map((row) => ({
      tenant: row.tenant.slug,
      provider: row.tenant.whatsappProvider,
      baseUrl: row.baseUrl,
      fromNumber: row.fromNumber,
      hasKey: Boolean(row.apiKeyEnc),
    })),
  );
  const cfg = configs[0];
  if (!cfg) {
    console.log("no infobip config");
    return;
  }
  const apiKey = decryptSecret(cfg.apiKeyEnc);
  const res = await fetch(
    `${cfg.baseUrl.replace(/\/$/, "")}/whatsapp/2/senders/${cfg.fromNumber}/templates?name=test_whatsapp_template_en`,
    { headers: { Authorization: `App ${apiKey}`, Accept: "application/json" } },
  );
  const text = await res.text();
  console.log("status", res.status);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.log("body-not-json", text.slice(0, 300));
    return;
  }
  const root = data as { templates?: unknown[] };
  const list = Array.isArray(data) ? data : root.templates ?? [];
  console.log("count", list.length);
  for (const item of list) console.log(JSON.stringify(summarize(item)));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
