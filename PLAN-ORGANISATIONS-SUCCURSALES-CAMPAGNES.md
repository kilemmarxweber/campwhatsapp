# Plan — Organisations, succursales et campagnes multicanales

## Objectif

Faire évoluer l’application pour gérer plusieurs organisations. Chaque organisation possède une ou plusieurs succursales, et chaque succursale gère ses propres contacts dans le contexte de son organisation. Les membres, contacts, médias, modèles et campagnes restent isolés entre organisations; les permissions d’une organisation A ne donnent aucun accès à B. Les contacts d’une succursale ne sont pas mélangés à ceux des autres succursales, même lorsqu’elles appartiennent à la même organisation.

Les campagnes pourront utiliser **WhatsApp** ou **SMS**. WhatsApp conserve son fonctionnement actuel et ses modèles avec média. Le SMS utilise ses propres modèles texte, sans image ni vidéo, avec la possibilité d’inclure des liens.

## État constaté

- `Organization` Better Auth sert actuellement à représenter une succursale; il n’existe pas de parent organisation/succursale.
- Contacts, listes, médias, modèles et campagnes portent un `organizationId` et les lectures/écritures des pages métier sont généralement filtrées par celui-ci.
- Les contacts et listes sont actuellement rattachés à l’organisation Better Auth qui représente la succursale; ce rattachement donne déjà une base d’isolation des contacts par succursale.
- Les invitations et membres utilisent Better Auth. `assertUserCanJoinOrganization` bloque l’ajout d’un utilisateur déjà membre de cette organisation, mais ne constitue pas à lui seul une règle d’isolation entre toutes les organisations.
- La création de succursale est réservée à un administrateur applicatif depuis `/admin/succursales`.
- `/auth/sign-up` crée un compte utilisateur sans rattachement à une organisation; la page d’accueil `/` expose aussi le bouton « Créer un compte ».
- Les modèles actuels distinguent texte/image/vidéo et sont sélectionnés par les campagnes, mais ne portent pas de canal SMS/WhatsApp.
- L’envoi actuel passe par la file de campagne et Klambo/WhatsApp. Aucun fournisseur SMS n’a été identifié dans le code inspecté.
- Des libellés fixes TVS/TVS Motors existent dans les pages publiques, l’en-tête, les métadonnées et des valeurs par défaut de templates/aperçus. Le seed contient aussi des données de démonstration TVS.

## Décisions de conception à appliquer

1. **Séparer l’organisation de la succursale.** Introduire une entité organisation parente et une entité succursale rattachée à celle-ci. Les données métier, notamment les contacts et listes, restent rattachées à une succursale afin que chaque succursale ait ses propres contacts, tout en restant sous l’organisation parente. Les noms visibles du tenant viennent de l’organisation et de la succursale enregistrées, jamais d’une constante `TVSMotors`.
2. **Porter le tenant dans les autorisations.** Toute opération sur une succursale vérifie que l’utilisateur est membre de l’organisation parente et autorisé sur cette succursale. Les identifiants d’organisation/succursale soumis par le client ne sont jamais considérés comme preuve d’accès.
3. **Créer les comptes dans un contexte d’organisation.** Supprimer le CTA d’inscription de `/`, et remplacer l’inscription ouverte par un parcours d’invitation ou de création d’organisation explicitement autorisé. L’inscription seule ne doit pas laisser un utilisateur sans tenant ni lui permettre de se rattacher à une organisation arbitraire.
4. **Ajouter le canal sans changer le parcours WhatsApp.** Stocker le canal sur la campagne et le modèle; filtrer les modèles par canal. WhatsApp conserve texte/image/vidéo et l’intégration Klambo. SMS n’accepte que le texte et les liens, avec un fournisseur SMS choisi/configuré avant activation de l’envoi.
5. **Conserver les données existantes.** Prévoir une migration de rattachement des organisations Better Auth actuelles comme succursales d’une organisation TVS initiale, plutôt que de recréer les données ou les membres.

## Étapes proposées

### 1. Cartographier et figer les invariants

- Recenser toutes les actions serveur, routes, jobs, webhooks et requêtes Prisma qui touchent aux membres ou aux données par `organizationId`.
- Vérifier le comportement réel de `requireOrgMembership`, des sessions Better Auth, des invitations, de la sélection de succursale et des rôles siège.
- Cartographier tous les textes/valeurs TVS codés en dur et distinguer la marque publique de l’identité tenant configurable. Garder les mentions légales ou la marque produit là où elles sont intentionnelles; remplacer le nom de tenant et les valeurs préremplies par le nom de l’organisation.
- Documenter les volumes et associations existantes utiles au script de migration.

### 2. Définir la hiérarchie et les permissions

- Ajouter le parent organisation et la relation parent-enfants des succursales (ou une structure équivalente sans confondre tenant et site opérationnel).
- Définir les rôles au niveau organisation (gestion globale) et les rôles de succursale (accès métier local), en réutilisant le catalogue de rôles existant lorsque possible.
- Conserver le rattachement des contacts et listes à la succursale: chaque succursale voit et gère ses contacts; les autres succursales ne les voient pas par défaut. Le parent organisation peut éventuellement obtenir une vue consolidée, uniquement pour les membres dotés de la permission prévue à cet effet.
- Ajouter les contrôles d’appartenance parent/enfant dans les fonctions communes d’autorisation et les appliquer aux lectures, mutations, uploads, envois, invitations et accès par slug.
- Empêcher qu’un membre de A lise ou modifie une succursale de B, y compris en falsifiant un `organizationId`, un slug, un ID de campagne ou de média.
- Définir si un utilisateur peut être affecté à plusieurs succursales d’une même organisation. Dans tous les cas, empêcher les appartenances croisées entre organisations sans invitation explicite et autorisation vérifiée.

