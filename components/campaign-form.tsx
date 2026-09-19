"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createCampaign, updateCampaign } from "@/lib/campaigns/actions";
import { renderTemplate } from "@/lib/campaigns/render-template";

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  variables: unknown;
};

type Media = { id: string; filename: string; kind: string };
type List = { id: string; name: string; _count: { members: number } };
type Template = {
  id: string;
  name: string;
  body: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
};

type InitialCampaign = {
  id: string;
  name: string;
  bodyTemplate: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
  contactListId: string | null;
  contactIds: string[];
};

export function CampaignForm({
  organizationId,
  orgSlug,
  contacts,
  media,
  lists,
  templates,
  initial,
}: {
  organizationId: string;
  orgSlug: string;
  contacts: Contact[];
  media: Media[];
  lists: List[];
  templates: Template[];
  initial?: InitialCampaign;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.bodyTemplate ?? "Bonjour {{name}}, ");
  const [messageType, setMessageType] = useState<"text" | "image" | "video">(
    initial?.messageType ?? "text",
  );
  const [mediaId, setMediaId] = useState(initial?.mediaId ?? "");
  const [listId, setListId] = useState(initial?.contactListId ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.contactIds ?? []);
  const isEdit = Boolean(initial);

  const preview = useMemo(() => {
    const sample = contacts[0];
    if (!sample) return body;
    const vars = {
      name: sample.name ?? "",
      phone: sample.phone,
      ...((sample.variables as Record<string, string>) ?? {}),
    };
    return renderTemplate(body, vars);
  }, [body, contacts]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            if (isEdit && initial) {
              await updateCampaign({
                organizationId,
                orgSlug,
                campaignId: initial.id,
                name,
                bodyTemplate: body,
                messageType,
                mediaId: mediaId || null,
                contactListId: listId || null,
                contactIds: listId ? [] : selected,
              });
              toast.success("Campagne mise à jour");
              router.push(`/o/${orgSlug}/campaigns/${initial.id}`);
            } else {
              const campaign = await createCampaign({
                organizationId,
                orgSlug,
                name,
                bodyTemplate: body,
                messageType,
                mediaId: mediaId || null,
                contactListId: listId || null,
                contactIds: listId ? [] : selected,
                sendNow: true,
              });
              toast.success("Campagne lancée");
              router.push(`/o/${orgSlug}/campaigns/${campaign.id}`);
            }
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
          }
        });
      }}
    >
      <div className="surface grid gap-4 p-5 md:grid-cols-2">
        <div className="field">
          <label htmlFor="campaign-name">Nom de la campagne</label>
          <input
            id="campaign-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Promo Mars — Kinshasa"
            className="text-[var(--fg)]"
          />
        </div>
        <div className="field">
          <label htmlFor="campaign-type">Type</label>
          <select
            id="campaign-type"
            value={messageType}
            onChange={(e) =>
              setMessageType(e.target.value as "text" | "image" | "video")
            }
          >
            <option value="text">Texte</option>
            <option value="image">Image + légende</option>
            <option value="video">Vidéo + légende</option>
          </select>
        </div>
        {(messageType === "image" || messageType === "video") && (
          <div className="field md:col-span-2">
            <label htmlFor="campaign-media">Média</label>
            <select
              id="campaign-media"
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
        <div className="field md:col-span-2">
          <label htmlFor="campaign-body">
            Message (variables {"{{name}}"}, {"{{phone}}"}, …)
          </label>
          <textarea
            id="campaign-body"
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {templates.length > 0 && (
          <div className="field md:col-span-2">
            <label htmlFor="campaign-template">Charger un template</label>
            <select
              id="campaign-template"
              defaultValue=""
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value);
                if (!t) return;
                setBody(t.body);
                setMessageType(t.messageType);
                setMediaId(t.mediaId ?? "");
                toast.message(
                  t.messageType === "text"
                    ? "Template texte chargé"
                    : `Template ${t.messageType} + média chargés`,
                );
              }}
            >
              <option value="">—</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.messageType}
                  {t.mediaId ? " + média" : ""})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="surface bg-[var(--bg-soft)] p-4 md:col-span-2">
          <p className="mb-1 text-xs text-[var(--fg-muted)]">Aperçu</p>
          <p className="mb-1 text-xs text-[var(--fg-muted)]">
            Type : {messageType}
            {mediaId
              ? ` · ${media.find((m) => m.id === mediaId)?.filename ?? "média"}`
              : ""}
          </p>
          <p className="whitespace-pre-wrap text-[var(--fg)]">{preview}</p>
        </div>
      </div>

      <div className="surface p-5">
        <h2 className="mb-3 font-medium">Audience</h2>
        <div className="field mb-4">
          <label htmlFor="campaign-list">Liste (optionnel)</label>
          <select
            id="campaign-list"
            value={listId}
            onChange={(e) => setListId(e.target.value)}
          >
            <option value="">Sélection manuelle</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l._count.members})
              </option>
            ))}
          </select>
        </div>
        {!listId && (
          <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)]">
            {contacts.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 py-2 text-sm last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span className="text-[var(--fg)]">{c.name || "Sans nom"}</span>
                <span className="font-mono text-[var(--fg-muted)]">
                  {c.phone}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary self-start" disabled={pending} type="submit">
        {pending
          ? isEdit
            ? "Enregistrement…"
            : "Envoi…"
          : isEdit
            ? "Enregistrer"
            : "Créer et envoyer"}
      </button>
    </form>
  );
}
