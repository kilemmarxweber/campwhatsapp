"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalSlug = slug || slugify(name);
    if (!finalSlug) {
      toast.error("Slug invalide");
      return;
    }
    setLoading(true);
    const { data, error } = await authClient.organization.create({
      name: name.trim(),
      slug: finalSlug,
    });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? "Création impossible");
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    toast.success("Organisation créée");
    router.push(`/o/${data.slug}`);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="brand-mark mb-3 text-sm uppercase tracking-[0.16em]">
        <span className="tvs">TVS</span>
        <span className="motors">Motors</span>
      </p>
      <h1 className="mb-2 text-3xl font-semibold text-[var(--tvs-blue-deep)]">
        Créer une organisation
      </h1>
      <p className="mb-6 text-[var(--fg-muted)]">
        Chaque organisation a ses contacts, campagnes et clé Klambo.
      </p>
      <form onSubmit={onSubmit} className="surface flex flex-col gap-4 p-6">
        <div className="field">
          <label htmlFor="name">Nom</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="slug">Slug (URL)</label>
          <input
            id="slug"
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Création…" : "Continuer"}
        </button>
      </form>
    </main>
  );
}
