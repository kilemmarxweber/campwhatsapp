# Campagnes WhatsApp et SMS

Application multi-organisations. Chaque organisation possède une ou plusieurs succursales. Contacts, listes, médias, modèles et campagnes sont rattachés à une succursale et restent isolés des autres. WhatsApp passe par **[KlamboWhatsapp](https://whatsapp.klambocore.com/)**. Le canal SMS se prépare dans les modèles et les campagnes ; l’envoi réel reste bloqué tant qu’aucun fournisseur SMS n’est configuré.

## Stack

- Next.js 16.3 + React 19
- Prisma 7.10 + PostgreSQL
- Better Auth (succursale = organization, organisation parente = `tenant_organization`)
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

4. Ouvrir http://localhost:3000 et se connecter. La création de compte public est fermée : un administrateur siège invite, ou le seed crée le compte démo.
5. **Siège → Succursales** : créer une organisation et sa première succursale, ou une succursale sous une organisation existante.
6. **Siège → WhatsApp** : clé Klambo
7. **Médias** : uploader JPEG/PNG/MP4 réels → campagne image/vidéo

La migration `20261007090000_tenant_org_sms_channel` rattache les succursales Better Auth déjà présentes à l’organisation parente `TVS Motors` (`tvs-motors`) et ajoute le canal `whatsapp` par défaut. `20261008061200_organization_tenant_required` rend ce rattachement obligatoire.

Compte seed : `demo@tvsrdcongo.com` / `demo1234` (rôle siège).

## Fonctionnalités

- Organisations parentes et succursales isolées (contacts, listes, campagnes, médias)
- Un utilisateur peut appartenir à plusieurs succursales de la même organisation, pas à deux organisations
- Inscription uniquement sur invitation
- Clé WhatsApp / Klambo au siège
- Contacts + import Excel
- Modèles WhatsApp (texte / image / vidéo) et modèles SMS (texte et liens, sans média)
- Campagnes WhatsApp envoyées via Klambo ; campagnes SMS enregistrées sans envoi tant que le fournisseur n’est pas choisi
- Webhook : `POST /api/webhooks/klambo`

## Excel

Colonnes : `phone` / `telephone` / `tel`, `name` / `nom`, `email` + variables libres.

## Klambo

- Console : https://whatsapp.klambocore.com/
- API : `https://whatsapp-api.klambocore.com` (ou `http://localhost:3005`)
- Journal API : aperçu image/vidéo + erreurs GOWA