### 3. Migrer les données actuelles

- Créer une migration Prisma réversible autant que possible, avec une organisation parente initiale et le rattachement des succursales actuelles.
- Conserver les IDs de succursales (organisations Better Auth actuelles), memberships, invitations et toutes les données métier pour éviter de casser les sessions/références.
- Préserver le lien de chaque contact et liste à sa succursale actuelle; ne pas déplacer les contacts vers un carnet partagé entre toutes les succursales.
- Ajouter les contraintes et index nécessaires; vérifier les lignes orphelines et les slugs uniques avant d’appliquer la migration.
- Mettre à jour le seed pour qu’il crée la structure parent + succursale et garde les données de démo séparées de la logique de production.

### 4. Adapter les parcours d’organisation et d’authentification

- Créer l’organisation et sa première succursale dans un flux atomique réservé aux rôles autorisés.
- Ajouter la création/gestion de succursales sous une organisation existante et l’affichage hiérarchique organisation → succursales.
- Supprimer le bouton « Créer un compte » de la page `/`.
- Fermer l’inscription publique autonome; proposer l’acceptation d’invitation et, si retenu, un parcours contrôlé de création d’organisation. Toute création de compte doit aboutir à une organisation autorisée.
- Conserver la connexion et rediriger l’utilisateur vers une organisation/succursale à laquelle il appartient.
- Remplacer les libellés de tenant codés en dur par le nom d’organisation/succursale dans l’interface et les métadonnées pertinentes.

### 5. Ajouter SMS en préservant WhatsApp

- Ajouter un canal explicite `whatsapp`/`sms` au modèle de campagne et au modèle de message, avec une valeur par défaut WhatsApp pour les enregistrements existants.
- Rendre les modèles SMS indépendants des modèles WhatsApp. SMS: corps texte, variables et URL en texte brut; aucune pièce jointe. WhatsApp: garder les modèles et types texte/image/vidéo actuels.
- Adapter les formulaires, listes, aperçus, édition, détail et validation de campagne pour que canal et modèle soient cohérents. Un modèle SMS ne doit jamais recevoir de média; un modèle WhatsApp reste inchangé.
- Garder le pipeline de destinataires, le rendu des variables, la planification, les statuts et la relance autant que possible; router l’envoi selon le canal.
- Choisir le fournisseur SMS, définir configuration/secrets, format téléphone, limites, gestion des erreurs et callbacks avant d’implémenter l’envoi réel. Ne pas simuler un envoi réussi si aucun fournisseur n’est configuré.
- Vérifier la politique de liens SMS (URL texte, longueur/segmentation et éventuel raccourcissement) avant de figer l’UI.

### 6. Vérifier et livrer

- Ajouter des vérifications d’accès pour deux organisations, deux succursales d’une organisation, utilisateurs invités, administrateur siège et IDs forgés.
- Vérifier les migrations sur une copie de données représentative et le scénario de mise à niveau avec les campagnes WhatsApp existantes.
- Vérifier création d’organisation/succursale, invitation, connexion, isolement des données, templates séparés, campagnes WhatsApp existantes et campagnes SMS texte avec liens.
- Vérifier que chaque succursale ne voit que ses contacts et listes, et qu’une vue consolidée éventuelle au niveau organisation respecte une permission dédiée.
- Mettre à jour la documentation, les variables d’environnement et les consignes de déploiement/migration.

## Fichiers et zones déjà repérés

- Schéma et migrations : `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- Auth et isolation : `lib/auth.ts`, `lib/auth/org-membership.ts`, `lib/auth/organization-permission.ts`, `lib/succursales/actions.ts`
- Inscription/navigation : `app/page.tsx`, `app/auth/sign-up/page.tsx`, `app/auth/sign-in/page.tsx`, `app/dashboard/page.tsx`, `app/admin/succursales/page.tsx`
- Campagnes, modèles et envoi : `lib/campaigns/actions.ts`, `lib/campaigns/process.ts`, `lib/klambo/client.ts`, `components/campaign-form.tsx`, `components/templates-client.tsx`
- Identité visuelle : `app/layout.tsx`, `components/app-header.tsx`, `components/message-card-preview.tsx` et autres occurrences trouvées par recherche de `TVS`/`Motors`.

## Points à confirmer pendant l’exploration avant exécution

- Le fournisseur SMS souhaité et ses identifiants/API (aucune intégration SMS n’a été trouvée).
- Les règles de rôle: qui peut créer une organisation, une succursale, inviter au niveau organisation, et affecter un membre à plusieurs succursales.
- Si les données TVS actuelles forment l’organisation initiale, et quel nom/slug doivent être attribués au parent et à chaque succursale.
- Le sens exact de « partout où le nom libellé TVSMotors »: nom de tenant uniquement, ou aussi suppression des mentions de marque TVS dans le produit et les messages modèles par défaut.

## Hors périmètre de ce plan

- Refonte du contenu ou du comportement des campagnes WhatsApp existantes.
- Modification du fournisseur WhatsApp/Klambo ou de ses modèles existants.
- Envoi SMS en production avant choix et configuration du fournisseur.
