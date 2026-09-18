/**
 * Seed démo TVS Motors — contacts, médias, templates, campagnes.
 * Compte : demo@tvsrdcongo.com / demo1234
 * Org    : tvs-rdc
 */
import "dotenv/config";
import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_EMAIL = "demo@tvsrdcongo.com";
const DEMO_PASSWORD = "demo1234";
const ORG_SLUG = "tvs-rdc";
const ORG_NAME = "TVS R.D. Congo";

/** Minimal valid JPEG (1×1 pixel, bleu TVS approximatif). */
function tinyJpeg(): Buffer {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
    "base64",
  );
}

/** Minimal ISO BMFF “ftyp” stub labelled as mp4 for seed metadata (non lecture vidéo). */
function tinyMp4Stub(): Buffer {
  // ftyp box only — enough for file presence in uploads/
  return Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00,
    0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  ]);
}

function id() {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

async function ensureUser() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    const userId = id();
    user = await prisma.user.create({
      data: {
        id: userId,
        name: "Demo TVS",
        email: DEMO_EMAIL,
        emailVerified: true,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.account.create({
      data: {
        id: id(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: await hashPassword(DEMO_PASSWORD),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ User créé : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`· User existant : ${DEMO_EMAIL}`);
  }
  return user;
}

async function ensureOrg(userId: string) {
  let org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: id(),
        name: ORG_NAME,
        slug: ORG_SLUG,
        createdAt: new Date(),
        metadata: JSON.stringify({ seeded: true, brand: "TVS Motors" }),
      },
    });
    console.log(`✓ Organisation créée : ${ORG_NAME}`);
  } else {
    console.log(`· Organisation existante : ${ORG_SLUG}`);
  }

  const member = await prisma.member.findFirst({
    where: { organizationId: org.id, userId },
  });
  if (!member) {
    await prisma.member.create({
      data: {
        id: id(),
        organizationId: org.id,
        userId,
        role: "owner",
        createdAt: new Date(),
      },
    });
    console.log("✓ Membre owner lié");
  }

  return org;
}

async function seedContacts(organizationId: string) {
  const samples = [
    {
      phone: "+243844000001",
      name: "Jean Mukendi",
      email: "jean.mukendi@example.com",
      variables: { prenom: "Jean", ville: "Kinshasa", modele: "HLX 150" },
    },
    {
      phone: "+243844000002",
      name: "Marie Kalala",
      email: "marie.kalala@example.com",
      variables: { prenom: "Marie", ville: "Lubumbashi", modele: "NEO NX" },
    },
    {
      phone: "+243844000003",
      name: "Patrick Ilunga",
      email: null,
      variables: { prenom: "Patrick", ville: "Goma", modele: "KING KARGO" },
    },
    {
      phone: "+243844000004",
      name: "Grace Mwamba",
      email: "grace@example.com",
      variables: { prenom: "Grace", ville: "Kinshasa", modele: "XL 100" },
    },
    {
      phone: "+243844000005",
      name: "David Tshisekedi",
      email: null,
      variables: { prenom: "David", ville: "Lubumbashi", modele: "ZT 125" },
    },
  ];

  const contacts = [];
  for (const s of samples) {
    const c = await prisma.contact.upsert({
      where: {
        organizationId_phone: { organizationId, phone: s.phone },
      },
      create: {
        organizationId,
        phone: s.phone,
        name: s.name,
        email: s.email,
        variables: s.variables,
      },
      update: {
        name: s.name,
        email: s.email,
        variables: s.variables,
      },
    });
    contacts.push(c);
  }
  console.log(`✓ ${contacts.length} contacts`);
  return contacts;
}

async function seedMedia(organizationId: string) {
  const dir = path.join(process.cwd(), "uploads", organizationId);
  await mkdir(dir, { recursive: true });

  const imageBuf = tinyJpeg();
  const imageName = "tvs-promo-hlx.jpg";
  const imageRel = path.join("uploads", organizationId, imageName);
  await writeFile(path.join(process.cwd(), imageRel), imageBuf);

  const videoBuf = tinyMp4Stub();
  const videoName = "tvs-promo-king.mp4";
  const videoRel = path.join("uploads", organizationId, videoName);
  await writeFile(path.join(process.cwd(), videoRel), videoBuf);

  // Idempotent : wipe seed media for this org then recreate
  await prisma.mediaAsset.deleteMany({
    where: {
      organizationId,
      filename: { in: [imageName, videoName] },
    },
  });

  const image = await prisma.mediaAsset.create({
    data: {
      organizationId,
      filename: imageName,
      mimeType: "image/jpeg",
      size: imageBuf.byteLength,
      kind: "image",
      storagePath: imageRel.replace(/\\/g, "/"),
    },
  });

  const video = await prisma.mediaAsset.create({
    data: {
      organizationId,
      filename: videoName,
      mimeType: "video/mp4",
      size: videoBuf.byteLength,
      kind: "video",
      storagePath: videoRel.replace(/\\/g, "/"),
    },
  });

  console.log(`✓ Médias : ${image.filename}, ${video.filename}`);
  return { image, video };
}

async function seedTemplates(organizationId: string) {
  await prisma.messageTemplate.deleteMany({
    where: {
      organizationId,
      name: { in: ["Promo HLX", "Crédit moto", "Promo King Kargo"] },
    },
  });

  const templates = await Promise.all([
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Promo HLX",
        body: "Bonjour {{prenom}} ! Offre TVS Motors à {{ville}} : le {{modele}} vous attend. Passez en agence 🛵",
      },
    }),
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Crédit moto",
        body: "Salut {{prenom}}, avec le crédit moto TVS ne rêvez plus — vivez l'aventure. Infos : info@tvsrdcongo.com",
      },
    }),
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Promo King Kargo",
        body: "{{prenom}}, découvrez le KING KARGO multifonctions. Disponible à {{ville}} — TVS R.D. Congo.",
      },
    }),
  ]);
  console.log(`✓ ${templates.length} templates`);
  return templates;
}

