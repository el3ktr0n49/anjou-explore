# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anjou Explore** - Site web pour une association proposant des escapades nature, patrimoine et gastronomie dans la région de l'Anjou (France).

Ce projet est une migration d'un site Wix vers une stack moderne basée sur Astro et Bun.

### Stack Technique
- **Framework**: Astro 5.x (Mode hybride : SSG + Server mode pour API routes)
- **Runtime**: Bun (au lieu de Node.js)
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 7.x avec adapter PostgreSQL
- **Styling**: TailwindCSS v4
- **Language**: TypeScript
- **Auth**: JWT + Google Authenticator (TOTP)
- **Déploiement futur**: Docker/Kubernetes

### Pourquoi Astro ?
- Site principalement statique avec quelques éléments interactifs (formulaires)
- Performance optimale pour le SEO
- HTML généré par défaut, JavaScript uniquement où nécessaire
- Architecture "Islands" pour les composants interactifs
- **Mode hybride** : Pages statiques + API routes serveur (SSG + SSR)
- Support natif des API endpoints pour backend (REST API)
- Facilité d'évolution vers une architecture avec API/BDD (✅ fait)

## Commands

### Development
```bash
bun.exe run dev          # Start dev server on http://localhost:4321
bun.exe run build        # Build for production
bun.exe run preview      # Preview production build
```

### Package Management
```bash
bun.exe install          # Install dependencies
bun.exe add <package>    # Add a dependency
```

### Astro-specific
```bash
bun.exe astro add <integration>  # Add Astro integrations (react, vue, etc.)
bun.exe astro telemetry disable  # Disable telemetry
```

### Image Optimization
```bash
bun.exe run optimize-images       # Compresse et convertit toutes les images en WebP
bun.exe run update-image-paths    # Met à jour les chemins d'images dans les fichiers .astro
```

### Database & Backend
```bash
# Docker
docker-compose up -d              # Démarrer PostgreSQL + pgAdmin
docker-compose down               # Arrêter les containers
docker-compose logs postgres      # Voir les logs

# Prisma
bun run db:generate               # Générer le client Prisma
bun run db:push                   # Pousser le schéma vers DB (dev)
bun run db:migrate                # Créer/appliquer migrations (prod)
bun run db:studio                 # Ouvrir Prisma Studio (http://localhost:5555)
bun run db:seed                   # Initialiser la DB avec données de test
bun run db:reset                  # ⚠️ Réinitialiser la DB (supprime tout)
```

## Backend Architecture

### Stack Backend
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 7.x (TypeScript-first)
- **API Routes**: Astro API endpoints (`src/pages/api/`)
- **Auth**: JWT + Google Authenticator (2FA)
- **Email**: Resend.com (3000 emails/mois gratuits)
- **Payments**: SumUp API (à configurer)

### Authentication

**Système d'authentification en 3 couches :**
1. **URL secrète** : `/admin-<code-secret>` (non indexable, défini dans ADMIN_URL_SECRET)
2. **Mot de passe partagé** : Un seul mot de passe pour les 4 admins (ADMIN_SHARED_PASSWORD)
3. **2FA individuel** : Chaque admin a son Google Authenticator unique

**Workflow de connexion :**
```typescript
1. Accéder à l'URL secrète (ex: /admin/login)
2. Entrer identifiant (input texte pour sécurité, pas dropdown)
3. Entrer le mot de passe
4. Entrer le code 2FA à 6 chiffres
5. → Session JWT valide 24h (cookie httpOnly + SameSite=Strict)
```

**Admins configurés (via seed.ts)** :
- José (secret 2FA unique)
- Fabien (secret 2FA unique)
- Benoît (secret 2FA unique)
- Adrien (secret 2FA unique)

**Mode développement vs Production** :
- **2FA en développement** : Peut être désactivé via `ENABLE_2FA="false"` dans .env
- **2FA en production** : TOUJOURS activé (override de ENABLE_2FA si NODE_ENV=production)
- **Mot de passe** : Hash bcrypt en production, plain text comparaison en dev

**Implémentation** :
```typescript
// src/pages/api/auth/login.ts
const is2FAEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_2FA === 'true';
```

### Base de Données

**Modèles Prisma :**

```typescript
// Administrateurs
model Admin {
  id: string
  name: string           // "José", "Fabien", "Benoît", "Adrien"
  secret2FA: string      // Secret Google Authenticator
  isActive: boolean
}

// Événements (AE6, AE7, etc.)
model Event {
  id: string
  name: string           // "Anjou Explore #7"
  slug: string           // "ae7"
  date: DateTime
  status: EventStatus    // DRAFT | OPEN | CLOSED | ARCHIVED
  paymentEnabled: boolean
  formulas: Formula[]
  reservations: Reservation[]
}

// Formules/tarifs par événement
model Formula {
  id: string
  eventId: string
  activityName: string   // "rando papilles", "le défi"
  priceType: string      // "adulte", "enfant"
  label: string          // "Adulte (+16 ans)"
  price: Decimal
}

// Réservations
model Reservation {
  id: string
  eventId: string
  nom, prenom, email, telephone: string
  activityName: string
  participants: Json     // { "adulte": 2, "enfant": 1 }
  amount: Decimal
  paymentStatus: PaymentStatus  // PENDING | PAID | FAILED | REFUNDED
  sumupCheckoutId: string?
  sumupTransactionId: string?
}

// Demandes de contact
model ContactRequest {
  id: string
  nom, email, telephone, message: string
  isBooking: boolean     // true si demande réservation aventure
  bookingData: Json?     // { participants, durée, formule }
  status: ContactStatus  // NEW | PROCESSED | ARCHIVED
  processedBy: string?   // Nom de l'admin
}
```

**Relations :**
- Event (1) → (N) Formula
- Event (1) → (N) Reservation

### API Routes

**Structure des endpoints :**

```
src/pages/api/
├── auth/
│   ├── login.ts           POST   # Login avec mot de passe + 2FA
│   ├── logout.ts          POST   # Déconnexion
│   └── verify.ts          GET    # Vérifier session JWT
├── admin/
│   ├── contacts.ts        GET    # Liste demandes contact
│   ├── reservations.ts    GET    # Liste réservations
│   ├── events/
│   │   ├── index.ts       GET    # Liste événements
│   │   ├── [id].ts        GET/PUT/DELETE
│   │   └── [id]/stats.ts  GET    # Stats par événement
│   └── formulas/
│       └── [eventId].ts   GET/POST/PUT/DELETE
├── public/
│   ├── contact.ts         POST   # Formulaire de contact
│   ├── events/
│   │   └── [slug].ts      GET    # Détails événement public
│   └── reservations/
│       ├── create.ts      POST   # Créer réservation
│       └── status.ts      GET    # Statut réservation
└── webhooks/
    └── sumup.ts           POST   # Callback SumUp
```

### Workflow Paiement SumUp

```typescript
// 1. Utilisateur remplit formulaire réservation
POST /api/public/reservations/create
→ Crée Reservation avec status PENDING
→ Retourne { reservationId }

// 2. Initialisation paiement SumUp
POST /api/public/payments/checkout
Body: { reservationId }
→ Backend appelle SumUp API
→ Retourne { checkoutUrl }

// 3. Redirection vers SumUp
window.location.href = checkoutUrl

// 4. Callback webhook SumUp
POST /api/webhooks/sumup
→ Vérifie signature
→ Met à jour Reservation.paymentStatus = PAID
→ Envoie email confirmation via Resend

// 5. Retour utilisateur
GET /payment/success?reservationId=xxx
→ Affiche confirmation
```

