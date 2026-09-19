"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCampaign, updateCampaign } from "@/lib/campaigns/actions";
import { composeTemplateCaption } from "@/lib/campaigns/compose-caption";
import {
  BASE_CONTACT_VARS,
  extractTemplateKeys,
  renderTemplate,
} from "@/lib/campaigns/render-template";
import { MessageCardPreview } from "@/components/message-card-preview";

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  variables: unknown;
};

type Media = { id: string; filename: string; kind: string; storagePath?: string };
type List = { id: string; name: string; _count: { members: number } };
type Template = {
  id: string;
  name: string;
  body: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
  link1Label: string | null;
  link1Url: string | null;
  link2Label: string | null;
  link2Url: string | null;
};

type InitialCampaign = {
  id: string;
  name: string;
  bodyTemplate: string;
  messageType: "text" | "image" | "video";
  mediaId: string | null;
  contactListId: string | null;
  contactIds: string[];
  templateId?: string;
  note?: string;
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
  const [templateId, setTemplateId] = useState(
    initial?.templateId ?? templates[0]?.id ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [listId, setListId] = useState(initial?.contactListId ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.contactIds ?? []);
  const isEdit = Boolean(initial);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  const selectedMedia = useMemo(() => {
    if (!selectedTemplate?.mediaId) return null;
    return media.find((m) => m.id === selectedTemplate.mediaId) ?? null;
  }, [media, selectedTemplate]);

  /** Variables déjà dans le template choisi (restent au-dessus). */
  const templateOnlyVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    return extractTemplateKeys(selectedTemplate.body);
  }, [selectedTemplate]);

  /** Variables dans le texte additionnel. */
  const noteVariables = useMemo(() => extractTemplateKeys(note), [note]);

  /** Toutes les variables du message final. */
  const allMessageVariables = useMemo(() => {
    if (!selectedTemplate) return noteVariables;
    return extractTemplateKeys(
      composeTemplateCaption(selectedTemplate.body, selectedTemplate, note),
    );
  }, [selectedTemplate, note, noteVariables]);

  /** Clés proposées pour insertion dans le texte. */
  const insertableVariables = useMemo(() => {
    const fromContacts = new Set<string>();
    for (const c of contacts) {
      const custom = c.variables;
      if (custom && typeof custom === "object" && !Array.isArray(custom)) {
        for (const key of Object.keys(custom as Record<string, unknown>)) {
          fromContacts.add(key.toLowerCase());
        }
      }
    }
    const ordered = new Set<string>([
      ...BASE_CONTACT_VARS,
      ...templateOnlyVariables,
      ...fromContacts,
    ]);
    return [...ordered];
  }, [contacts, templateOnlyVariables]);

  const captionPreview = useMemo(() => {
    if (!selectedTemplate) return note;
    const composed = composeTemplateCaption(
      selectedTemplate.body,
      selectedTemplate,
      note,
    );
    const sample = contacts[0];
    if (!sample) return composed;
    return renderTemplate(composed, {
      name: sample.name || "{{name}}",
      phone: sample.phone || "{{phone}}",
      ...((sample.variables as Record<string, string>) ?? {}),
    });
  }, [selectedTemplate, note, contacts]);

  function insertVariableIntoNote(key: string) {
    const token = `{{${key}}}`;
    setNote((prev) => {
      const sep = !prev.trim()
        ? ""
        : prev.endsWith(" ") || prev.endsWith("\n")
          ? ""
          : " ";
      return `${prev}${sep}${token}`;
    });
    toast.message(`${token} ajouté au texte`);
  }

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
        if (!templateId) {
          toast.error("Choisissez un template");
          return;
        }
        startTransition(async () => {
          try {
            if (isEdit && initial) {
              await updateCampaign({
                organizationId,
                orgSlug,
                campaignId: initial.id,
                name,
                templateId,
                note,
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
                templateId,
                note,
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
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]">
        <div className="surface flex flex-col gap-4 p-5">
          <div className="field">
            <label htmlFor="campaign-name">Nom de la campagne</label>
            <input
              id="campaign-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Promo Mars — Kinshasa"
            />
          </div>

          <div className="field">
            <label htmlFor="campaign-template">
              Template (image + style + liens)
            </label>
            <select
              id="campaign-template"
              required
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.messageType}
                  {t.link1Url ? " · liens" : ""})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Le média, le style du texte et les liens viennent du template.
            </p>
          </div>

          {selectedTemplate ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--tvs-blue-soft)]/40 p-3">
              <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--fg-muted)] uppercase">
                Variables du template
              </p>
              {templateOnlyVariables.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">
                  Ce template n’utilise pas de variable ({`{{name}}`},{" "}
                  {`{{phone}}`}, …).
                </p>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {templateOnlyVariables.map((key) => (
                      <span key={key} className="badge">
                        {`{{${key}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Remplies automatiquement avec le nom / téléphone (et autres
                    champs) de chaque contact à l’envoi.
                  </p>
                </>
              )}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="campaign-note">Texte additionnel</label>
            <textarea
              id="campaign-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. Offre valable jusqu’au 30 mars — {{name}}, passez en agence."
            />
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium tracking-wide text-[var(--fg-muted)] uppercase">
                Ajouter une variable au texte
              </p>
              <div className="flex flex-wrap gap-2">
                {insertableVariables.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
                    onClick={() => insertVariableIntoNote(key)}
                  >
                    + {`{{${key}}}`}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[var(--fg-muted)]">
                Vous pouvez en ajouter une ou plusieurs : elles prendront les
                valeurs du contact à l’envoi
                {noteVariables.length > 0
                  ? ` · dans le texte : ${noteVariables.map((k) => `{{${k}}}`).join(", ")}`
                  : ""}
                {allMessageVariables.length > 0
                  ? ` · message final : ${allMessageVariables.map((k) => `{{${k}}}`).join(", ")}`
                  : ""}
                .
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--tvs-blue-deep)]">
            Aperçu (template + note)
          </p>
          <MessageCardPreview
            messageType={selectedTemplate?.messageType ?? "text"}
            caption={captionPreview}
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