async function seedLists(organizationId: string, contactIds: string[]) {
  await prisma.contactList.deleteMany({
    where: { organizationId, name: "Prospects Kinshasa +" },
  });

  const list = await prisma.contactList.create({
    data: {
      organizationId,
      name: "Prospects Kinshasa +",
      description: "Liste seed démo",
      members: {
        create: contactIds.slice(0, 3).map((contactId) => ({ contactId })),
      },
    },
  });
  console.log(`✓ Liste : ${list.name} (${Math.min(3, contactIds.length)} membres)`);
  return list;
}

function renderBody(
  template: string,
  contact: {
    name: string | null;
    phone: string;
    variables: unknown;
  },
) {
  const custom =
    contact.variables &&
    typeof contact.variables === "object" &&
    !Array.isArray(contact.variables)
      ? (contact.variables as Record<string, string>)
      : {};
  const vars: Record<string, string> = {
    name: contact.name ?? "",
    prenom: contact.name?.split(" ")[0] ?? "",
    phone: contact.phone,
    ...custom,
  };
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

async function seedCampaigns(
  organizationId: string,
  contacts: Awaited<ReturnType<typeof seedContacts>>,
  media: Awaited<ReturnType<typeof seedMedia>>,
  listId: string,
) {
  // Remove previous seed campaigns by name
  const seedNames = [
    "Promo HLX 150 — texte",
    "Offre King Kargo — image",
    "Teaser crédit moto — vidéo",
  ];
  await prisma.campaign.deleteMany({
    where: { organizationId, name: { in: seedNames } },
  });

  const textBody =
    "Bonjour {{prenom}} ! Offre TVS Motors à {{ville}} : le {{modele}} vous attend. Passez en agence 🛵";
  const imageCaption =
    "{{prenom}}, découvrez le KING KARGO multifonctions. Disponible à {{ville}} — TVS R.D. Congo.";
  const videoCaption =
    "Salut {{prenom}}, avec le crédit moto TVS ne rêvez plus — vivez l'aventure. Infos agence {{ville}}.";

  const audience = contacts;

  const textCampaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: seedNames[0]!,
      status: "draft",
      messageType: "text",
      bodyTemplate: textBody,
      contactListId: listId,
      recipients: {
        create: audience.map((c) => ({
          contactId: c.id,
          renderedBody: renderBody(textBody, c),
          status: "pending",
        })),
      },
    },
  });

  const imageCampaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: seedNames[1]!,
      status: "draft",
      messageType: "image",
      bodyTemplate: imageCaption,
      mediaId: media.image.id,
      recipients: {
        create: audience.slice(0, 3).map((c) => ({
          contactId: c.id,
          renderedBody: renderBody(imageCaption, c),
          status: "pending",
        })),
      },
    },
  });

  const videoCampaign = await prisma.campaign.create({
    data: {
      organizationId,
      name: seedNames[2]!,
      status: "completed",
      messageType: "video",
      bodyTemplate: videoCaption,
      mediaId: media.video.id,
      startedAt: new Date(Date.now() - 3600_000),
      completedAt: new Date(Date.now() - 3000_000),
      recipients: {
        create: audience.slice(0, 2).map((c, i) => ({
          contactId: c.id,
          renderedBody: renderBody(videoCaption, c),
          status: i === 0 ? "sent" : "failed",
          sentAt: i === 0 ? new Date(Date.now() - 3300_000) : null,
          error: i === 1 ? "Exemple seed : échec simulé" : null,
          klamboMessageId:
            i === 0
              ? `seed_${createHash("sha256").update(c.id).digest("hex").slice(0, 16)}`
              : null,
        })),
      },
    },
  });

  console.log("✓ Campagnes :");
  console.log(`  - ${textCampaign.name} (text / draft / ${audience.length} dest.)`);
  console.log(`  - ${imageCampaign.name} (image / draft / 3 dest.)`);
  console.log(`  - ${videoCampaign.name} (video / completed / 2 dest.)`);
}

async function main() {
  console.log("── Seed TVS Campagnes ──");
  const user = await ensureUser();
  const org = await ensureOrg(user.id);
  const contacts = await seedContacts(org.id);
  const media = await seedMedia(org.id);
  await seedTemplates(org.id);
  const list = await seedLists(
    org.id,
    contacts.map((c) => c.id),
  );
  await seedCampaigns(org.id, contacts, media, list.id);
  console.log("── Terminé ──");
  console.log(`Connexion : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Espace org : /o/${ORG_SLUG}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
