import Link from "next/link";

function HeroVisual() {
  return (
    <div className="landing-visual" aria-hidden>
      <div className="landing-visual__glow" />
      <div className="landing-visual__device">
        <div className="landing-visual__notch" />
        <div className="landing-visual__screen">
          <p className="landing-visual__channel">WhatsApp · Succursale Kinshasa</p>
          <div className="landing-visual__bubble landing-visual__bubble--in">
            Bonjour {"{{name}}"}, votre HLX 150 est prêt en concession.
          </div>
          <div className="landing-visual__bubble landing-visual__bubble--media">
            <span className="landing-visual__media-bar" />
            <span>Promo week-end · image + 2 liens</span>
          </div>
          <div className="landing-visual__bubble landing-visual__bubble--sms">
            SMS · Rappels &amp; confirmations
          </div>
          <div className="landing-visual__status">
            <span>1 248 destinataires</span>
            <span className="landing-visual__dot" />
            <span>En cours</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-top">
        <p className="landing-top__brand">Campagnes</p>
        <Link href="/auth/sign-in" className="landing-top__link">
          Connexion
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-hero__brand">Campagnes</p>
          <h1 className="landing-hero__title">
            WhatsApp &amp; SMS
            <span className="landing-hero__title-line">pour chaque succursale</span>
          </h1>
          <p className="landing-hero__lead">
            Une plateforme pour préparer, cibler et envoyer vos messages clients —
            texte, image ou vidéo — depuis le siège jusqu’au terrain.
          </p>
          <div className="landing-hero__cta">
            <Link href="/auth/sign-in" className="btn btn-primary landing-hero__btn">
              Se connecter
            </Link>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section className="landing-solution">
        <div className="landing-solution__intro">
          <h2>L’idée de la solution</h2>
          <p>
            Centralisez l’audience, les templates et les envois multicanaux.
            Chaque succursale pilote ses campagnes sans perdre la cohérence
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
        <p>Campagnes — plateforme d’envoi WhatsApp &amp; SMS</p>
        <Link href="/auth/sign-in" className="btn btn-brand">
          Accéder à l’espace
        </Link>
      </footer>
    </div>
  );
}
