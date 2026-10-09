import "dotenv/config";
import { prisma } from "../lib/prisma";
import { processCampaign } from "../lib/campaigns/process";

const ORG = "u8V28c0wW3ZjkpS9XcVeOJGGUfXkcGHk";
const CONTACT = "cmuzpl09t0001gwvrp8xwg54j";
const SENDER = "447860088970";

async function main() {
  const branch = await prisma.organization.findUnique({
    where: { id: ORG },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) throw new Error("succursale introuvable");

  const config = await prisma.infobipWhatsappConfig.update({
    where: { tenantId: branch.tenantId },
    data: { fromNumber: SENDER },
    select: { fromNumber: true },
  });
  console.log("sender", config.fromNumber);

  const contact = await prisma.contact.findFirst({
    where: { id: CONTACT, organizationId: ORG, phone: "+243844952966" },
  });
  if (!contact) throw new Error("contact introuvable");

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: ORG,
      name: "Renvoi +44 7860 088970",
      status: "sending",
      messageType: "text",
      channel: "whatsapp",
      bodyTemplate: "Bonjour {{name}}",
      whatsappTemplateName: "test_whatsapp_template_en",
      whatsappLanguage: "en",
      startedAt: new Date(),
      recipients: {
        create: {
          contactId: contact.id,
          renderedBody: `Bonjour ${contact.name ?? ""}`.trim(),
          status: "pending",
        },
      },
    },
    select: { id: true },
  });

  await processCampaign(campaign.id);

  const recipient = await prisma.campaignRecipient.findFirst({
    where: { campaignId: campaign.id },
    select: {
      status: true,
      error: true,
      klamboMessageId: true,
      campaign: { select: { status: true, id: true } },
    },
  });
  console.log(JSON.stringify(recipient));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