### Email avec Resend

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'anjouexplore@gmail.com',
  to: reservation.email,
  subject: 'Confirmation de réservation - Anjou Explore',
  html: `<h1>Merci ${reservation.prenom} !</h1>...`
});
```

### Sécurité

**Variables d'environnement (.env) :**
- `DATABASE_URL` : Connexion PostgreSQL
- `ADMIN_SHARED_PASSWORD` : Mot de passe partagé (bcrypt en prod, plain text en dev)
- `JWT_SECRET` : Secret pour signer les JWT (min 32 caractères)
- `JWT_EXPIRATION_HOURS` : Durée validité session (défaut : 24)
- `ADMIN_URL_SECRET` : URL secrète admin
- `ENABLE_2FA` : Active/désactive 2FA en dev (`"false"` en dev, override en prod)
- `RESEND_API_KEY` : Clé API Resend
- `EMAIL_FROM` : Email expéditeur
- `SUMUP_API_KEY` : Clé API SumUp (à configurer)
- `APP_URL` : URL base application
- `NODE_ENV` : `"development"` ou `"production"`
- `CORS_ORIGINS` : Origins autorisés (séparés par virgules)
- `COOKIE_SECURE` : `"true"` en production avec HTTPS

**Bonnes pratiques :**
- Mots de passe hashés avec bcrypt (prod uniquement)
- JWT avec expiration configurable (défaut 24h)
- Cookies httpOnly + SameSite=Strict + Secure (prod)
- 2FA TOUJOURS actif en production (sécurité maximale)
- Validation des inputs avec Zod (à implémenter Phase C)
- Rate limiting sur endpoints publics (à implémenter)
- CORS configuré strictement
- Sessions trackées en base de données pour audit

## Project Structure

```
anjouexplore/
├── src/
│   ├── assets/
│   │   └── images/         # Images optimisées (WebP) - importées dans les fichiers .astro
│   │       ├── homepage/
│   │       ├── equipe/
│   │       ├── catalogue/
│   │       ├── suggestions/
│   │       ├── galerie/
│   │       ├── evenements/
│   │       │   └── ae6/
│   │       ├── formulaire/
│   │       └── reglement/
│   ├── pages/              # File-based routing
│   │   ├── api/            # ⭐ Backend API Routes (REST endpoints)
│   │   │   ├── auth/       # Login, logout, verify
│   │   │   ├── admin/      # Endpoints protégés (JWT requis)
│   │   │   ├── public/     # Endpoints publics
│   │   │   └── webhooks/   # Callbacks externes (SumUp)
│   │   ├── index.astro              # Homepage (/)
│   │   ├── equipe.astro             # (/equipe)
│   │   ├── notre-catalogue.astro    # (/notre-catalogue)
│   │   ├── nos-suggestions.astro    # (/nos-suggestions)
│   │   ├── galerie-photos.astro     # (/galerie-photos)
│   │   ├── formulaire-groupe.astro  # (/formulaire-groupe)
│   │   ├── témoignages.astro        # (/témoignages) - À faire
│   │   └── evenements/
│   │       └── ae6/
│   │           ├── index.astro      # (/evenements/ae6)
│   │           └── reglement.astro  # (/evenements/ae6/reglement)
│   ├── lib/                # ⭐ Backend logic
│   │   ├── auth/           # JWT, 2FA, middleware
│   │   ├── db/             # Prisma client singleton
│   │   ├── email/          # Templates email Resend
│   │   ├── services/       # Business logic (reservations, events)
│   │   └── utils/          # Helpers, validation (Zod)
│   ├── layouts/
│   │   └── Layout.astro    # Main layout (header, footer, navigation)
│   ├── components/         # Reusable components
│   │   └── OptimizedImage.astro  # Wrapper du composant Image d'Astro
│   ├── scripts/            # Scripts TypeScript pour client-side
│   │   ├── galerie-photos.ts      # Lightbox gallery
│   │   └── formulaire-groupe.ts   # Dynamic form logic
│   └── styles/
│       └── global.css      # TailwindCSS import
├── prisma/                 # ⭐ Database schema & migrations
│   ├── schema.prisma       # Modèles de données
│   ├── seed.ts             # Script d'initialisation
│   ├── migrations/         # Historique des migrations
│   └── README.md           # Documentation DB
├── public/                 # Assets statiques non traités (favicon, robots.txt, etc.)
├── scripts/                # Scripts d'optimisation
│   ├── optimize-images.ts  # Conversion JPG/PNG → WebP
│   └── update-image-paths.ts  # (legacy) Mise à jour chemins
├── screenshots/            # Wix site screenshots for migration reference
├── docker-compose.yml      # ⭐ PostgreSQL + pgAdmin
├── .env                    # ⭐ Variables d'environnement (NON commité)
├── .env.example            # ⭐ Template des variables
└── astro.config.mjs        # Astro configuration
```

## Architecture & Patterns

### Routing
Astro utilise le **file-based routing**. Chaque fichier `.astro` dans `src/pages/` devient automatiquement une route.

### Layout System
- Le layout principal (`src/layouts/Layout.astro`) contient :
  - Header avec navigation (responsive avec menu mobile)
  - Footer avec informations de contact
  - Import des styles globaux (TailwindCSS)
  - Structure HTML de base

### Components
- Les pages utilisent le composant `<Layout>` pour une structure cohérente
- Props importantes : `title` (requis) et `description` (optionnel)

### Styling
- **TailwindCSS v4** avec la nouvelle syntaxe `@import "tailwindcss"`
- Classes utility-first directement dans les templates
- Palette de couleurs principale : vert (green-600, green-700) pour représenter la nature

### Images
- **Localisation** : `src/assets/images/` (optimisation maximale par Astro)
- **Format** : Toutes les images sont en **WebP** (optimisées automatiquement)
- **Taille** : 16 MB au total (réduit de 65% depuis les originaux)
- **Usage** : Imports TypeScript + composant `<Image>` d'Astro
- **Outil** : Sharp pour la compression et conversion
- **Nommage** : Utiliser des noms descriptifs en kebab-case (ex: `canoe.webp`, `hero-background.webp`)
- **Voir** : [GUIDE-IMAGES.md](GUIDE-IMAGES.md) pour les détails complets

**Exemple d'utilisation** :
```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/images/homepage/canoe.webp';
---

