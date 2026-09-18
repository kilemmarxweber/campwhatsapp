"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Inscription impossible");
      return;
    }
    toast.success("Compte créé");
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="brand-mark mb-8 text-sm uppercase tracking-[0.16em]">
        ← <span className="tvs">TVS</span> <span className="motors">Motors</span>
      </Link>
      <h1 className="mb-6 text-3xl font-semibold text-[var(--tvs-blue-deep)]">
        Créer un compte
      </h1>
      <form onSubmit={onSubmit} className="surface flex flex-col gap-4 p-6">
        <div className="field">
          <label htmlFor="name">Nom</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Création…" : "S'inscrire"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--fg-muted)]">
        Déjà un compte ?{" "}
        <Link href="/auth/sign-in" className="text-[var(--accent)]">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
