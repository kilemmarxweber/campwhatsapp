"use client";

import { useMemo, useState } from "react";
import { usePendingOverlay } from "@/components/page-loader";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/lib/campaigns/actions";
import { composeSmsText, composeTemplateCaption } from "@/lib/campaigns/compose-caption";
import {
  BASE_CONTACT_VARS,
  extractTemplateKeys,
  toInfobipPlaceholders,
} from "@/lib/campaigns/render-template";
import {
  refreshInfobipWhatsappTemplate,
  submitInfobipWhatsappTemplate,
} from "@/lib/whatsapp/actions";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";
import { MediaThumb } from "@/components/media-thumb";
import {
  APP_LINKS,
  MessageCardPreview,
  PlaceholderText,
  applyTextStyle,
  type TextStyle,
} from "@/components/message-card-preview";

type Media = { id: string; filename: string; kind: string; storagePath?: string };

type TemplateRow = {
  id: string;
  name: string;
  body: string;
  messageType: "text" | "image" | "video";
  channel: "whatsapp" | "sms";
  mediaId: string | null;
  link1Label: string | null;
  link1Url: string | null;
  link2Label: string | null;
  link2Url: string | null;
  infobipTemplateName: string | null;
  infobipLanguage: string;
  infobipTemplateId: string | null;
  infobipTemplateStatus: string | null;
  media: {
    id: string;
    filename: string;
    kind: string;
    storagePath?: string;
  } | null;
};

const DEFAULT_BODY = "Bonjour {{name}},\n\nDécouvrez nos offres.";

function infobipStatusLabel(status: string | null | undefined) {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
      return "approuvé";
    case "PENDING":
      return "en attente";
    case "REJECTED":
      return "refusé";
    case "EXISTING":
      return "enregistré";
    default:
      return status ? status.toLowerCase() : "";
  }
}