<Image src={heroImage} alt="Description" loading="lazy" />
```

## Migration Status

### ✅ Complété (25 janvier 2026)

#### Infrastructure
- ✅ Initialisation du projet avec Astro + Bun + TailwindCSS v4
- ✅ Copie de toutes les images depuis Wix (19 fichiers, 44MB)
- ✅ **Optimisation des images** :
  - Conversion automatique en WebP (script `optimize-images.ts`)
  - Réduction de 65% : 45 MB → 16 MB
  - Mise à jour automatique des chemins dans les fichiers .astro
  - Composant `<OptimizedImage>` créé
  - Guide complet : [GUIDE-IMAGES.md](GUIDE-IMAGES.md)

#### Layout & Navigation
- ✅ Layout complet (`src/layouts/Layout.astro`) :
  - Header avec logo Anjou Explore
  - Navigation desktop avec sous-menus hover :
    - Notre Catalogue > Nos Suggestions
    - Evènements > Anjou Explore #6
  - Bouton Contact doré + téléphone + icônes sociales
  - Footer beige avec infos de contact
  - Menu mobile responsive
- ✅ Palette de couleurs Wix :
  - Or : #c4a571
  - Olive : #6b7456
  - Marron : #4a3b2f
  - Beige : #f5f1e8

#### Pages Migrées
- ✅ **Page d'accueil** (`index.astro`) :
  - Hero avec effet parallaxe (background-attachment: fixed)
  - Logo + bandeau transparent au-dessus du titre
  - Section "Qui sommes-nous ?" avec rectangle blanc sur fond doré
  - Images canoë + groupe Loire
  - Section Nos Partenaires (3 logos avec liens cliquables)
- ✅ **Page L'Équipe** (`equipe.astro`) :
  - Présentation de José, Fabien et Benoît avec photos
  - Cartes élégantes avec hover effects
- ✅ **Page Notre Catalogue** (`notre-catalogue.astro`) :
  - 4 formules : All Inclusive, Adventure, Adventure +, Race
  - Layout alternant image/texte avec CTA
- ✅ **Page Nos Suggestions** (`nos-suggestions.astro`) :
  - Hero avec parallaxe
  - Sections : Châteaux, Caves, Restaurants, Musées, Activités insolites
- ✅ **Page Formulaire Groupe** (`formulaire-groupe.astro`) :
  - Formulaire dynamique avec toggle checkbox
  - Champs conditionnels pour réservations
  - Script externe : `src/scripts/formulaire-groupe.ts`
- ✅ **Page Galerie Photos** (`galerie-photos.astro`) :
  - Grille responsive (1/2/3 colonnes)
  - Lightbox avec navigation (prev/next, clavier)
  - Effets hover élégants
  - Script externe : `src/scripts/galerie-photos.ts`
- ✅ **Page Evènement AE6** (`evenements/ae6/index.astro`) :
  - Structure extensible pour futurs évènements
  - Badge "Évènement terminé"
  - Logo partenaire (Domaine de Nerleux)
  - Programme détaillé avec sections colorées
  - Flyer avec effet poster
  - Bouton réservation désactivé
  - Lien vers règlement
- ✅ **Page Règlement** (`evenements/ae6/reglement.astro`) :
  - Règlement complet du Défi Anjou Explore
  - Sections structurées et colorées
  - Hero avec parallaxe
  - Lien retour vers évènement

### ✅ Backend Complet (26 janvier 2026)

#### Phase A : Infrastructure Backend (✅ Complété)
- ✅ Docker Compose (PostgreSQL 16 + pgAdmin)
- ✅ Schéma Prisma complet (6 modèles : Admin, Event, Formula, Reservation, ContactRequest, Session)
- ✅ Variables d'environnement (.env + .env.example)
- ✅ Scripts de seed avec données de test (4 admins avec 2FA)
- ✅ Documentation backend complète
- ✅ Configuration Prisma avec PrismaPg adapter
- ✅ Support Bun avec dotenv pour variables d'environnement

#### Phase B : Authentification Admin (✅ Complété)
- ✅ **Backend Authentication Layer** :
  - ✅ `src/lib/db/client.ts` : Prisma client singleton avec adapter PostgreSQL
  - ✅ `src/lib/auth/jwt.ts` : Génération/validation JWT + gestion cookies httpOnly
  - ✅ `src/lib/auth/2fa.ts` : Validation TOTP Google Authenticator (otplib)
  - ✅ `src/lib/auth/middleware.ts` : Middleware auth pour routes protégées
- ✅ **API Routes** :
  - ✅ `POST /api/auth/login` : Login 3 couches (password + adminName + 2FA)
  - ✅ `POST /api/auth/logout` : Destroy session + cookie
  - ✅ `GET /api/auth/verify` : Vérification session JWT
- ✅ **Admin Pages** :
  - ✅ `src/pages/admin/login.astro` : Login avec design élégant (gradients, animations)
    - Input texte pour identifiant (sécurité vs dropdown)
    - Labels génériques ("Mot de passe", "Code de vérification")
    - Intégré au Layout principal (header + footer)
  - ✅ `src/pages/admin/dashboard.astro` : Dashboard avec stats cards et bouton déconnexion
- ✅ **Session Management** :
  - JWT valide 24h avec cookies httpOnly + SameSite=Strict
  - Tracking sessions en base de données
  - bcrypt pour hash password en production
- ✅ **Development Tools** :
  - ✅ `.vscode/launch.json` : Configuration debug Bun avec VSCode
  - ✅ `.vscode/DEBUG.md` : Guide complet debugging (breakpoints, attach, etc.)
  - ✅ Variable `ENABLE_2FA` pour bypass 2FA en dev (toujours actif en prod)

**Notes importantes Phase B** :
- Mode serveur Astro (`output: 'server'`) requis pour API routes
- `import 'dotenv/config'` nécessaire dans client.ts pour charger .env
- otplib nouveau API : `verify()` retourne objet avec `.valid`
- Validation 2FA en JavaScript (pas HTML pattern) pour UX optimale
- Design cohérent avec thème site (or/olive/marron)

#### Phase C : Gestion des Contacts (✅ Complété - 27 janvier 2026)

**Implémentation complète de la gestion des demandes de contact et réservations**

**API Endpoints créés** :
- ✅ `GET /api/admin/contacts` : Liste toutes les demandes avec filtres
  - Query params : `?status=NEW|PROCESSED|ARCHIVED`, `?isBooking=true|false`
  - Response : `{ contacts: ContactRequest[], total: number }`
  - Validation Zod des paramètres
  - Authentification requise via `requireAuth()` middleware
- ✅ `PUT /api/admin/contacts/[id]` : Mettre à jour statut d'une demande
  - Body : `{ status: string, processedBy?: string }`
  - Validation Zod du body
- ✅ `DELETE /api/admin/contacts/[id]` : Archiver définitivement une demande

**Page Admin créée** :
- ✅ `src/pages/admin/contacts.astro` : Interface complète de gestion
  - **Tableau** : Date | Nom | Email | Téléphone | Type | Statut | Actions
  - **Filtres** : Statut (NEW/PROCESSED/ARCHIVED), Type (Contact/Réservation)
  - **Actions** : Bouton "👁️ Voir", "✓ Traiter", "📦 Archiver"
  - **Système de lignes extensibles** : Clic sur 👁️ affiche le message complet dans une ligne dépliante
    - Message complet avec formatage (white-space: pre-wrap)
    - Données de réservation (bookingData) affichées en grid si `isBooking=true`
    - Animation slideDown élégante
    - Fermeture automatique de la ligne précédente
  - **Badges visuels** : Différenciation claire entre contacts et réservations
  - **Design** : Cohérent avec thème Anjou Explore (or/olive/marron)

**Fichiers créés** :
- `src/pages/api/admin/contacts.ts` - Endpoint GET avec filtres
- `src/pages/api/admin/contacts/[id].ts` - Endpoints PUT et DELETE
- `src/pages/admin/contacts.astro` - Interface admin
- `src/scripts/admin/contacts.ts` - Logique client-side (TypeScript)
- `src/styles/admin/contacts.css` - Styles spécifiques
- `src/styles/admin/modal.css` - Styles réutilisables (non utilisé finalement, système de lignes préféré)
- `scripts/seed-contacts.ts` - Script de génération de données de test

**Script de seed** :
- Commande : `bun run db:seed:contacts`
- Génère 8 demandes de test (4 contacts simples + 4 réservations)
- Données réalistes avec différents statuts (NEW, PROCESSED, ARCHIVED)
- Support des bookingData pour tester l'affichage des réservations

**Choix techniques importants** :
- **Pas de modal** : Système de lignes extensibles plus simple et plus UX-friendly
- **credentials: 'include'** : Nécessaire dans les fetch pour envoyer les cookies de session
- **Zod validation** : `url.searchParams.get() || undefined` pour gérer les paramètres optionnels
- **escapeHtml()** : Protection XSS sur tous les contenus utilisateur
- **event.stopPropagation()** : Sur les liens email/tel et boutons d'action

**Notes de débogage** :
- Erreur 401 initiale résolue en ajoutant `credentials: 'include'` aux requêtes fetch
- Modal initialement prévue, remplacée par système de lignes sur demande utilisateur
- TypeScript exports requis pour imports Astro (`export function` au lieu de `window.x = function`)

**Dernier commit** : `ec606d1` - feat(admin): ajoute gestion complète des demandes de contact

#### Phase C : Dashboard Fonctionnel - Suite (✅ Complété - 28 janvier 2026)

**Système complet de gestion des réservations avec archivage et transactions SumUp**

**Nouveau Modèle de Données** :
- ✅ **Table `PaymentTransaction`** : Historique complet des tentatives de paiement SumUp
  - Relation 1:N avec `Reservation` (plusieurs tentatives possibles)
  - Statuts : INITIATED, PENDING, COMPLETED, FAILED, EXPIRED, CANCELLED
  - Conserve checkoutId, transactionId, sumupResponse (JSON), checkoutUrl
  - Permet de tracer toutes les tentatives, même échouées
- ✅ **Archivage logique** : Champs `archived`, `archivedAt`, `archivedBy` sur `Reservation`
  - Soft delete pour conserver l'historique
  - Possibilité de restaurer une réservation archivée
  - Suppression définitive réservée en dernier recours

**API Endpoints créés** :

1. **Statistiques Globales** :
   - ✅ `GET /api/admin/stats` : Stats dashboard en temps réel
     - Response : `{ contactsNew: number, reservationsTotal: number, revenuePending: Decimal, revenuePaid: Decimal }`
     - Requêtes parallélisées avec `Promise.all()` pour performances optimales

2. **Gestion Réservations** :
   - ✅ `GET /api/admin/reservations` : Liste réservations avec filtres multiples
     - Query params : `?eventId=...`, `?paymentStatus=...`, `?archived=true|false`
     - Filtre archived par défaut à `false` (affiche uniquement les actives)
     - Inclut relations : Event (name, slug, date) + PaymentTransaction[]
     - Response : `{ reservations: Reservation[], total: number, totalAmount: Decimal }`
   - ✅ `PUT /api/admin/reservations/[id]` : Mettre à jour statut paiement
     - Body : `{ paymentStatus: string, sumupTransactionId?: string, notes?: string }`
     - **Protection intelligente** : Vérifie s'il y a des transactions SumUp actives
     - Interdit le passage à PAID manuel si transaction INITIATED ou PENDING existe
     - Autorise uniquement pour paiements sur place (espèces, chèque)
   - ✅ `PATCH /api/admin/reservations/[id]` : Archiver/Désarchiver
     - Body : `{ archived: boolean }`
     - Enregistre date + nom admin lors de l'archivage
   - ✅ `DELETE /api/admin/reservations/[id]` : Suppression définitive
     - Cascade delete des PaymentTransaction associées

**Pages Admin créées** :

- ✅ **Dashboard dynamique** (`src/pages/admin/dashboard.astro`) :
  - Stats cards avec API en temps réel (remplace valeurs statiques)
  - Animation de chargement (points pulsants)
  - Formatage euros avec `Intl.NumberFormat`
  - 3 cards : Nouvelles demandes | Réservations | Revenus payés
  - Lien "Réservations" actif (badge "Bientôt" retiré)

- ✅ **Gestion réservations** (`src/pages/admin/reservations.astro`) :
  - **Tableau complet** : Date | Événement | Nom | Email | Activité | Participants | Montant | Statut | Actions
  - **Filtres** (4 colonnes) :
    1. Statut paiement (PENDING, PAID, FAILED, REFUNDED, CANCELLED)
    2. Événement (rempli dynamiquement avec les événements présents)
    3. Archivage (Actives ✓ par défaut | Archivées | Toutes)
    4. Bouton Rafraîchir
  - **Bouton Export CSV** : Export complet de toutes les réservations filtrées
  - **Actions intelligentes** :
    - **Bouton "✓ Payé"** : Actif uniquement si pas de transaction SumUp en cours
      - Tooltip explicatif si désactivé : "Paiement SumUp en cours"
      - Tooltip actif : "Marquer comme payé manuellement (paiement sur place)"
    - **Bouton "↩ Rembourser"** : Visible si status = PAID
    - **Bouton "📦 Archiver"** : Visible si non archivé
    - **Bouton "↩ Restaurer"** : Visible si archivé
    - **Bouton "🗑 Supprimer"** : Toujours visible (double confirmation)
  - **Double confirmation suppression** :
    1. Premier alert : Avertissement + liste des données perdues
    2. Second alert : Recommandation d'utiliser Archiver

**Fichiers créés** :
- `src/pages/api/admin/stats.ts` - Stats dashboard
- `src/pages/api/admin/reservations.ts` - Endpoint GET avec filtres
- `src/pages/api/admin/reservations/[id].ts` - Endpoints PUT, PATCH, DELETE
- `src/pages/admin/reservations.astro` - Interface admin complète
- `src/scripts/admin/reservations.ts` - Logique client-side TypeScript
- `src/styles/admin/contacts.css` (MAJ) - Ajout badges paiement + btn-delete

**Export CSV** :
- Fonction `exportToCSV()` côté client
- Génère fichier `reservations_YYYY-MM-DD.csv`
- BOM UTF-8 (`\uFEFF`) pour compatibilité Excel
- 12 colonnes : Date, Événement, Prénom, Nom, Email, Téléphone, Activité, Participants, Montant, Statut, Transaction ID, Date Paiement

**Workflow Paiement SumUp (Préparé pour Phase F)** :

```typescript
// Scénario 1 : Paiement réussi
Reservation (PENDING) → PaymentTransaction (INITIATED)
→ SumUp checkout → COMPLETED → Reservation (PAID)

