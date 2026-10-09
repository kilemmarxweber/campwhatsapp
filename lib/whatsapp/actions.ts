"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { assertCanEditTenantChannels } from "@/lib/auth/tenant-channel-access";
import { encryptSecret } from "@/lib/crypto";
import { requireOrganizationPermission } from "@/lib/auth/organization-permission";
import { toInfobipPlaceholders } from "@/lib/campaigns/render-template";
import {
  createInfobipWhatsappTemplate,
  getInfobipWhatsappTemplate,
  verifyInfobipAccount,
} from "@/lib/whatsapp/infobip-client";
import {
  getInfobipWhatsappConfig,
  getInfobipWhatsappCredentials,
  normalizeWhatsappProvider,
} from "@/lib/whatsapp/config";
import {
  assertInfobipApiKey,
  assertInfobipBaseUrl,
} from "@/lib/sms/validate";
import {
  absoluteUploadUrl,
  isInfobipReachableMediaUrl,
} from "@/lib/whatsapp/media-url";
import {
  assertWhatsappFrom,
  assertWhatsappLanguage,
  assertWhatsappTemplateName,
} from "@/lib/whatsapp/validate";

async function assertTenantEditor(tenantId: string, organizationId: string) {
  try {
    await assertCanEditTenantChannels(tenantId, organizationId);
  } catch (err) {
    return err instanceof Error ? err.message : "Accès refusé";
  }
  const tenant = await prisma.tenantOrganization.findUnique({
    where: { id: tenantId },
    select: { id: true, slug: true },
  });
  if (!tenant) return "Organisation introuvable";
  return tenant;
}

export async function setWhatsappProvider(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  provider: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const tenant = await assertTenantEditor(input.tenantId, input.organizationId);
  if (typeof tenant === "string") return { ok: false, message: tenant };
  const provider = normalizeWhatsappProvider(input.provider);
  await prisma.tenantOrganization.update({
    where: { id: tenant.id },
    data: { whatsappProvider: provider },
  });
  revalidatePath("/admin");
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}