export function TemplatesClient({
  organizationId,
  orgSlug,
  brandName,
  templates,
  media,
  whatsappProvider = "klambo",
}: {
  organizationId: string;
  orgSlug: string;
  brandName: string;
  templates: TemplateRow[];
  media: Media[];
  whatsappProvider?: string;
}) {
  const router = useRouter();
  const { pending, startTransition } = usePendingOverlay();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [messageType, setMessageType] = useState<"text" | "image" | "video">(
    "image",
  );
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [mediaId, setMediaId] = useState("");
  const [textStyle, setTextStyle] = useState<TextStyle>("normal");
  const [link1Label, setLink1Label] = useState("Site");
  const [link1Url, setLink1Url] = useState(APP_LINKS[0].url);
  const [link2Label, setLink2Label] = useState("");
  const [link2Url, setLink2Url] = useState("");
  const [infobipTemplateName, setInfobipTemplateName] = useState("");
  const [infobipLanguage, setInfobipLanguage] = useState("fr");
  const [infobipStatus, setInfobipStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedMedia = useMemo(
    () => media.find((m) => m.id === mediaId) ?? null,
    [media, mediaId],
  );

  const captionPreview = useMemo(
    () =>
      channel === "sms"
        ? composeSmsText(body, { link1Label, link1Url, link2Label, link2Url })
        : composeTemplateCaption(applyTextStyle(body, textStyle), {
            link1Label,
            link1Url,
            link2Label,
            link2Url,
          }),
    [body, textStyle, link1Label, link1Url, link2Label, link2Url, channel],
  );
  const previewVariables = useMemo(
    () => extractTemplateKeys(captionPreview),
    [captionPreview],
  );
  const infobipBody = useMemo(() => toInfobipPlaceholders(body), [body]);
  const usesInfobip = channel === "whatsapp" && whatsappProvider === "infobip";

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    setBody((prev) => {
      const sep =
        !prev || prev.endsWith(" ") || prev.endsWith("\n") ? "" : " ";
      return `${prev}${sep}${token}`;
    });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setBody(DEFAULT_BODY);
    setMessageType("image");
    setChannel("whatsapp");
    setMediaId("");
    setTextStyle("normal");
    setLink1Label("Site");
    setLink1Url(APP_LINKS[0].url);
    setLink2Label("");
    setLink2Url("");
    setInfobipTemplateName("");
    setInfobipLanguage("fr");
    setInfobipStatus(null);
    setSubmitError(null);
  }

  function loadTemplate(t: TemplateRow) {
    setEditingId(t.id);
    setName(t.name);
    setBody(t.body);
    setMessageType(t.messageType);
    setChannel(t.channel);
    setMediaId(t.mediaId ?? "");
    setTextStyle("normal");
    setLink1Label(t.link1Label ?? "Site");
    setLink1Url(t.link1Url ?? APP_LINKS[0].url);
    setLink2Label(t.link2Label ?? "");
    setLink2Url(t.link2Url ?? "");
    setInfobipTemplateName(t.infobipTemplateName ?? "");
    setInfobipLanguage(t.infobipLanguage || "fr");
    setInfobipStatus(t.infobipTemplateStatus);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillLinkSlot(slot: 1 | 2, label: string, url: string) {
    if (slot === 1) {
      setLink1Label(label);
      setLink1Url(url);
    } else {
      setLink2Label(label);
      setLink2Url(url);
    }
    toast.message(`${label} → lien ${slot}`);
  }

  const payload = {
    organizationId,
    orgSlug,
    name,
      body: channel === "sms" ? body : applyTextStyle(body, textStyle),
    messageType,
    channel,
    mediaId: mediaId || null,
    link1Label: link1Url.trim() ? link1Label : null,
    link1Url: link1Url.trim() || null,
    link2Label: link2Url.trim() ? link2Label : null,
    link2Url: link2Url.trim() || null,
    infobipTemplateName: channel === "whatsapp" ? infobipTemplateName.trim() || null : null,
    infobipLanguage: channel === "whatsapp" ? infobipLanguage : "en",
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              let templateId = editingId;
              if (editingId) {
                await updateTemplate({ ...payload, templateId: editingId });
                toast.success("Template mis à jour");
              } else {
                const created = await createTemplate(payload);
                templateId = created.id;
                toast.success(
                  channel === "sms"
                    ? "Template SMS créé"
                    : "Template WhatsApp créé",
                );
              }
              const withMedia =
                usesInfobip &&
                !editingId &&
                (messageType === "image" || messageType === "video");
              if (withMedia && templateId) {
                if (!payload.mediaId) {
                  setSubmitError(
                    "Choisissez une image ou une vidéo. Elle part avec le modèle pour l'approbation.",
                  );
                } else {
                  const result = await submitInfobipWhatsappTemplate({
                    organizationId,
                    orgSlug,
                    templateId,
                    body: payload.body,
                    infobipTemplateName: payload.infobipTemplateName,
                    infobipLanguage: payload.infobipLanguage,
                    messageType: payload.messageType,
                    mediaId: payload.mediaId,
                  });
                  if (!result.ok) {
                    resetForm();
                    setSubmitError(result.message);
                    toast.error(result.message);
                    router.refresh();
                    return;
                  }
                  toast.success(
                    `Modèle soumis (${infobipStatusLabel(result.status)})`,
                  );
                }
              }
              resetForm();
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      >
        <div className="surface flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">
                {editingId ? "Modifier le template" : "Nouveau template"}
              </h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                {channel === "sms"
                  ? "SMS : texte, variables {{name}}, {{phone}}, … et 1 ou 2 liens."
                  : "WhatsApp : texte, variables {{name}}, {{phone}}, …, style, média et 1 ou 2 liens."}
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={resetForm}
              >
                Annuler
              </button>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="tpl-name">Nom</label>
            <input
              id="tpl-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Promo image + site"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label htmlFor="tpl-channel">Canal</label>
              <select id="tpl-channel" value={channel} onChange={(e) => { const next = e.target.value as "whatsapp" | "sms"; setChannel(next); if (next === "sms") { setMessageType("text"); setMediaId(""); } }}>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="tpl-type">Type</label>
              <select
                id="tpl-type"
                value={messageType}
                disabled={channel === "sms"}
                onChange={(e) => {
                  const next = e.target.value as "text" | "image" | "video";
                  setMessageType(next);
                  setMediaId("");
                }}
              >
                <option value="text">Texte</option>
                <option value="image">Image + légende</option>
                <option value="video">Vidéo + légende</option>
              </select>
            </div>
            {channel === "whatsapp" ? <div className="field">
              <label htmlFor="tpl-style">Style du texte</label>
              <select
                id="tpl-style"
                value={textStyle}
                onChange={(e) => setTextStyle(e.target.value as TextStyle)}
              >
                <option value="normal">Normal</option>
                <option value="promo">Promo (titre en gras)</option>
                <option value="offer">Offre (accent + emoji)</option>
              </select>
            </div> : <div className="rounded-lg bg-[var(--tvs-blue-soft)]/40 p-3 text-sm text-[var(--fg-muted)]">SMS : texte et liens uniquement, sans média.</div>}
          </div>

          {usesInfobip ? (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field">
                  <label htmlFor="tpl-infobip-name">Nom du modèle WhatsApp</label>
                  <input
                    id="tpl-infobip-name"
                    value={infobipTemplateName}
                    onChange={(e) => setInfobipTemplateName(e.target.value.trim())}
                    placeholder="offre_tvs"
                    spellCheck={false}
                  />
                  <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
                    Minuscules et _. Laisser vide reprend le nom du template.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="tpl-infobip-lang">Langue du modèle</label>
                  <select
                    id="tpl-infobip-lang"
                    value={infobipLanguage}
                    onChange={(e) => setInfobipLanguage(e.target.value)}
                  >
                    <option value="fr">fr</option>
                    <option value="en">en</option>
                    <option value="pt">pt</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-[var(--fg-muted)]">
                {"{{name}}"} et {"{{phone}}"} viennent de la fiche contact. À
                l&apos;envoi, chaque destinataire reçoit son nom et son numéro.
                Pour l&apos;approbation, elles deviennent {"{{1}}"} puis {"{{2}}"}.
              </p>
              <p className="rounded-md bg-[var(--tvs-blue-soft)]/40 px-3 py-2 font-mono text-sm">
                {infobipBody.text || "Le texte envoyé à WhatsApp apparaîtra ici."}
              </p>
              {messageType === "image" || messageType === "video" ? (
                <p className="text-sm text-[var(--fg-muted)]">
                  {messageType === "image" ? "L'image" : "La vidéo"} est
                  obligatoire pour l&apos;approbation. Elle part dans
                  l&apos;en-tête, depuis le dossier médias du VPS
                  (/var/www/api-uploads), sur une adresse https publique.
                </p>
              ) : null}
              {infobipBody.keys.length > 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">
                  {infobipBody.keys
                    .map((key, index) => `{{${index + 1}}} = contact.${key}`)
                    .join(" · ")}
                  . L&apos;exemple d&apos;approbation est pris sur le premier contact.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {infobipStatus ? (
                  <span className="badge" style={{ textTransform: "none" }}>
                    WhatsApp : {infobipStatusLabel(infobipStatus)}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending || !editingId}
                  onClick={() => {
                    if (!editingId) return;
                    startTransition(async () => {
                      setSubmitError(null);
                      const result = await submitInfobipWhatsappTemplate({
                        organizationId,
                        orgSlug,
                        templateId: editingId,
                        body: payload.body,
                        infobipTemplateName: payload.infobipTemplateName,
                        infobipLanguage: payload.infobipLanguage,
                        messageType: payload.messageType,
                        mediaId: payload.mediaId,
                      });
                      if (!result.ok) {
                        setSubmitError(result.message);
                        toast.error(result.message);
                        return;
                      }
                      setInfobipTemplateName(result.name);
                      setInfobipStatus(result.status);
                      toast.success(
                        `Modèle soumis (${infobipStatusLabel(result.status)})`,
                      );
                      router.refresh();
                    });
                  }}
                >
                  {pending ? "Envoi…" : "Soumettre pour approbation"}
                </button>
                {infobipStatus ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending || !editingId}
                    onClick={() => {
                      if (!editingId) return;
                      startTransition(async () => {
                        const result = await refreshInfobipWhatsappTemplate({
                          organizationId,
                          orgSlug,
                          templateId: editingId,
                        });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        setInfobipStatus(result.status);
                        toast.success(
                          `Statut : ${infobipStatusLabel(result.status)}`,
                        );
                        router.refresh();
                      });
                    }}
                  >
                    Actualiser le statut
                  </button>
                ) : null}
              </div>
              {!editingId ? (
                <p className="text-xs text-[var(--fg-muted)]">
                  Enregistrez le template, puis soumettez-le à WhatsApp.
                </p>
              ) : null}
              {submitError ? (
                <p className="text-sm text-[var(--tvs-red)]">{submitError}</p>
              ) : null}
            </div>
          ) : null}

          {channel === "whatsapp" && (messageType === "image" || messageType === "video") && (
            <div className="field">
              <label htmlFor="tpl-media">Média</label>
              <select
                id="tpl-media"
                required
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {media
                  .filter((m) => m.kind === messageType)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.filename}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="tpl-body">
              Texte (variables {"{{name}}"}, {"{{phone}}"}, …)
            </label>
            <textarea
              id="tpl-body"
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {BASE_CONTACT_VARS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
                  onClick={() => insertVariable(key)}
                >
                  + {`{{${key}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-[var(--fg-muted)] uppercase">
              Liens (1 ou 2)
            </p>
            <div className="flex flex-wrap gap-2">
              {APP_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
                  onClick={() => {
                    if (!link1Url.trim()) fillLinkSlot(1, link.label, link.url);
                    else if (!link2Url.trim())
                      fillLinkSlot(2, link.label, link.url);
                    else fillLinkSlot(1, link.label, link.url);
                  }}
                >
                  + {link.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="field">
                <label htmlFor="tpl-l1-label">Lien 1 — libellé</label>
                <input
                  id="tpl-l1-label"
                  value={link1Label}
                  onChange={(e) => setLink1Label(e.target.value)}
                  placeholder="Site"
                />
              </div>
              <div className="field">
                <label htmlFor="tpl-l1-url">Lien 1 — URL</label>
                <input
                  id="tpl-l1-url"
                  type="url"
                  value={link1Url}
                  onChange={(e) => setLink1Url(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <label htmlFor="tpl-l2-label">Lien 2 — libellé (optionnel)</label>
                <input
                  id="tpl-l2-label"
                  value={link2Label}
                  onChange={(e) => setLink2Label(e.target.value)}
                  placeholder="Crédit moto"
                />
              </div>
              <div className="field">
                <label htmlFor="tpl-l2-url">Lien 2 — URL (optionnel)</label>
                <input
                  id="tpl-l2-url"
                  type="url"
                  value={link2Url}
                  onChange={(e) => setLink2Url(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>

          <button className="btn btn-primary self-start" disabled={pending} type="submit">
            {pending
              ? editingId
                ? "Mise à jour…"
                : "Enregistrement…"
              : editingId
                ? "Enregistrer les modifications"
                : "Enregistrer le template"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            {channel === "sms" ? "Aperçu SMS" : "Aperçu WhatsApp"}
          </p>
          <MessageCardPreview
            channel={channel}
            brand={brandName}
            messageType={messageType}
            caption={captionPreview}
            textStyle={textStyle}
            media={
              channel === "whatsapp" && selectedMedia?.storagePath
                ? {
                    storagePath: selectedMedia.storagePath,
                    kind: selectedMedia.kind,
                    filename: selectedMedia.filename,
                  }
                : null
            }
          />
          {previewVariables.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {previewVariables.map((key) => (
                <span key={key} className="badge font-mono" style={{ textTransform: "none" }}>{`{{${key}}}`}</span>
              ))}
            </div>
          ) : null}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
          {templates.map((t) => {
          const full = t.channel === "sms" ? composeSmsText(t.body, t) : composeTemplateCaption(t.body, t);
          const isEditing = editingId === t.id;
          return (
            <li
              key={t.id}
              className={`surface p-4 ${isEditing ? "ring-2 ring-[var(--tvs-blue)]" : ""}`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{t.name}</p>
                  <span className="badge">{t.messageType}</span>
                  <span className="badge">{t.channel.toUpperCase()}</span>
                  {t.channel === "whatsapp" && t.infobipTemplateStatus ? (
                    <span className="badge" style={{ textTransform: "none" }}>
                      {infobipStatusLabel(t.infobipTemplateStatus)}
                    </span>
                  ) : null}
                  {t.media && (
                    <span className="text-sm text-[var(--fg-muted)]">
                      {t.media.filename}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={() => loadTemplate(t)}
                  >
                    Modifier
                  </button>
                  <ConfirmAlertDialogButton
                    className="btn btn-danger"
                    pending={pending}
                    disabled={pending}
                    title="Supprimer ce template ?"
                    description={`« ${t.name} » sera supprimé définitivement. Les campagnes déjà créées ne sont pas affectées.`}
                    confirmLabel="Supprimer"
                    variant="destructive"
                    onConfirm={() =>
                      startTransition(async () => {
                        try {
                          await deleteTemplate({
                            organizationId,
                            orgSlug,
                            templateId: t.id,
                          });
                          if (editingId === t.id) resetForm();
                          toast.success("Template supprimé");
                          router.refresh();
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Erreur",
                          );
                        }
                      })
                    }
                  >
                    Supprimer
                  </ConfirmAlertDialogButton>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <PlaceholderText
                  text={full}
                  className="whitespace-pre-wrap text-sm text-[var(--fg-muted)]"
                />
                {t.media?.storagePath ? (
                  <div className="max-w-[200px]">
                    <MediaThumb
                      storagePath={t.media.storagePath}
                      kind={t.media.kind}
                      filename={t.media.filename}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