// Scénario 2 : Échec puis réessai
Reservation → Transaction #1 (EXPIRED)
→ Transaction #2 (INITIATED) → COMPLETED → Reservation (PAID)
// ✅ Historique conservé : 2 lignes dans PaymentTransaction

// Scénario 3 : Paiement sur place
Reservation (PENDING) → Aucune transaction SumUp
→ Admin clique "✓ Payé" → Reservation (PAID)
```

**Correctifs** :
- ✅ Bug filtre événement : Utilisait `slug` au lieu de `eventId` (UUID)
  - Corrigé dans `populateEventFilter()` : `event.id` au lieu de `event.slug`

**Sécurité & Validation** :
- Protection passage PAID manuel si transactions SumUp actives
- Validation Zod sur tous les query params et body
- `credentials: 'include'` sur tous les fetch
- Cookies httpOnly + SameSite=Strict
- Archivage enregistre l'admin responsable

**Base de Données** :
- Schéma Prisma mis à jour (7 modèles désormais)
- `bun run db:push` appliqué (sync DB)
- `bun run db:generate` pour regénérer client Prisma
- Index sur `archived` pour performances filtres

**Dernier commit** : `84eb797` - feat(phase-c): système complet de gestion des réservations avec archivage et transactions SumUp

#### Phase E : Formulaire Public & Contact (✅ Complété - 28 janvier 2026)

**Connexion du formulaire `/formulaire-groupe` à l'API pour envoyer demandes de contact et réservations aventure**

**Distinction importante** :
- **ContactRequest** (Phase E) : Demande de renseignements pour aventure groupe (PAS de paiement)
  - Simple contact OU réservation aventure avec données (participants, durée, formule)
  - Enregistré dans table `contact_requests` avec status `NEW`
- **Reservation** (Phase F) : Inscription événement avec paiement SumUp
  - Enregistré dans table `reservations` avec `paymentStatus`

**API Endpoint créé** :
- ✅ `POST /api/public/contact` : Soumettre demande de contact ou réservation aventure
  - Body : `{ name, email, phone, message, isBooking, bookingData? }`
  - Si `isBooking = true` : bookingData requis avec `{ participants, duration, formula }`
  - Validation Zod complète (email, champs requis, types)
  - Insertion en base : `ContactRequest` avec status `NEW`
  - Response : `{ success: true, contactId: string, message: string }`

**Script TypeScript modifié** :
- ✅ `src/scripts/formulaire-groupe.ts` : Envoi vers API
  - Fetch vers `/api/public/contact` avec méthode POST
  - Gestion des erreurs (network, validation, serveur)
  - Messages de succès (vert) / erreur (rouge)
  - Désactivation du bouton pendant l'envoi ("Envoi en cours...")
  - Reset du formulaire après succès
  - Auto-hide du message après 5 secondes

**Fichiers créés** :
- `src/pages/api/public/contact.ts` - Endpoint public de soumission
- `PHASE_E_TEST.md` - Guide de test complet avec scénarios

**Workflow Utilisateur** :

```typescript
// Scénario 1 : Contact simple
1. Remplir nom, email, téléphone, message
2. Ne PAS cocher "Je souhaite réserver une formule d'aventure"
3. Cliquer "Envoyer ma demande"
→ ContactRequest créé avec isBooking = false, bookingData = null

