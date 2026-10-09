import Link from "next/link";
import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion à Klambocore Campagnes.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand" aria-hidden={false}>
        <div className="auth-brand__inner">
          <Link href="/" className="auth-brand__back">
            ← Accueil
          </Link>
          <p className="auth-brand__klambo">Klambocore</p>
          <p className="auth-brand__mark">Campagnes</p>
          <h2 className="auth-brand__title">
            WhatsApp &amp; SMS
            <span>pour chaque entreprise</span>
          </h2>
          <p className="auth-brand__text">
            Préparez vos audiences, composez vos messages et suivez les envois —
            depuis un espace unique.
          </p>
          <ul className="auth-brand__points">
            <li>Contacts &amp; listes par entreprise</li>
            <li>Templates texte, image et vidéo</li>
            <li>Rapports de réussite et d’échec</li>
          </ul>
        </div>
        <div className="auth-brand__glow" aria-hidden />
      </aside>

      <main className="auth-main">
        <div className="auth-main__card">
          <SignInForm />
        </div>
      </main>
    </div>
  );
}
