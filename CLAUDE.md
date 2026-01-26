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

### 📋 À faire

#### Phase C : Dashboard Fonctionnel (EN COURS)

**Objectif** : Rendre le dashboard opérationnel avec gestion des demandes de contact et réservations

**API Endpoints à créer** :

1. **Gestion Demandes Contact** :
   - ✅ `GET /api/admin/contacts` : Liste toutes les demandes
     - Query params : `?status=NEW|PROCESSED|ARCHIVED`, `?isBooking=true|false`
     - Response : `{ contacts: ContactRequest[], total: number }`
   - ✅ `PUT /api/admin/contacts/[id]` : Mettre à jour statut
     - Body : `{ status: string, processedBy?: string }`
   - ✅ `DELETE /api/admin/contacts/[id]` : Archiver définitivement

2. **Gestion Réservations** :
   - ✅ `GET /api/admin/reservations` : Liste réservations
     - Query params : `?eventId=...`, `?paymentStatus=PENDING|PAID|FAILED`
     - Response : `{ reservations: Reservation[], total: number, totalAmount: Decimal }`
   - ✅ `PUT /api/admin/reservations/[id]` : Mettre à jour paiement
     - Body : `{ paymentStatus: string, sumupTransactionId?: string }`

3. **Statistiques Globales** :
   - ✅ `GET /api/admin/stats` : Stats dashboard
     - Response : `{ contactsNew: number, reservationsTotal: number, revenuePending: Decimal, revenuePaid: Decimal }`

**Pages Admin à créer** :

1. **`src/pages/admin/contacts.astro`** :
   - Tableau avec colonnes : Date | Nom | Email | Téléphone | Type | Message | Statut | Actions
   - Filtres : Statut (NEW/PROCESSED/ARCHIVED), Type (Contact/Réservation)
   - Actions par ligne : Marquer traité, Archiver, Voir détails
   - Badge visuel pour demandes de réservation (isBooking=true)
   - Pagination si > 50 résultats

2. **`src/pages/admin/reservations.astro`** :
   - Tableau : Date | Événement | Nom | Activité | Participants | Montant | Statut Paiement | Actions
   - Filtres : Événement, Statut paiement
   - Actions : Marquer comme payé manuellement, Voir détails
   - Total revenue affiché en haut
   - Export CSV des réservations

3. **`src/pages/admin/dashboard.astro`** (amélioration) :
   - Remplacer stats statiques par appel API `/api/admin/stats`
   - Cards cliquables vers `/admin/contacts` et `/admin/reservations`
   - Graphiques simples (Chart.js ou Recharts) pour visualiser revenus

**Components à créer** :

- `src/components/admin/Table.astro` : Tableau réutilisable avec tri et pagination
- `src/components/admin/Badge.astro` : Badges de statut colorés
- `src/components/admin/Modal.astro` : Modal pour afficher détails
- `src/components/admin/ExportCSV.astro` : Bouton export avec logique

**Sécurité** :
- Tous les endpoints `/api/admin/*` doivent utiliser `requireAuth()` middleware
- Validation inputs avec Zod schemas
- Logs des actions admin (qui a marqué quoi comme traité)

**Ordre d'implémentation Phase C** :
1. API Stats (`/api/admin/stats`) + mise à jour dashboard
2. API Contacts (`GET`, `PUT`) + page `/admin/contacts`
3. API Réservations (`GET`, `PUT`) + page `/admin/reservations`
4. Components réutilisables (Table, Badge, Modal)
5. Export CSV + graphiques dashboard

#### Phase D : Gestion Événements (À planifier)
- [ ] CRUD événements (AE7, AE8...)
- [ ] Configuration formules/tarifs par événement
- [ ] Activer/désactiver paiements
- [ ] Page de stats détaillées par événement
- [ ] API endpoints : `GET/POST/PUT/DELETE /api/admin/events/[id]`

#### Phase E : Formulaire Public & Réservations (À planifier)
- [ ] Connecter formulaire-groupe.astro à API `/api/public/contact`
- [ ] Page formulaire inscription événement public
- [ ] Validation Zod côté serveur
- [ ] Email confirmation via Resend

#### Phase F : Paiements SumUp (À planifier)
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
