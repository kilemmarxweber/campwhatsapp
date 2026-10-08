/**
 * Seed démo TVS Motors — contacts, médias, templates, campagnes.
 * Owner  : kilemmarxweber@gmail.com (rôle app admin, owner de l’org)
 * Démo   : demo@tvsrdcongo.com / demo1234
 * Org    : tvs-rdc
 */
import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { writeOrgUpload } from "../lib/upload-file.server";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const OWNER_EMAIL = "kilemmarxweber@gmail.com";
const OWNER_PASSWORD = "K@#&ndoy";
const OWNER_NAME = "kilemmarxweber";
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

async function ensureCredential(
  userId: string,
  password: string,
) {
  const hashed = await hashPassword(password);
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
  });
  if (!account) {
    await prisma.account.create({
      data: {
        id: id(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return;
  }
  await prisma.account.update({
    where: { id: account.id },
    data: { password: hashed },
  });
}

/** Compte owner par défaut : admin applicatif, owner de l’organisation seed. */
async function ensureOwnerUser() {
  let user = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!user) {
    const userId = id();
    user = await prisma.user.create({
      data: {
        id: userId,
        name: OWNER_NAME,
        email: OWNER_EMAIL,
        emailVerified: true,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`✓ Owner créé : ${OWNER_EMAIL}`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin", emailVerified: true, name: user.name || OWNER_NAME },
    });
    console.log(`· Owner existant, rôle admin confirmé : ${OWNER_EMAIL}`);
  }
  await ensureCredential(user.id, OWNER_PASSWORD);
  return user;
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
    await ensureCredential(userId, DEMO_PASSWORD);
    console.log(`✓ User créé : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`· User existant : ${DEMO_EMAIL}`);
  }
  return user;
}

async function ensureOrg(userId: string) {
  const tenant = await prisma.tenantOrganization.upsert({
    where: { slug: ORG_SLUG },
    create: { name: ORG_NAME, slug: ORG_SLUG },
    update: { name: ORG_NAME },
  });
  let org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: id(),
        name: ORG_NAME,
        slug: ORG_SLUG,
        createdAt: new Date(),
        tenantId: tenant.id,
        metadata: JSON.stringify({ seeded: true, brand: ORG_NAME }),
      },
    });
    console.log(`✓ Organisation créée : ${ORG_NAME}`);
  } else {
    console.log(`· Organisation existante : ${ORG_SLUG}`);
  }

  if (org.tenantId !== tenant.id) {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { tenantId: tenant.id },
    });
  }

  await linkMember(org.id, tenant.id, userId, "owner");

  return { org, tenant };
}

async function linkMember(
  organizationId: string,
  tenantId: string,
  userId: string,
  role: "owner" | "admin" | "user",
) {
  const member = await prisma.member.findFirst({
    where: { organizationId, userId },
  });
  if (!member) {
    await prisma.member.create({
      data: {
        id: id(),
        organizationId,
        userId,
        role,
        createdAt: new Date(),
      },
    });
    console.log(`✓ Membre ${role} lié`);
  } else if (member.role !== role) {
    await prisma.member.update({
      where: { id: member.id },
      data: { role },
    });
    console.log(`✓ Membre passé en ${role}`);
  }

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, role },
    update: { role },
  });
}

async function seedContacts(organizationId: string) {
  const samples = [
    {
      phone: "+243844000001",
      name: "Jean Mukendi",
      email: "jean.mukendi@example.com",
      variables: { ville: "Kinshasa", modele: "HLX 150" },
    },
    {
      phone: "+243844000002",
      name: "Marie Kalala",
      email: "marie.kalala@example.com",
      variables: { ville: "Lubumbashi", modele: "NEO NX" },
    },
    {
      phone: "+243844000003",
      name: "Patrick Ilunga",
      email: null,
      variables: { ville: "Goma", modele: "KING KARGO" },
    },
    {
      phone: "+243844000004",
      name: "Grace Mwamba",
      email: "grace@example.com",
      variables: { ville: "Kinshasa", modele: "XL 100" },
    },
    {
      phone: "+243844000005",
      name: "David Tshisekedi",
      email: null,
      variables: { ville: "Lubumbashi", modele: "ZT 125" },
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
  const imageBuf = tinyJpeg();
  const imageName = "tvs-promo-hlx.jpg";
  const videoBuf = tinyMp4Stub();
  const videoName = "tvs-promo-king.mp4";

  const imageSaved = await writeOrgUpload({
    organizationId,
    filename: imageName,
    buffer: imageBuf,
  });
  const videoSaved = await writeOrgUpload({
    organizationId,
    filename: videoName,
    buffer: videoBuf,
  });

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
      storagePath: imageSaved.relativePath,
    },
  });

  const video = await prisma.mediaAsset.create({
    data: {
      organizationId,
      filename: videoName,
      mimeType: "video/mp4",
      size: videoBuf.byteLength,
      kind: "video",
      storagePath: videoSaved.relativePath,
    },
  });

  console.log(
    `✓ Médias dans UPLOAD_DIR : ${imageSaved.absolutePath}, ${videoSaved.absolutePath}`,
  );
  return { image, video };
}

async function seedTemplates(
  organizationId: string,
  media: Awaited<ReturnType<typeof seedMedia>>,
) {
  await prisma.messageTemplate.deleteMany({
    where: {
      organizationId,
      name: {
        in: ["Promo HLX", "Crédit moto", "Promo King Kargo", "Teaser vidéo"],
      },
    },
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_SITE_URL?.trim() ||
    "https://www.tvsrdcongo.com/";
  const creditUrl =
    process.env.NEXT_PUBLIC_APP_CREDIT_URL?.trim() || siteUrl;

  const templates = await Promise.all([
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Promo HLX",
        messageType: "text",
        body: "Bonjour {{name}} ! Offre TVS Motors à {{ville}} : le {{modele}} vous attend. Passez en agence 🛵",
        link1Label: "Site TVS",
        link1Url: siteUrl,
      },
    }),
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Promo King Kargo",
        messageType: "image",
        mediaId: media.image.id,
        body: "*KING KARGO*\n\n{{name}}, découvrez le KING KARGO multifonctions. Disponible à {{ville}} — TVS R.D. Congo.",
        link1Label: "Site TVS",
        link1Url: siteUrl,
        link2Label: "Crédit moto",
        link2Url: creditUrl,
      },
    }),
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Teaser vidéo",
        messageType: "video",
        mediaId: media.video.id,
        body: "Salut {{name}}, avec le crédit moto TVS ne rêvez plus — vivez l'aventure. Infos agence {{ville}}.",
        link1Label: "Crédit moto",
        link1Url: creditUrl,
      },
    }),
    prisma.messageTemplate.create({
      data: {
        organizationId,
        name: "Crédit moto",
        messageType: "text",
        body: "Salut {{name}}, avec le crédit moto TVS ne rêvez plus — vivez l'aventure.",
        link1Label: "Crédit moto",
        link1Url: creditUrl,
      },
    }),
  ]);
  console.log(`✓ ${templates.length} templates (texte / image / vidéo + liens)`);
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
    "Bonjour {{name}} ! Offre TVS Motors à {{ville}} : le {{modele}} vous attend. Passez en agence 🛵";
  const imageCaption =
    "{{name}}, découvrez le KING KARGO multifonctions. Disponible à {{ville}} — TVS R.D. Congo.";
  const videoCaption =
    "Salut {{name}}, avec le crédit moto TVS ne rêvez plus — vivez l'aventure. Infos agence {{ville}}.";

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
      status: "draft",
      messageType: "video",
      bodyTemplate: videoCaption,
      mediaId: media.video.id,
      // Destinataires prêts, mais ne pas marquer sent : le stub MP4 seed
      // est rejeté par WhatsApp. Uploadez un vrai MP4 avant envoi.
      recipients: {
        create: audience.slice(0, 2).map((c) => ({
          contactId: c.id,
          renderedBody: renderBody(videoCaption, c),
          status: "pending",
        })),
      },
    },
  });

  console.log("✓ Campagnes :");
  console.log(`  - ${textCampaign.name} (text / draft / ${audience.length} dest.)`);
  console.log(`  - ${imageCampaign.name} (image / draft / 3 dest.)`);
  console.log(
    `  - ${videoCampaign.name} (video / draft / 2 dest. — stub, remplacer le MP4 avant envoi)`,
  );
}

async function main() {
  console.log("── Seed TVS Campagnes ──");
  const owner = await ensureOwnerUser();
  const user = await ensureUser();
  const { org, tenant } = await ensureOrg(user.id);
  await linkMember(org.id, tenant.id, owner.id, "owner");
  const contacts = await seedContacts(org.id);
  const media = await seedMedia(org.id);
  await seedTemplates(org.id, media);
  const list = await seedLists(
    org.id,
    contacts.map((c) => c.id),
  );
  await seedCampaigns(org.id, contacts, media, list.id);
  console.log("── Terminé ──");
  console.log(`Owner    : ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`Démo     : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
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
