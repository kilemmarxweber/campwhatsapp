import Link from "next/link";
import {
  LandingHeroVisual,
  type LandingOrgShowcase,
} from "@/components/landing-hero-visual";

export function LandingPage({
  organizations,
  promoPreview = null,
}: {
  organizations: LandingOrgShowcase[];
  promoPreview?: {
    title: string;
    imageUrl: string;
    imageAlt: string;
  } | null;
}) {
  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-top__brand-stack">
          <p className="landing-top__brand">Campagnes</p>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-hero__brand">Campagnes</p>
          <h1 className="landing-hero__title">
            Klambocore Campagnes
            <span className="landing-hero__title-line">
              WhatsApp &amp; SMS pour chaque entreprise
            </span>
          </h1>
          <p className="landing-hero__lead">
            Préparez, ciblez et envoyez vos messages clients — texte, image ou
            vidéo — via WhatsApp et SMS, du siège jusqu’au terrain.
          </p>
          <div className="landing-hero__cta">
            <Link
              href="/auth/sign-in"
              className="btn btn-primary landing-hero__btn landing-hero__btn--electric"
            >
              <span className="landing-hero__btn-spark" aria-hidden />
              <span className="landing-hero__btn-label">Se connecter</span>
            </Link>
          </div>
        </div>
        <LandingHeroVisual
          organizations={organizations}
          promoPreview={promoPreview}
        />
        <a
          href="#landing-suite"
          className="landing-scroll"
          aria-label="Lire plus"
        >
          <span className="landing-scroll__label">Lire plus</span>
          <span className="landing-scroll__arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 5v14M5 12l7 7 7-7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
      </section>

      <section id="landing-suite" className="landing-solution">
        <div className="landing-solution__intro">
          <h2>L’idée de la solution</h2>
          <p>
            Centralisez l’audience, les templates et les envois multicanaux.
            Chaque entreprise pilote ses campagnes sans perdre la cohérence
            de marque.
          </p>
        </div>
        <ol className="landing-solution__steps">
          <li>
            <span className="landing-solution__num">01</span>
            <div>
              <h3>Contacts &amp; listes</h3>
              <p>Importez, segmentez et réutilisez vos destinataires par site.</p>
            </div>
          </li>
          <li>
            <span className="landing-solution__num">02</span>
            <div>
              <h3>Templates &amp; médias</h3>
              <p>Composez une fois : texte, image, vidéo et liens prêts à diffuser.</p>
            </div>
          </li>
          <li>
            <span className="landing-solution__num">03</span>
            <div>
              <h3>Envoi &amp; suivi</h3>
              <p>WhatsApp ou SMS, avec rapports de réussite et d’échec par période.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="landing-channels">
        <div className="landing-channels__panel landing-channels__panel--wa">
          <p className="landing-channels__label">Canal WhatsApp</p>
          <p className="landing-channels__text">
            Messages riches pour l’engagement — promotions, suivis et contenus
            visuels.
          </p>
        </div>
        <div className="landing-channels__panel landing-channels__panel--sms">
          <p className="landing-channels__label">Canal SMS</p>
          <p className="landing-channels__text">
            Messages courts et fiables pour les rappels et confirmations
            essentielles.
          </p>
        </div>
      </section>

      <footer className="landing-foot">
        <p>
          <strong>Klambocore Campagnes</strong> — plateforme d’envoi WhatsApp
          &amp; SMS pour entreprises
        </p>
        <Link href="/auth/sign-in" className="btn btn-brand">
          Accéder à l’espace
        </Link>
      </footer>
    </div>
  );
}
