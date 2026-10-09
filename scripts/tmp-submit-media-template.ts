import "dotenv/config";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptSecret } from "../lib/crypto";
import { toInfobipPlaceholders } from "../lib/campaigns/render-template";
import { createInfobipWhatsappTemplate } from "../lib/whatsapp/infobip-client";
import { absoluteUploadUrl } from "../lib/whatsapp/media-url";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ORG = "u8V28c0wW3ZjkpS9XcVeOJGGUfXkcGHk";
const MEDIA_ID = "cmu74qrtk0000bkvr7nbozy1j";

const models = [
  {
    name: "Test Infobip image",
    infobipTemplateName: "tvs_klambo_image",
    body: "Bonjour {{name}}, voici le visuel TVS Motors.",
  },
  {
    name: "Offre visuel TVS",
    infobipTemplateName: "tvs_klambo_offre",
    body: "Bonjour {{name}}, une offre TVS Motors vous attend.",
  },
];

async function main() {
  const media = await prisma.mediaAsset.findFirst({
    where: { id: MEDIA_ID, organizationId: ORG },
  });
  if (!media) throw new Error("media missing");
  const example = absoluteUploadUrl(media.storagePath);
  console.log("example-host", new URL(example).host);

  const cfg = await prisma.infobipWhatsappConfig.findFirst({
    where: { tenant: { slug: "tvs-motors" } },
  });
  if (!cfg) throw new Error("config missing");
  const apiKey = decryptSecret(cfg.apiKeyEnc);

  for (const model of models) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { organizationId: ORG, name: model.name },
    });
    const saved = existing
      ? await prisma.messageTemplate.update({
          where: { id: existing.id },
          data: {
            body: model.body,
            messageType: "image",
            channel: "whatsapp",
            mediaId: media.id,
            infobipTemplateName: model.infobipTemplateName,
            infobipLanguage: "en",
          },
        })
      : await prisma.messageTemplate.create({
          data: {
            organizationId: ORG,
            name: model.name,
            body: model.body,
            messageType: "image",
            channel: "whatsapp",
            mediaId: media.id,
            infobipTemplateName: model.infobipTemplateName,
            infobipLanguage: "en",
          },
        });
    const converted = toInfobipPlaceholders(model.body);
    try {
      const created = await createInfobipWhatsappTemplate({
        apiKey,
        baseUrl: cfg.baseUrl,
        sender: cfg.fromNumber,
        name: model.infobipTemplateName,
        language: "en",
        bodyText: converted.text,
        examples: ["kilem marx"],
        header: { format: "IMAGE", example },
      });
      await prisma.messageTemplate.update({
        where: { id: saved.id },
        data: {
          infobipTemplateId: created.id ?? null,
          infobipTemplateName: created.name ?? model.infobipTemplateName,
          infobipLanguage: created.language ?? "en",
          infobipTemplateStatus: created.status ?? "PENDING",
        },
      });
      console.log(model.infobipTemplateName, created.status ?? "PENDING", created.id ?? "");
    } catch (err) {
      console.log(model.infobipTemplateName, err instanceof Error ? err.message : err);
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
