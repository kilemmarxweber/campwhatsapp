"use client";

import { useEffect, useState } from "react";

export type LandingOrgShowcase = {
  id: string;
  name: string;
  contacts: number;
  campaigns: number;
  messagesOk: number;
  messagesFailed: number;
};

export type LandingPromoPreview = {
  title: string;
  imageUrl: string;
  imageAlt: string;
};

function formatCount(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function LandingHeroVisual({
  organizations,
  promoPreview = null,
  onEruptingChange,
}: {
  organizations: LandingOrgShowcase[];
  promoPreview?: LandingPromoPreview | null;
  onEruptingChange?: (erupting: boolean) => void;
}) {
  const items =
    organizations.length > 0
      ? organizations
      : [
          {
            id: "fallback",
            name: "Votre entreprise",
            contacts: 0,
            campaigns: 0,
            messagesOk: 0,
            messagesFailed: 0,
          },
        ];

  const [index, setIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [commsActive, setCommsActive] = useState(false);
  const [commsToken, setCommsToken] = useState(0);

  useEffect(() => {
    onEruptingChange?.(commsActive);
  }, [commsActive, onEruptingChange]);

  useEffect(() => {
    if (!commsActive) return;
    const timer = window.setTimeout(() => setCommsActive(false), 25_000);
    return () => window.clearTimeout(timer);
  }, [commsActive, commsToken]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        // Fin de boucle → flip + effets communication (~25s)
        if (next === 0) {
          setFlipping(true);
          setCommsActive(true);
          setCommsToken((token) => token + 1);
        }
        return next;
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [items.length]);

  const org = items[index] ?? items[0]!;
  const totalMessages = org.messagesOk + org.messagesFailed;

  return (
    <div
      className={`landing-visual${commsActive ? " is-erupting" : ""}`}
      aria-hidden
    >
      <div className="landing-visual__glow" />
      <div className="landing-visual__comms">
        <span className="landing-visual__wave landing-visual__wave--1" />
        <span className="landing-visual__wave landing-visual__wave--2" />
        <span className="landing-visual__wave landing-visual__wave--3" />
        <span className="landing-visual__ping landing-visual__ping--1" />
        <span className="landing-visual__ping landing-visual__ping--2" />
        <span className="landing-visual__chip landing-visual__chip--wa">WA</span>
        <span className="landing-visual__chip landing-visual__chip--sms">SMS</span>
        <span className="landing-visual__mini-bubble landing-visual__mini-bubble--1" />
        <span className="landing-visual__mini-bubble landing-visual__mini-bubble--2" />
        <span className="landing-visual__packet landing-visual__packet--1" />
        <span className="landing-visual__packet landing-visual__packet--2" />
        <span className="landing-visual__packet landing-visual__packet--3" />
        <span className="landing-visual__packet landing-visual__packet--4" />
      </div>
      <div className="landing-visual__stage">
        <div
          className={`landing-visual__device${flipping ? " is-flipping" : ""}`}
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.animationName === "landing-card-flip"
            ) {
              setFlipping(false);
            }
          }}
        >
          <div className="landing-visual__face landing-visual__face--front">
            <div className="landing-visual__notch" />
            <div className="landing-visual__screen">
              <div key={org.id} className="landing-visual__cycle">
                <p className="landing-visual__channel">WhatsApp · Entreprise</p>
                <p className="landing-visual__org">{org.name}</p>

                <div className="landing-visual__bubble landing-visual__bubble--in">
                  Bonjour {"{{name}}"}, votre HLX 150 est prêt en concession.
                </div>
                <div className="landing-visual__bubble landing-visual__bubble--media">
                  {promoPreview?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="landing-visual__media-img"
                      src={promoPreview.imageUrl}
                      alt={promoPreview.imageAlt}
                      loading="lazy"
                    />
                  ) : (
                    <span className="landing-visual__media-bar" />
                  )}
                  <span>
                    {promoPreview?.title
                      ? `${promoPreview.title} · image + 2 liens`
                      : "Promo week-end · image + 2 liens"}
                  </span>
                </div>
                <div className="landing-visual__bubble landing-visual__bubble--sms">
                  SMS · Rappels &amp; confirmations
                </div>

                <div className="landing-visual__consumption">
                  <div>
                    <span className="landing-visual__metric-label">Contacts</span>
                    <strong>{formatCount(org.contacts)}</strong>
                  </div>
                  <div>
                    <span className="landing-visual__metric-label">Campagnes</span>
                    <strong>{formatCount(org.campaigns)}</strong>
                  </div>
                  <div>
                    <span className="landing-visual__metric-label">Messages OK</span>
                    <strong>{formatCount(org.messagesOk)}</strong>
                  </div>
                  <div>
                    <span className="landing-visual__metric-label">Échoués</span>
                    <strong>{formatCount(org.messagesFailed)}</strong>
                  </div>
                </div>

                <div className="landing-visual__status">
                  <span>{formatCount(totalMessages)} messages</span>
                  <span className="landing-visual__dot" />
                  <span>
                    {index + 1}/{items.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-visual__face landing-visual__face--back">
            <p className="landing-visual__back-klambo">Klambocore</p>
            <p className="landing-visual__back-brand">Campagnes</p>
            <p className="landing-visual__back-text">WhatsApp &amp; SMS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
