"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSuccursale } from "@/lib/succursales/actions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function CreateSuccursaleForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <form
      className="surface flex max-w-lg flex-col gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const created = await createSuccursale({
              name,
              slug: slug || slugify(name),
            });
            toast.success("Succursale créée");
            router.push(`/o/${created.slug}`);
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
          }
        });
      }}
    >
      <h2 className="text-lg font-medium">Nouvelle succursale</h2>
      <p className="text-sm text-[var(--fg-muted)]">
        Contacts et campagnes isolés par site. La connexion WhatsApp est
        partagée au siège.
      </p>
      <div className="field">
        <label htmlFor="branch-name">Nom</label>
        <input
          id="branch-name"
          required
          placeholder="ex. Kinshasa Centre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSlug(slugify(e.target.value));
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="branch-slug">Slug (URL)</label>
        <input
          id="branch-slug"
          required
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Création…" : "Créer la succursale"}
      </button>
    </form>
  );
}
