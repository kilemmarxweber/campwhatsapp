"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Connexion impossible");
      return;
    }
    toast.success("Connecté");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="brand-mark mb-8 text-sm uppercase tracking-[0.16em]">
        ← <span className="tvs">TVS</span> <span className="motors">Motors</span>
      </Link>
      <h1 className="mb-6 text-3xl font-semibold text-[var(--tvs-blue-deep)]">
        Connexion
      </h1>
      <form onSubmit={onSubmit} className="surface flex flex-col gap-4 p-6">
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
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--fg-muted)]">
        Pas de compte ?{" "}
        <Link href="/auth/sign-up" className="text-[var(--accent)]">
          S&apos;inscrire
        </Link>
      </p>
    </main>
  );
}
