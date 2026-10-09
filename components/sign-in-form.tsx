"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { completeFirstLoginPasswordAction } from "@/app/auth/sign-in/actions";
import { authClient, signIn } from "@/lib/auth-client";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  emailValidationMessage,
  filterEmailInput,
  filterPasswordInput,
  isSafeCallbackPath,
  normalizeEmail,
  validatePassword,
  validateSignInPassword,
} from "@/lib/input-security";

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
    const emailError = emailValidationMessage(email);
    if (emailError) {
      toast.error(emailError);
      return;
    }
    const pwd = validateSignInPassword(password);
    if (!pwd.ok) {
      toast.error(pwd.message);
      return;
    }

    setLoading(true);
    const { error } = await signIn.email({
      email: normalizeEmail(email),
      password: pwd.value,
    });
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
    const current = validateSignInPassword(currentPassword);
    if (!current.ok) {
      toast.error("Mot de passe temporaire invalide");
      return;
    }
    const next = validatePassword(newPassword, { requireComplexity: true });
    if (!next.ok) {
      toast.error(next.message);
      return;
    }
    if (next.value !== filterPasswordInput(confirmPassword)) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const rawCallback = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    );
    const callbackUrl = isSafeCallbackPath(rawCallback) ? rawCallback : null;
    const result = await completeFirstLoginPasswordAction({
      currentPassword: current.value,
      newPassword: next.value,
      confirmPassword: next.value,
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
        <form onSubmit={onFirstLogin} className="auth-form" autoComplete="off">
          <div className="field">
            <label htmlFor="current-password">Mot de passe temporaire</label>
            <input
              id="current-password"
              type="password"
              required
              maxLength={PASSWORD_MAX_LENGTH}
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(filterPasswordInput(event.target.value))
              }
              autoComplete="current-password"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(filterPasswordInput(event.target.value))
              }
              autoComplete="new-password"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Min. {PASSWORD_MIN_LENGTH} caractères, avec au moins une lettre et
              un chiffre.
            </p>
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirmation</label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(filterPasswordInput(event.target.value))
              }
              autoComplete="new-password"
              spellCheck={false}
            />
          </div>
          <button
            className="btn btn-primary auth-form__submit"
            disabled={loading}
            type="submit"
          >
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
      <form onSubmit={onSubmit} className="auth-form" autoComplete="on">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            maxLength={EMAIL_MAX_LENGTH}
            pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+"
            title="Format : vous@domaine.com"
            value={email}
            onChange={(event) => setEmail(filterEmailInput(event.target.value))}
            onBlur={() => setEmail(normalizeEmail(email))}
            onPaste={(event) => {
              event.preventDefault();
              const text = event.clipboardData.getData("text");
              setEmail(filterEmailInput(text));
            }}
            autoComplete="username"
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
            maxLength={PASSWORD_MAX_LENGTH}
            value={password}
            onChange={(event) =>
              setPassword(filterPasswordInput(event.target.value))
            }
            onPaste={(event) => {
              event.preventDefault();
              const text = event.clipboardData.getData("text");
              setPassword(filterPasswordInput(text));
            }}
            autoComplete="current-password"
            spellCheck={false}
            placeholder="••••••••"
          />
        </div>
        <button
          className="btn btn-primary auth-form__submit"
          disabled={loading}
          type="submit"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
      <p className="auth-panel__note">
        Un compte est créé uniquement sur invitation d’une organisation.
      </p>
    </div>
  );
}
