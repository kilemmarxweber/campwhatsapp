"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { completeFirstLoginPasswordAction } from "@/app/auth/sign-in/actions";
import { authClient, signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"sign-in" | "first-login">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void authClient.getSession().then((result) => {
      if (cancelled) return;
      if (result.data?.user?.mustChangePassword) {
        setStep("first-login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? "Connexion impossible");
      return;
    }
    const session = await authClient.getSession();
    setLoading(false);
    if (session.data?.user?.mustChangePassword) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("first-login");
      toast.message("Première connexion : choisissez votre mot de passe.");
      return;
    }
    toast.success("Connecté");
    router.push("/dashboard");
    router.refresh();
  }

  async function onFirstLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await completeFirstLoginPasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Mot de passe enregistré");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="brand-mark mb-8 text-sm uppercase tracking-[0.16em]">
        ← Campagnes
      </Link>
      {step === "first-login" ? (
        <>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--tvs-blue-deep)]">
            Première connexion
          </h1>
          <p className="mb-6 text-sm text-[var(--fg-muted)]">
            Remplacez le mot de passe temporaire avant d’accéder à l’application.
          </p>
          <form onSubmit={onFirstLogin} className="surface flex flex-col gap-4 p-6">
            <div className="field">
              <label htmlFor="current-password">Mot de passe temporaire</label>
              <input
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">Nouveau mot de passe</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirmation</label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        </>
      ) : (
        <>
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
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
          <p className="mt-4 text-sm text-[var(--fg-muted)]">
            Un compte est créé uniquement sur invitation d’une organisation.
          </p>
        </>
      )}
    </main>
  );
}