// Scénario 2 : Réservation aventure
1. Remplir nom, email, téléphone, message
2. Cocher "Je souhaite réserver une formule d'aventure"
3. Remplir participants, durée, formule
4. Cliquer "Envoyer ma demande"
→ ContactRequest créé avec isBooking = true, bookingData = { participants, duration, formula }
```

**Validation Zod** :
- Email format valide
- Champs requis non vides (name, email, phone, message)
- Si isBooking = true → bookingData complet (participants, duration, formula)
- Participants : nombre entier positif
- Duration : enum ['1jour', '2jours']
- Formula : enum ['all-inclusive', 'adventure', 'adventure-plus', 'race']

**Intégration avec Phase C** :
- Les demandes créées apparaissent immédiatement dans `/admin/contacts`
- Badge "Contact" ou "Réservation" selon `isBooking`
- Bouton 👁️ pour voir le message complet + bookingData (si présent)

**Prochaines étapes optionnelles (hors Phase E)** :
- Email confirmation via Resend (utilisateur + admin)
- Validation côté client (en plus du serveur)
- Loader/spinner pendant l'envoi

**Dernier commit Phase E** : À créer

---

#### Phase D : Gestion Événements et Inscriptions (✅ Complété - 29 janvier 2026)

**Système complet de gestion des événements avec interface admin et API CRUD pour activités et tarifs**

**Objectif** : Créer un système complet pour gérer les événements (AE7, AE8...) et permettre les inscriptions publiques avec formulaire dynamique généré depuis la base de données.

**Architecture de Données** :

La Phase D introduit une nouvelle structure normalisée pour gérer les événements, activités et tarifs :

```
Event (ex: AE7)
  └─ Activity (ex: "rando papilles", "le défi")
      └─ EventPricing (ex: "adulte 45€", "enfant 25€")
```

**Nouvelle Structure Prisma** :

```typescript
// ========================================
// ÉVÉNEMENTS
// ========================================
model Event {
  id                        String      @id @default(uuid())
  name                      String      // "Anjou Explore #7"
  slug                      String      @unique // "ae7"
  date                      DateTime    // Date de l'événement
  status                    EventStatus @default(DRAFT)
  paymentEnabled            Boolean     @default(false)

  // Gestion des inscriptions
  registrationDeadline      DateTime?   // Date limite auto-close (optionnel)
  registrationOpenOverride  Boolean?    // true = forcer ouvert, false = forcer fermé, null = auto

  // Informations complémentaires
  description               String?     // Description courte
  location                  String?     // Lieu événement

  // Relations
  activities                Activity[]
  reservations              Reservation[]

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}

enum EventStatus {
  DRAFT      // En préparation (non visible sur site)
  OPEN       // Publié et visible sur site
  CLOSED     // Terminé (visible mais inscriptions fermées)
  ARCHIVED   // Masqué du site
}

// ========================================
// ACTIVITÉS (nouveau modèle)
// ========================================
model Activity {
  id                String         @id @default(uuid())
  eventId           String
  event             Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)

  name              String         // "rando papilles", "le défi"
  description       String?        // Description optionnelle
  maxParticipants   Int?           // Limite totale pour cette activité (tous tarifs confondus)

  // Relations
  pricing           EventPricing[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([eventId, name]) // Pas de doublon activité par événement
}

// ========================================
// TARIFICATION (renommé de "Formula")
// ========================================
model EventPricing {
  id          String   @id @default(uuid())
  activityId  String
  activity    Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  priceType   String   // "adulte", "enfant", "étudiant", etc.
  label       String   // "Adulte (+16 ans)"
  price       Decimal  @db.Decimal(10, 2)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([activityId, priceType]) // Pas de doublon type par activité
}
```

**Exemple concret AE6** :
- Event : "Anjou Explore #6" (slug: ae6)
  - Activity 1 : "rando papilles" (max 50 places)
    - EventPricing 1 : adulte, 45€
    - EventPricing 2 : enfant, 25€
  - Activity 2 : "le défi" (max 30 places)
    - EventPricing 3 : adulte, 50€
    - EventPricing 4 : enfant, 30€

**Logique d'Ouverture/Fermeture des Inscriptions** :

```typescript
// Priorité 1 : Override manuel (si défini)
if (event.registrationOpenOverride === true) return "OUVERT";
if (event.registrationOpenOverride === false) return "FERMÉ";

// Priorité 2 : Deadline automatique (si définie)
if (event.registrationDeadline) {
  if (Date.now() > event.registrationDeadline) return "FERMÉ";
}

// Priorité 3 : Status événement
if (event.status !== "OPEN") return "FERMÉ";

