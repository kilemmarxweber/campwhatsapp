"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTemplate, deleteTemplate } from "@/lib/campaigns/actions";

export function TemplatesClient({
  organizationId,
  orgSlug,
  templates,
}: {
  organizationId: string;
  orgSlug: string;
  templates: { id: string; name: string; body: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

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
              });
              toast.success("Template créé");
              setName("");
              setBody("");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erreur");
            }
          });
        }}
      >
        <h2 className="font-medium">Nouveau template</h2>
        <div className="field">
          <label>Nom</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Corps</label>
          <textarea
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
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-medium">{t.name}</p>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
