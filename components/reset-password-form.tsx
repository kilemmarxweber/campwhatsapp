"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  filterPasswordInput,
  validatePassword,
} from "@/lib/input-security";

export function ResetPasswordForm({
  token,
  error,
}: {
  token: string;
  error: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const invalid = !token || error === "INVALID_TOKEN";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = validatePassword(password, { requireComplexity: true });
    if (!next.ok) {
      toast.error(next.message);
      return;
    }
    if (next.value !== filterPasswordInput(confirm)) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: next.value,
      token,
    });
    setLoading(false);
    if (resetError) {
      toast.error(resetError.message ?? "Réinitialisation impossible");
      return;
    }
    toast.success("Mot de passe mis à jour");
    router.push("/auth/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="brand-mark mb-8 text-sm uppercase tracking-[0.16em]">
        ← Campagnes
      </Link>
      <h1 className="mb-6 text-3xl font-semibold text-[var(--tvs-blue-deep)]">
        Nouveau mot de passe
      </h1>
      {invalid ? (
        <div className="surface flex flex-col gap-4 p-6">
          <p className="text-sm text-[var(--fg-muted)]">
            Ce lien de réinitialisation est invalide ou expiré. Demandez un nouvel
            email depuis la page Équipe.
          </p>
          <Link href="/auth/sign-in" className="btn btn-primary text-center">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="surface flex flex-col gap-4 p-6">
          <div className="field">
            <label htmlFor="password">Nouveau mot de passe</label>
            <input
              id="password"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(event) =>
                setPassword(filterPasswordInput(event.target.value))
              }
              autoComplete="new-password"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Min. {PASSWORD_MIN_LENGTH} caractères, lettre + chiffre.
            </p>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirmer</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirm}
              onChange={(event) =>
                setConfirm(filterPasswordInput(event.target.value))
              }
              autoComplete="new-password"
              spellCheck={false}
            />
          </div>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </main>
  );
}