return "OUVERT";
```

**Workflow Inscription Utilisateur** :

1. Utilisateur visite `/evenements/ae7`
2. Page recherche en BDD un Event avec `slug = "ae7"`
   - Si aucun → Pas de bouton inscriptions
   - Si trouvé → Vérifie si inscriptions ouvertes (logique ci-dessus)
3. Si ouvert → Affiche bouton "Réservations" vers `/evenements/ae7/inscriptions`
4. Page `/evenements/[slug]/inscriptions.astro` (dynamique) :
   - Récupère Event + Activities + EventPricing depuis BDD
   - Génère formulaire dynamique :
     - Dropdown : Choix activité
     - Inputs number : Nombre adultes, enfants
     - Calcul total en temps réel (côté client, informatif)
   - Champs utilisateur : nom, prénom, email, téléphone
5. Soumission → `POST /api/public/reservations/create`
6. Backend :
   - Reçoit : `{ eventSlug, nom, prenom, email, telephone, items: [{ eventPricingId, quantity }] }`
   - Récupère les prix depuis BDD (recalcul côté serveur, sécurité anti-Postman)
   - Vérifie capacité restante de l'activité
   - Crée Reservation (status PENDING)
   - Retourne `{ reservationId, amount }`
7. Suite → Workflow SumUp (Phase F)

**Plan d'Implémentation (6 étapes)** :

**Étape 1 : Migration Base de Données** ✅
- ✅ Créer modèle `Activity` dans schema.prisma
- ✅ Renommer `Formula` en `EventPricing`
- ✅ Modifier `EventPricing` : remplacer `eventId` par `activityId`
- ✅ Ajouter champs sur `Event` : `registrationDeadline`, `registrationOpenOverride`, `description`, `location`
- ✅ Migration Prisma : `bun run db:push` (dev)
- ✅ Seed data : Créer AE6 + AE7 avec activités + tarifs
- ✅ Régénérer client Prisma : `bun run db:generate`

**Étape 2 : Interface Admin `/admin/events`** ✅
- ✅ Page liste `/admin/events` :
  - Tableau : Événement | Date | Statut | Activités | Réservations | Actions
  - Bouton "Créer événement" (lien vers `/admin/events/new`)
  - Actions : Voir (👁️) | Supprimer (🗑️)
  - Filtre par statut (DRAFT, OPEN, CLOSED, ARCHIVED)
  - Système de toast notifications (succès/erreur/info)
  - Modale de confirmation stylée pour suppressions
- ✅ Page détails `/admin/events/[id]` :
  - Section 1 : Infos générales avec formulaire éditable
    - Nom, slug, date, status, paiements activés, location
    - Bouton "✏️ Modifier" avec modal d'édition
  - Section 2 : Statistiques événement
    - Participants inscrits par activité
    - Revenus (PENDING + PAID)
    - Places restantes par activité
  - Section 3 : Gestion activités (CRUD complet)
    - Cartes visuelles avec bordures et ombres
    - Pour chaque activité : nom, description, max participants
    - Actions : Modifier (✏️) | Supprimer (🗑️)
    - Modal "➕ Nouvelle activité"
  - Section 4 : Gestion tarifs par activité (CRUD inline)
    - Liste des tarifs par activité avec prix
    - Actions : Ajouter tarif (➕) | Supprimer tarif (✕)
    - Validation temps réel
- ✅ Design cohérent avec `/admin/contacts` et `/admin/reservations`

**Étape 3 : API Admin Événements** ✅
- ✅ `GET /api/admin/events` - Liste événements (avec filtre status optionnel)
- ✅ `GET /api/admin/events/[id]` - Détails événement (inclut activities + pricing + _count.reservations)
- ✅ `PUT /api/admin/events/[id]` - Modifier événement (validation Zod)
- ✅ `DELETE /api/admin/events/[id]` - Supprimer événement (bloqué si réservations existent)
- ✅ `POST /api/admin/events/[eventId]/activities` - Créer activité
- ✅ `PUT /api/admin/events/[eventId]/activities/[id]` - Modifier activité
- ✅ `DELETE /api/admin/events/[eventId]/activities/[id]` - Supprimer activité (cascade pricing)
- ✅ `POST /api/admin/events/[eventId]/activities/[activityId]/pricing` - Créer tarif
- ✅ `DELETE /api/admin/events/[eventId]/pricing/[id]` - Supprimer tarif
- ✅ `GET /api/admin/events/[id]/stats` - Statistiques détaillées événement
- ✅ Authentification requise sur tous les endpoints (middleware requireAuth)

**Étape 4 : Page Publique Inscriptions** ✅
- ✅ Créer `/evenements/[slug]/inscriptions.astro` (route dynamique)
- ✅ Fetch Event + Activities + EventPricing depuis BDD (mode server)
- ✅ Logique d'ouverture/fermeture inscriptions (deadline + override)
- ✅ Si fermé : Afficher message "Inscriptions fermées" avec icône et bouton retour
- ✅ Si ouvert : Afficher formulaire dynamique :
  - Liste activités générées depuis BDD (pas dropdown)
  - Inputs quantity par EventPricing (adulte, enfant, etc.)
  - Calcul total en temps réel (JavaScript)
  - Champs : nom, prénom, email, téléphone
  - Bouton "Réserver" (désactivé si total = 0)
- ✅ Script TypeScript `src/scripts/inscription-event.ts` pour soumission formulaire
- ✅ Design cohérent avec thème Anjou Explore (gradients or/olive, cartes élégantes)
- ✅ **UX Capacités** :
  - Calcul places disponibles serveur-side avec `getAvailableSpots()`
  - Activités complètes grisées (opacity 0.6, pointer-events none)
  - Badge rouge "Complet" + message "Plus de places disponibles"
  - Alerte orange "Plus que X places" si ≤ 10 places restantes
  - `maxParticipants = null` → Illimité (pas de message capacité)
  - Inputs désactivés pour activités complètes
- ✅ Validation HTML5 avec `scroll-margin-top: 100px` (offset menu fixe)
- ✅ Messages succès/erreur avec scroll automatique

**Étape 5 : API Publique Réservations** ✅
- ✅ `POST /api/public/reservations/create` :
  - Body : `{ eventSlug, nom, prenom, email, telephone, items: [{ eventPricingId, quantity }] }`
  - Validation Zod complète (email, champs requis, items min/max)
  - Récupération Event depuis slug avec activities + pricing
  - Vérification inscriptions ouvertes (status + deadline + override)
  - **Recalcul montant côté serveur** (sécurité anti-manipulation)
  - **Vérification capacité restante** via `getReservedCount(activityId)`
    - Compte réservations PENDING + PAID (exclut FAILED/REFUNDED/CANCELLED)
    - Agrégation JSON `participants` pour total par activité
    - Retour erreur 409 si capacité dépassée avec détails
  - Si capacité OK : Créer Reservation (status PENDING)
  - Retour : `{ success: true, reservationId, amount }`
- ✅ Gestion erreurs détaillées :
  - 404 : Événement introuvable
  - 403 : Inscriptions fermées
  - 400 : Données invalides (Zod validation)
  - 409 : Capacité dépassée (avec nb places disponibles)
  - 500 : Erreur serveur

**Étape 6 : Intégration Pages Événements Existantes** ✅
- ✅ Modifier `/evenements/ae6/index.astro` :
  - Recherche Event avec `slug = "ae6"` en BDD (select minimal)
  - Badge dynamique selon statut :
    - Vert "✅ Inscriptions ouvertes" si ouvert
    - Orange "🔒 Inscriptions fermées" si status !== OPEN
    - Rouge "⏰ Événement terminé" si status = ARCHIVED
  - Si ouvert : Bouton gradient "📝 S'inscrire maintenant" (lien vers `/evenements/ae6/inscriptions`)
  - Si fermé : Bouton rouge désactivé avec message explicatif
- ✅ Pattern extensible pour futurs événements (AE7, AE8...)
- ✅ Bouton stylisé cohérent avec design Anjou Explore (gradient or/olive, hover shadow)

---

**Implémentation Complète des Étapes 1-3** :

**Fichiers créés** :
```
src/pages/api/admin/
├── events/
│   ├── index.ts                          # GET /api/admin/events
│   ├── [id].ts                           # GET/PUT/DELETE /api/admin/events/[id]
│   ├── [id]/
│   │   ├── activities.ts                 # POST /api/admin/events/[id]/activities
│   │   ├── activities/[id].ts            # PUT/DELETE activité
│   │   ├── pricing/
│   │   │   ├── [activityId].ts           # POST tarif
│   │   │   └── [id].ts                   # DELETE tarif
│   │   └── stats.ts                      # GET /api/admin/events/[id]/stats

src/pages/admin/
├── events/
│   ├── index.astro                       # Liste événements
│   └── [id].astro                        # Détails/édition événement

