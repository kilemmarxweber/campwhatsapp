"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { completeFirstLoginPasswordAction } from "@/app/auth/sign-in/actions";
import { authClient, signIn } from "@/lib/auth-client";

export function SignInForm() {
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
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    );
    const result = await completeFirstLoginPasswordAction({
      currentPassword,
      newPassword,
      confirmPassword,
      callbackUrl,
    });
    if (!result.ok) {
      setLoading(false);
      toast.error(result.message);
      return;
    }
    toast.success("Mot de passe enregistré");
    window.location.assign(result.path);
  }

  if (step === "first-login") {
    return (
      <div className="auth-panel">
        <p className="auth-panel__eyebrow">Sécurité</p>
        <h1 className="auth-panel__title">Première connexion</h1>
        <p className="auth-panel__lead">
          Remplacez le mot de passe temporaire avant d’accéder à l’application.
        </p>
        <form onSubmit={onFirstLogin} className="auth-form">
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
          <button className="btn btn-primary auth-form__submit" disabled={loading} type="submit">
            {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <p className="auth-panel__eyebrow">Espace sécurisé</p>
      <h1 className="auth-panel__title">Connexion</h1>
      <p className="auth-panel__lead">
        Accédez aux campagnes WhatsApp &amp; SMS de votre entreprise.
      </p>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="vous@entreprise.com"
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
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary auth-form__submit" disabled={loading} type="submit">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="auth-panel__note">
        Un compte est créé uniquement sur invitation d’une organisation.
      </p>
    </div>
  );
}
