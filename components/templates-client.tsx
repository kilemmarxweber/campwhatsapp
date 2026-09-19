"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTemplate, deleteTemplate } from "@/lib/campaigns/actions";
import { MediaThumb } from "@/components/media-thumb";

type Media = { id: string; filename: string; kind: string; storagePath?: string };

type TemplateRow = {
  id: string;
  name: string;
  body: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
  media: {
    id: string;
    filename: string;
    kind: string;
    storagePath?: string;
  } | null;
};

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
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState<"text" | "image" | "video">(
    "text",
  );
  const [mediaId, setMediaId] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <form
        className="surface flex max-w-xl flex-col gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            try {
              await createTemplate({
                organizationId,
                orgSlug,
                name,
                body,
                messageType,
                mediaId: mediaId || null,
              });
              toast.success("Template créé");
              setName("");
              setBody("");
              setMessageType("text");
              setMediaId("");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      >
        <h2 className="font-medium">Nouveau template</h2>
        <div className="field">
          <label htmlFor="tpl-name">Nom</label>
          <input
            id="tpl-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            Message / légende (variables {"{{name}}"}, {"{{phone}}"}, …)
          </label>
          <textarea
            id="tpl-body"
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={pending} type="submit">
          Enregistrer
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {templates.map((t) => (
          <li key={t.id} className="surface p-4">
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
              <button
                type="button"
                className="btn btn-danger"
                onClick={() =>
                  startTransition(async () => {
                    await deleteTemplate({
                      organizationId,
                      orgSlug,
                      templateId: t.id,
                    });
                    router.refresh();
                  })
                }
              >
                Supprimer
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--fg-muted)]">
              {t.body}
            </pre>
            {t.media?.storagePath ? (
              <div className="mt-3 max-w-xs">
                <MediaThumb
                  storagePath={t.media.storagePath}
                  kind={t.media.kind}
                  filename={t.media.filename}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
