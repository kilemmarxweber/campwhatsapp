# TVS — Campagnes WhatsApp

App multi-succursales pour créer et envoyer des campagnes WhatsApp (texte, image, vidéo) avec texte dynamique, via **[KlamboWhatsapp](https://whatsapp.klambocore.com/)**.

## Stack

- Next.js 16.3 + React 19
- Prisma 7.10 + PostgreSQL
- Better Auth (succursales = organizations, rôles siège)
- Klambo API (`POST /v1/send`, `POST /v1/media`, `POST /v1/media/register`, webhooks)

## Médias (option A + register)

```
TVS UPLOAD_DIR (C:/api-uploads/{orgId}/…)
   → aperçu /api/uploads/…
   → POST /v1/media/register (si même UPLOAD_DIR que l’API)
   → sinon POST /v1/media (copie multipart)
   → POST /v1/send { media: { id }, caption }
```

```env
UPLOAD_DIR=C:/api-uploads
#UPLOAD_DIR=/var/www/api-uploads
```

Aligner l’API Klambo :

```env
# apps/api/.env
UPLOAD_DIR=C:/api-uploads
```

## Démarrage

1. Copier `.env.example` → `.env` et renseigner `DATABASE_URL` + `ENCRYPTION_SECRET`
2. Créer la base Postgres + dossier `C:\api-uploads`
3. Installer et migrer :

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed   # optionnel
pnpm dev
```

4. Ouvrir http://localhost:3000 → s'inscrire → **Siège** → succursale
5. **Siège → WhatsApp** : clé Klambo
6. **Médias** : uploader JPEG/PNG/MP4 réels → campagne image/vidéo

## Fonctionnalités

- Succursales isolées (contacts, campagnes, médias)
- Clé WhatsApp / Klambo au siège
- Contacts + import Excel
- Templates texte / image / vidéo
- Campagnes + preview média + relance échecs
- Webhook : `POST /api/webhooks/klambo`

## Excel

Colonnes : `phone` / `telephone` / `tel`, `name` / `nom`, `email` + variables libres.

## Klambo

- Console : https://whatsapp.klambocore.com/
- API : `https://whatsapp-api.klambocore.com` (ou `http://localhost:3005`)
- Journal API : aperçu image/vidéo + erreurs GOWA
