# TVS — Campagnes WhatsApp

App multi-succursales pour créer et envoyer des campagnes WhatsApp (texte, image, vidéo) avec texte dynamique, via **[KlamboWhatsapp](https://whatsapp.klambocore.com/)**.

## Stack

- Next.js 16.3 + React 19
- Prisma 7.10 + PostgreSQL
- Better Auth (succursales = organizations, rôles siège)
- Klambo API (`POST /v1/send`, `POST /v1/media`, webhooks)

## Démarrage

1. Copier `.env.example` → `.env` et renseigner `DATABASE_URL` + `ENCRYPTION_SECRET`
2. Créer la base Postgres
3. Installer et migrer :

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

4. Ouvrir http://localhost:3000 → s'inscrire (compte siège : rôle `admin`) → **Siège** → créer une succursale
5. Configurer la clé Klambo dans **Siège → WhatsApp** (partagée par toutes les succursales)

## Fonctionnalités

- Succursales isolées (contacts, campagnes, médias)
- Clé WhatsApp / Klambo unique au **siège**
- Rôles & permissions définis au **siège**, répercutés partout
- Équipe / invitations par succursale
- Contacts CRUD + listes + import Excel
- Templates `{{name}}`, `{{phone}}`, …
- Campagnes texte / image / vidéo + relance des échecs
- Webhook statut : `POST /api/webhooks/klambo`

## Excel

Colonnes reconnues : `phone` / `telephone` / `tel`, `name` / `nom`, `email`. Toute autre colonne devient une variable de template.

## Klambo

- Console : https://whatsapp.klambocore.com/
- Base URL API : `https://whatsapp-api.klambocore.com`
- Configuration : **Siège → WhatsApp** (clé chiffrée en base)
- Optionnel dans `.env` : `KLAMBO_BASE_URL`, `KLAMBO_DEFAULT_COUNTRY` (préremplissage UI)
- Events webhook : `message.sent`, `message.delivered`, `message.read`, `message.failed`
