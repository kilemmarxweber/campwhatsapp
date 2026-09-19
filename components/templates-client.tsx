"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "@/lib/campaigns/actions";
import { composeTemplateCaption } from "@/lib/campaigns/compose-caption";
import { ConfirmAlertDialogButton } from "@/components/confirm-alert-dialog";
import { MediaThumb } from "@/components/media-thumb";
import {
  APP_LINKS,
  MessageCardPreview,
  applyTextStyle,
  type TextStyle,
} from "@/components/message-card-preview";

type Media = { id: string; filename: string; kind: string; storagePath?: string };

type TemplateRow = {
  id: string;
  name: string;
  body: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
  link1Label: string | null;
  link1Url: string | null;
  link2Label: string | null;
  link2Url: string | null;
  media: {
    id: string;
    filename: string;
    kind: string;
    storagePath?: string;
  } | null;
};

const DEFAULT_BODY = "Bonjour {{name}},\n\nDécouvrez nos offres TVS Motors.";

export function TemplatesClient({
  organizationId,
  orgSlug,
  templates,
  media,
}: {
  organizationId: string;
  orgSlug: string;
  templates: TemplateRow[];
  media: Media[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [messageType, setMessageType] = useState<"text" | "image" | "video">(
    "image",
  );
  const [mediaId, setMediaId] = useState("");
  const [textStyle, setTextStyle] = useState<TextStyle>("normal");
  const [link1Label, setLink1Label] = useState("Site TVS");
  const [link1Url, setLink1Url] = useState(APP_LINKS[0].url);
  const [link2Label, setLink2Label] = useState("");
  const [link2Url, setLink2Url] = useState("");

  const selectedMedia = useMemo(
    () => media.find((m) => m.id === mediaId) ?? null,
    [media, mediaId],
  );

  const captionPreview = useMemo(
    () =>
      composeTemplateCaption(applyTextStyle(body, textStyle), {
        link1Label,
        link1Url,
        link2Label,
        link2Url,
      }),
    [body, textStyle, link1Label, link1Url, link2Label, link2Url],
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setBody(DEFAULT_BODY);
    setMessageType("image");
    setMediaId("");
    setTextStyle("normal");
    setLink1Label("Site TVS");
    setLink1Url(APP_LINKS[0].url);
    setLink2Label("");
    setLink2Url("");
  }

  function loadTemplate(t: TemplateRow) {
    setEditingId(t.id);
    setName(t.name);
    setBody(t.body);
    setMessageType(t.messageType);
    setMediaId(t.mediaId ?? "");
    setTextStyle("normal");
    setLink1Label(t.link1Label ?? "Site TVS");
    setLink1Url(t.link1Url ?? APP_LINKS[0].url);
    setLink2Label(t.link2Label ?? "");
    setLink2Url(t.link2Url ?? "");
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
    body: applyTextStyle(body, textStyle),
    messageType,
    mediaId: mediaId || null,
    link1Label: link1Url.trim() ? link1Label : null,
    link1Url: link1Url.trim() || null,
    link2Label: link2Url.trim() ? link2Label : null,
    link2Url: link2Url.trim() || null,
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              if (editingId) {
                await updateTemplate({ ...payload, templateId: editingId });
                toast.success("Template mis à jour");
              } else {
                await createTemplate(payload);
                toast.success("Template créé (image + texte + liens)");
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
                Ici : image/vidéo, style du texte et 1 ou 2 liens. La campagne
                n&apos;ajoute ensuite qu&apos;un texte court.
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
              <label htmlFor="tpl-type">Type</label>
              <select
                id="tpl-type"
                value={messageType}
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
            <div className="field">
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
            </div>
          </div>

          {(messageType === "image" || messageType === "video") && (
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
                  placeholder="Site TVS"
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
            Aperçu carte
          </p>
          <MessageCardPreview
            messageType={messageType}
            caption={captionPreview}
            textStyle={textStyle}
            media={
              selectedMedia?.storagePath
                ? {
                    storagePath: selectedMedia.storagePath,
                    kind: selectedMedia.kind,
                    filename: selectedMedia.filename,
                  }
                : null
            }
          />
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {templates.map((t) => {
          const full = composeTemplateCaption(t.body, t);
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
                <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--fg-muted)]">
                  {full}
                </pre>
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