src/scripts/admin/
├── events.ts                             # Logique liste événements
└── event-details.ts                      # Logique page détails
```

**Système Toast & Confirmation (Remplacement alert/confirm)** :

Phase D a introduit un système complet de notifications UX pour remplacer les popups natifs du navigateur :

1. **Toast Notifications** (`showToast()`) :
   - Types : `success` (vert), `error` (rouge), `info` (bleu)
   - Auto-dismiss après 5 secondes
   - Animation slide-in depuis la droite
   - Bouton fermeture manuelle (✕)
   - Container fixe en haut à droite (z-index 60)
   - Icônes SVG inline par type
   - Protection XSS via `escapeHtml()`

2. **Confirmation Modal** (`showConfirm()`) :
   - Promise-based : `const confirmed = await showConfirm(message, details)`
   - Modal avec overlay semi-transparent
   - Affichage liste de détails optionnelle (ex: "Supprimera : activités, tarifs...")
   - Boutons stylisés : Annuler (gris) | Confirmer (rouge)
   - Fermeture via X, Annuler, ou clic overlay
   - Design cohérent avec thème Anjou Explore

**Pattern d'utilisation** :
```typescript
// Avant (alert/confirm natifs)
if (confirm('Voulez-vous supprimer ?')) {
  try {
    await fetch(...);
    alert('Supprimé !');
  } catch (error) {
    alert('Erreur');
  }
}

// Après (toast/confirm stylés)
const confirmed = await showConfirm(
  'Voulez-vous vraiment supprimer l\'activité "rando papilles" ?',
  ['Tous les tarifs associés', 'Les données ne pourront pas être récupérées']
);
if (!confirmed) return;

try {
  const response = await fetch('/api/admin/events/[id]/activities/[activityId]', {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Erreur serveur');

  showToast('Activité supprimée avec succès', 'success');
  await loadEvent();
} catch (error) {
  showToast(error.message || 'Erreur lors de la suppression', 'error');
}
```

**Choix techniques importants** :

1. **Data attributes vs onclick inline** :
   - Astro TypeScript modules ne sont pas exposés au scope global
   - Solution : `data-action="delete-event"` + `addEventListener()` après render
   ```typescript
   // Render HTML avec data-attributes
   <button data-action="delete-event" data-event-id="${event.id}">🗑️</button>

   // Attach listeners après render
   function attachEventListeners() {
     document.querySelectorAll('[data-action="delete-event"]').forEach(btn => {
       btn.addEventListener('click', () => {
         const eventId = btn.dataset.eventId;
         deleteEvent(eventId);
       });
     });
   }
   ```

2. **Protection suppression événements** :
   - Vérifie `_count.reservations` côté serveur
   - Bloque suppression si réservations existent
   - Message clair : "X réservation(s) existent. Archivez-les d'abord."

3. **Stats événement en temps réel** :
   - Endpoint dédié `/api/admin/events/[id]/stats`
   - Agrégation Prisma pour participants et revenus
   - Calcul places restantes : `maxParticipants - totalReserved`

4. **Cascade deletes** :
   - DELETE Event → Cascade Activities → Cascade EventPricing
   - Gestion propre avec `onDelete: Cascade` dans schema Prisma

**Design & UX** :

- **Cards activités** : Bordures dorées, ombres légères, gradient background
- **Séparation visuelle** : Margin + border-bottom entre activités
- **Loading states** : États loading/empty/table gérés proprement
- **Filtres** : Dropdown status avec "Tous" par défaut
- **Badges status** : DRAFT (gris), OPEN (vert), CLOSED (orange), ARCHIVED (rouge)

**Validation Zod** :

Tous les endpoints utilisent Zod pour validation :
```typescript
const createActivitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional()
});

const body = createActivitySchema.parse(await request.json());
```

**Fichiers à Créer** :
```
prisma/
  └── migrations/XXXXXX_add_activity_and_refactor_pricing/  # Migration SQL

src/pages/
  ├── api/
  │   └── admin/
  │       └── events/
  │           ├── index.ts                    # GET/POST événements
  │           ├── [id].ts                     # GET/PUT/DELETE événement
  │           ├── [id]/
  │           │   ├── activities.ts           # POST activité
  │           │   └── activities/[activityId].ts  # PUT/DELETE activité
  │           └── pricing/
  │               ├── [activityId].ts         # POST tarif
  │               └── [pricingId].ts          # PUT/DELETE tarif
  ├── admin/
  │   └── events/
  │       ├── index.astro                     # Liste événements
  │       ├── create.astro                    # Créer événement
  │       └── [id].astro                      # Détails/édition événement
  └── evenements/
      └── [slug]/
          └── inscriptions.astro              # Formulaire inscription dynamique

src/scripts/
  ├── admin/
  │   └── events.ts                           # Logique admin événements
  └── inscription-event.ts                    # Logique formulaire inscription public

src/styles/
  └── admin/
      └── events.css                          # Styles admin événements (optionnel)

src/lib/
  └── services/
      ├── eventService.ts                     # Business logic événements
      └── registrationService.ts              # Business logic inscriptions
```

**Sécurité Calcul Montant** :

```typescript
// ❌ MAUVAIS : Frontend envoie le montant
POST /api/public/reservations/create
Body: { amount: 45 }  // ⚠️ Utilisateur peut tricher avec Postman

// ✅ BON : Frontend envoie les IDs, backend recalcule
POST /api/public/reservations/create
Body: {
  items: [
    { eventPricingId: "uuid-adulte", quantity: 2 },  // Backend récupère prix 45€
    { eventPricingId: "uuid-enfant", quantity: 1 }   // Backend récupère prix 25€
  ]
}
// Backend calcule : (2 × 45) + (1 × 25) = 115€
```

**Notes Techniques Importantes** :

1. **Relation Event → Reservation** :
   - `Reservation.activityName` (String) reste pour l'instant
   - Envisager migration vers `Reservation.activityId` (relation) dans une future phase

2. **Contraintes unicité** :
   - `Event.slug` : Unique (pour routing)
   - `Activity` : Unique par `[eventId, name]`
   - `EventPricing` : Unique par `[activityId, priceType]`

3. **Cascade deletes** :
   - Supprimer Event → Supprime Activities → Supprime EventPricing
   - Protège l'intégrité référentielle

4. **Vérification capacité** :
```typescript
// Compter places réservées pour une activité
const reservedCount = await prisma.reservation.aggregate({
  where: {
    eventId: event.id,
    activityName: activity.name,  // ⚠️ String pour l'instant
    paymentStatus: { in: ['PENDING', 'PAID'] }  // Ignorer FAILED/CANCELLED
  },
  _sum: {
    // Sommer participants.adulte + participants.enfant
  }
});

if (activity.maxParticipants && reservedCount >= activity.maxParticipants) {
  throw new Error('Activité complète');
}
```

**Tests utilisateur réussis** :
- ✅ Liste événements avec filtres
- ✅ Création/modification/suppression événements
- ✅ Gestion activités (CRUD complet)
- ✅ Gestion tarifs (CRUD complet)
- ✅ Protection suppression si réservations existent
- ✅ Stats événement en temps réel
- ✅ Toast notifications et modales de confirmation

**Notes de débogage** :
- Problème initial : modales s'ouvraient automatiquement au chargement
  - Cause : `display: flex` de `.modal` surclassait `.hidden`
  - Fix : `.modal.hidden { display: none !important; }`
- Problème curseur : résolu avec `cursor: pointer !important;`
- Handlers onclick inline ne fonctionnaient pas (scope TypeScript module)
  - Fix : Pattern data-attributes + addEventListener()

---

**Implémentation Complète des Étapes 4-6** :

**Workflow Utilisateur Complet** :

1. L'utilisateur visite `/evenements/ae6`
2. Badge dynamique indique si inscriptions ouvertes/fermées/terminées
3. Si ouvert : Clic sur "S'inscrire maintenant" → `/evenements/ae6/inscriptions`
4. Formulaire affiche activités depuis BDD avec calcul temps réel
5. Activités complètes sont **automatiquement grisées** (UX proactive)
6. Alerte orange si moins de 10 places restantes
7. Validation HTML5 avec scroll offset (menu fixe)
8. Soumission → API vérifie capacité restante en temps réel
9. Si OK : Création Reservation (PENDING) + message succès
10. Si KO : Message d'erreur détaillé (capacité, validation, etc.)

**Fichiers créés** :
```
src/pages/
  ├── evenements/
  │   └── [slug]/
  │       └── inscriptions.astro            # Formulaire public inscriptions
  ├── api/
  │   └── public/
  │       └── reservations/
  │           └── create.ts                 # POST création réservation

