# TVS — Campagnes WhatsApp

App multi-organisation pour créer et envoyer des campagnes WhatsApp (texte, image, vidéo) avec texte dynamique, via **KlamboWhatsapp**.

## Stack

- Next.js 16.3 + React 19
- Prisma 7.10 + PostgreSQL
- Better Auth (organizations)
- Klambo API (`POST /v1/send`, `POST /v1/media`)

## Démarrage

1. Copier `.env.example` → `.env` et renseigner `DATABASE_URL`
2. Créer la base Postgres `tvs`
3. Installer et migrer :

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm dev
```

4. Ouvrir http://localhost:3000 → s'inscrire → créer une organisation
5. Paramètres → coller la clé Klambo (`sk_test_…` / `sk_live_…`)

## Fonctionnalités

- Organisations + membres (Better Auth)
- Contacts CRUD + import Excel (`phone`, `name`, variables libres)
- Templates de messages `{{prenom}}`, `{{name}}`, …
- Campagnes texte / image / vidéo avec file d'envoi
- Upload médias (limites Klambo : image 5 Mo, vidéo 16 Mo)
- Webhook statut : `POST /api/webhooks/klambo`
- Relance des destinataires en échec

## Excel

Colonnes reconnues : `phone` / `telephone` / `tel`, `name` / `nom`, `email`. Toute autre colonne devient une variable de template.

## Klambo

Base URL par défaut : `https://whatsapp-api.klambocore.com`

Webhook events attendus : `message.sent`, `message.delivered`, `message.read`, `message.failed` (header `X-Signature` HMAC).