export async function saveInfobipWhatsappSettings(input: {
  tenantId: string;
  organizationId: string;
  orgSlug: string;
  apiKey?: string;
  baseUrl: string;
  fromNumber: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const tenant = await assertTenantEditor(input.tenantId, input.organizationId);
  if (typeof tenant === "string") return { ok: false, message: tenant };

  const existing = await getInfobipWhatsappConfig(tenant.id);
  let baseUrl: string;
  let fromNumber: string;
  try {
    baseUrl = assertInfobipBaseUrl(input.baseUrl);
    fromNumber = assertWhatsappFrom(input.fromNumber);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Paramètres invalides",
    };
  }

  const keyInput = input.apiKey?.trim() ?? "";
  let apiKey = keyInput;
  try {
    if (keyInput) {
      apiKey = assertInfobipApiKey(keyInput);
    } else if (existing?.apiKeyEnc) {
      apiKey = (await getInfobipWhatsappCredentials(tenant.id)).apiKey;
    } else {
      return {
        ok: false,
        message: "Collez une clé API pour la première configuration",
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Clé API invalide",
    };
  }

  try {
    await verifyInfobipAccount({ apiKey, baseUrl, scope: "whatsapp" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Compte Infobip refusé : ${msg}` };
  }

  const apiKeyEnc = keyInput ? encryptSecret(apiKey) : existing!.apiKeyEnc;
  await prisma.infobipWhatsappConfig.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, apiKeyEnc, baseUrl, fromNumber },
    update: { apiKeyEnc, baseUrl, fromNumber },
  });

  revalidatePath("/admin");
  revalidatePath(`/organisations/${tenant.slug}`);
  revalidatePath(`/o/${input.orgSlug}/settings`);
  return { ok: true };
}

function infobipModelName(requested: string | null | undefined, fallback: string) {
  const raw = (requested?.trim() || fallback).toLowerCase();
  const slugged = /^[a-z][a-z0-9_]*$/.test(raw) ? raw.slice(0, 512) : slugTemplateName(raw);
  const checked = assertWhatsappTemplateName(slugged);
  if (!checked) throw new Error("Indiquez un nom de modèle.");
  return checked;
}

function slugTemplateName(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 512);
  if (!/^[a-z]/.test(slug)) return `tvs_${slug || "modele"}`;
  return slug;
}

function exampleForKey(
  key: string,
  contact: { name: string | null; phone: string; email: string | null } | null,
) {
  if (key === "name") return contact?.name?.trim() || "Client";
  if (key === "phone") {
    const digits = (contact?.phone ?? "").replace(/\D/g, "");
    return digits || "243000000000";
  }
  if (key === "email") return contact?.email?.trim() || "client@example.com";
  return "exemple";
}

export async function submitInfobipWhatsappTemplate(input: {
  organizationId: string;
  orgSlug: string;
  templateId: string;
  body: string;
  infobipTemplateName?: string | null;
  infobipLanguage?: string | null;
  messageType?: "text" | "image" | "video";
  mediaId?: string | null;
}): Promise<{ ok: true; status: string; name: string } | { ok: false; message: string }> {
  try {
    await requireOrganizationPermission(input.organizationId, { templates: ["update"] });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Accès refusé" };
  }

  const template = await prisma.messageTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    select: { id: true, channel: true, name: true },
  });
  if (!template || template.channel !== "whatsapp") {
    return { ok: false, message: "Template WhatsApp introuvable." };
  }

  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return { ok: false, message: "Organisation introuvable." };

  let credentials: Awaited<ReturnType<typeof getInfobipWhatsappCredentials>>;
  try {
    credentials = await getInfobipWhatsappCredentials(branch.tenantId);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "WhatsApp Infobip non configuré.",
    };
  }

  let converted: { text: string; keys: string[] };
  let language: string;
  let name: string;
  try {
    converted = toInfobipPlaceholders(input.body);
    if (!converted.text) return { ok: false, message: "Le texte du modèle est vide." };
    if (converted.text.length > 1024) {
      return { ok: false, message: "Le texte dépasse 1024 caractères." };
    }
    if (/^\{\{\d+\}\}/.test(converted.text) || /\{\{\d+\}\}$/.test(converted.text)) {
      return {
        ok: false,
        message:
          "WhatsApp refuse une variable au début ou à la fin. Ajoutez du texte autour de {{name}} et {{phone}}.",
      };
    }
    language = assertWhatsappLanguage(input.infobipLanguage || "fr");
    name = infobipModelName(input.infobipTemplateName, template.name);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Modèle invalide." };
  }

  const sample = await prisma.contact.findFirst({
    where: { organizationId: input.organizationId },
    orderBy: { createdAt: "asc" },
    select: { name: true, phone: true, email: true },
  });
  const examples = converted.keys.map((key) => exampleForKey(key, sample));
  const messageType = input.messageType ?? "text";
  let header: { format: "IMAGE" | "VIDEO"; example: string } | undefined;
  let mediaId: string | null = null;
  if (messageType === "image" || messageType === "video") {
    if (!input.mediaId) {
      return { ok: false, message: "Choisissez une image ou une vidéo avant de soumettre le modèle." };
    }
    const media = await prisma.mediaAsset.findFirst({
      where: { id: input.mediaId, organizationId: input.organizationId },
      select: { id: true, kind: true, storagePath: true },
    });
    if (!media || media.kind !== messageType) {
      return { ok: false, message: "Le média ne correspond pas au type du modèle." };
    }
    const example = absoluteUploadUrl(media.storagePath);
    header = {
      format: messageType === "image" ? "IMAGE" : "VIDEO",
      example,
    };
    mediaId = media.id;
  }

  try {
    const created = await createInfobipWhatsappTemplate({
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
      sender: credentials.fromNumber,
      name,
      language,
      bodyText: converted.text,
      examples,
      header,
    });
    const status = created.status ?? "PENDING";
    await prisma.messageTemplate.update({
      where: { id: template.id },
      data: {
        body: input.body,
        messageType,
        mediaId,
        infobipTemplateName: created.name ?? name,
        infobipLanguage: created.language ?? language,
        infobipTemplateId: created.id ?? null,
        infobipTemplateStatus: status,
      },
    });
    revalidatePath(`/o/${input.orgSlug}/templates`);
    return { ok: true, status, name: created.name ?? name };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Infobip a refusé le modèle.";
    const localMedia =
      header && !isInfobipReachableMediaUrl(header.example)
        ? " Le fichier choisi est servi en local : WhatsApp a besoin d'une adresse https publique pour vérifier le média."
        : "";
    const message = /template creation or modification .* forbidden/i.test(raw)
      ? `Infobip refuse la création de modèles sur ce numéro expéditeur. Le numéro de test n'autorise souvent que le modèle déjà approuvé. Utilisez un numéro WhatsApp Business qui permet de gérer les modèles, ou créez le modèle dans le portail Infobip puis indiquez son nom ici.${localMedia}`
      : `${raw}${localMedia}`;
    return { ok: false, message };
  }
}

export async function refreshInfobipWhatsappTemplate(input: {
  organizationId: string;
  orgSlug: string;
  templateId: string;
}): Promise<{ ok: true; status: string } | { ok: false; message: string }> {
  try {
    await requireOrganizationPermission(input.organizationId, { templates: ["read"] });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Accès refusé" };
  }
  const template = await prisma.messageTemplate.findFirst({
    where: { id: input.templateId, organizationId: input.organizationId },
    select: { infobipTemplateId: true, infobipTemplateStatus: true },
  });
  if (!template?.infobipTemplateId) {
    if (template?.infobipTemplateStatus === "EXISTING") {
      return { ok: true, status: "EXISTING" };
    }
    return { ok: false, message: "Ce modèle n'a pas encore été soumis à Infobip." };
  }
  const branch = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { tenantId: true },
  });
  if (!branch?.tenantId) return { ok: false, message: "Organisation introuvable." };
  try {
    const credentials = await getInfobipWhatsappCredentials(branch.tenantId);
    const remote = await getInfobipWhatsappTemplate({
      apiKey: credentials.apiKey,
      baseUrl: credentials.baseUrl,
      sender: credentials.fromNumber,
      templateId: template.infobipTemplateId,
    });
    const status = remote.status ?? "PENDING";
    await prisma.messageTemplate.update({
      where: { id: input.templateId },
      data: { infobipTemplateStatus: status },
    });
    revalidatePath(`/o/${input.orgSlug}/templates`);
    return { ok: true, status };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Statut Infobip indisponible.",
    };
  }
}