src/scripts/
  └── inscription-event.ts                  # Logique client-side formulaire

PHASE_D_TESTS.md                            # Guide de test complet (7 tests)
```

**Gestion Intelligente des Capacités** :

**Calcul Serveur-Side** (`getAvailableSpots()`) :
```typescript
async function getAvailableSpots(activityId: string, maxParticipants: number | null): Promise<number | null> {
  // Si pas de limite, retourner null (illimité)
  if (maxParticipants === null) return null;

  // Compter réservations PENDING + PAID
  const reservations = await prisma.reservation.findMany({
    where: {
      activityId: activityId,
      paymentStatus: { in: ['PENDING', 'PAID'] },
      archived: false,
    },
    select: { participants: true },
  });

  // Agréger JSON participants
  let reservedCount = 0;
  for (const reservation of reservations) {
    const participants = reservation.participants as Record<string, number>;
    for (const quantity of Object.values(participants)) {
      reservedCount += quantity;
    }
  }

  return maxParticipants - reservedCount;
}
```

**UX Visuel Proactif** :
- `activity.isFull` : Badge rouge "Complet" + message "Plus de places disponibles"
- `activity.availableSpots <= 10` : Alerte orange "Plus que X places"
- `activity.isFull = true` :
  - Opacity 0.6 sur toute la card
  - `pointer-events: none` (aucune interaction)
  - Inputs désactivés (attribute `disabled`)
  - Textes et prix en gris
  - Background cartes tarifs gris clair
- JavaScript skip inputs disabled lors du calcul total

**Protection Multi-Niveaux** :

1. **UX (Préventif)** : Activités complètes grisées + inputs disabled
2. **Client-side** : Skip disabled inputs dans calcul total
3. **API (Sécurité)** : Vérification capacité avant création Reservation
4. **Database** : Transactions atomiques (future amélioration possible)

**Tests utilisateur réussis** :
- ✅ Badge dynamique selon statut événement (OPEN/CLOSED/ARCHIVED)
- ✅ Formulaire généré dynamiquement depuis BDD
- ✅ Calcul total en temps réel
- ✅ Validation HTML5 avec scroll offset
- ✅ Création réservation avec recalcul serveur
- ✅ Vérification capacité (erreur 409 si dépassement)
- ✅ **UX capacités** : Graying out, badges, alertes
- ✅ `maxParticipants = null` → Illimité (pas de restrictions)
- ✅ Inscriptions fermées bloquent formulaire
- ✅ Réservations apparaissent dans `/admin/reservations`

**Correctifs appliqués** :
- Scroll offset : CSS `scroll-margin-top: 100px` au lieu de JavaScript
- Champs rouges au chargement : Suppression règle CSS `:invalid`
- Erreur 500 API : Fix requête Prisma `activityId` direct (relation manquante)
  - User a ajouté relation Activity ↔ Reservation dans schema
  - `bun run db:push` + `bun run db:generate` appliqués

**Guide de Test Complet** :
- `PHASE_D_TESTS.md` : 7 tests détaillés avec scénarios
  - Test 1 : Activer inscriptions
  - Test 2 : Vérifier page AE6
  - Test 3 : Page inscriptions
  - Test 4 : Soumission formulaire (3 sous-tests)
  - Test 5 : Capacités (5 sous-tests : limité, alerte, complet, illimité, API)
  - Test 6 : Fermeture inscriptions
  - Test 7 : Vérification admin

**Dernier commit Phase D** : À créer - Suggestion : `feat(phase-d): système complet inscriptions publiques avec UX capacités proactive`

---

### 📋 À faire

#### Phase F : Paiements SumUp (Après Phase D)
- [ ] Configuration compte SumUp
- [ ] Workflow checkout SumUp dans formulaire événement
- [ ] Webhook callback `/api/webhooks/sumup`
- [ ] Email confirmation paiement Resend
- [ ] Gestion des remboursements

#### À venir
- [ ] Page Témoignages
- [ ] Configuration Docker/Kubernetes (production)
- [ ] Tests automatisés (Vitest)

## Important Notes

### Paiements SumUp
- L'intégration de l'API SumUp était la principale difficulté sur Wix
- À réintégrer plus tard après migration du contenu statique
- Sera intégré dans le formulaire groupe

### Contact
- Téléphone : 06.83.92.45.03
- Mettre à jour dans le footer si changement

### Navigation
- Structure hiérarchique avec sous-menus :
  - Accueil
  - L'équipe
  - Notre Catalogue
    - Nos Suggestions
  - Evènements
    - Anjou Explore #6 (avec lien vers Règlement dans la page)
  - Galerie Photos
  - Contact (bouton doré mis en évidence)
- Menu responsive avec hamburger sur mobile
- Architecture extensible pour futurs évènements

### Composants à créer
Composants réutilisables à extraire au fur et à mesure :
- Card d'activité
- Testimonial card
- Gallery image component
- Form input components

### Best Practices pour ce Projet
- Privilégier la simplicité : c'est un site vitrine, pas une application complexe
- Optimiser les images avant de les ajouter (performance)
- Garder le même ton et style visuel que le site Wix original
- Tester la responsivité mobile (beaucoup d'utilisateurs sur mobile)

## Development Workflow

1. **Ajout d'une nouvelle page** : Créer un fichier `.astro` dans `src/pages/`
2. **Modification du layout** : Éditer `src/layouts/Layout.astro`
3. **Ajout de composants** : Créer dans `src/components/` et importer où nécessaire
4. **Ajout d'assets** : Placer dans `public/` (accessible via `/filename.ext`)
5. **Styling** : Utiliser les classes TailwindCSS directement dans les templates

## Debugging

**Configuration VSCode** : `.vscode/launch.json` configuré pour Bun

**Méthodes de debugging** :

1. **F5 (Debug Astro Server)** :
   - Lance `bun --inspect-wait run dev` avec pause au démarrage
   - Breakpoints actifs dans tous les fichiers TypeScript
   - Console interactive dans VSCode Debug Console

2. **Attach to running server** :
   - Terminal : `bun --inspect run dev`
   - VSCode : Attach to Bun (port 9229)
   - Utile pour ne pas redémarrer le serveur

3. **Breakpoints conditionnels** :
   - Click droit sur breakpoint → Edit Breakpoint
   - Condition : `adminName === "José"`
   - Hit count : `> 5`

**Où placer les breakpoints** :
- Routes API : `src/pages/api/**/*.ts` (ligne des try/catch)
- Auth logic : `src/lib/auth/*.ts`
- Prisma queries : Après `await prisma.*`

**Voir** : [.vscode/DEBUG.md](.vscode/DEBUG.md) pour guide complet

## Future Enhancements

- **Backend API** : À créer pour gérer les réservations et paiements
- **Database** : PostgreSQL ou SQLite pour stocker les réservations
- **Auth System** : Pour la page d'administration
- **Email Notifications** : Envoyer des confirmations de réservation
- **CMS** : Éventuellement ajouter un headless CMS pour faciliter l'édition de contenu
