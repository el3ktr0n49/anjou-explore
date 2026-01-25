# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anjou Explore** - Site web pour une association proposant des escapades nature, patrimoine et gastronomie dans la région de l'Anjou (France).

Ce projet est une migration d'un site Wix vers une stack moderne basée sur Astro et Bun.

### Stack Technique
- **Framework**: Astro 5.x (SSG - Static Site Generation)
- **Runtime**: Bun (au lieu de Node.js)
- **Styling**: TailwindCSS v4
- **Language**: TypeScript
- **Déploiement futur**: Docker/Kubernetes

### Pourquoi Astro ?
- Site principalement statique avec quelques éléments interactifs (formulaires)
- Performance optimale pour le SEO
- HTML généré par défaut, JavaScript uniquement où nécessaire
- Architecture "Islands" pour les composants interactifs
- Facilité d'évolution vers une architecture avec API/BDD

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
1. **URL secrète** : `/admin-<code-secret>` (non indexable)
2. **Mot de passe partagé** : Un seul mot de passe pour les 4 admins
3. **2FA individuel** : Chaque admin a son Google Authenticator

**Workflow de connexion :**
```typescript
1. Accéder à l'URL secrète (ex: /admin-ae-2026-xyz)
2. Entrer le mot de passe partagé
3. Sélectionner son nom (José/Fabien/Benoît/Adrien)
4. Entrer le code 2FA de Google Authenticator
5. → Session JWT valide 24h
```

**Admins configurés :**
- José (secret 2FA unique)
- Fabien (secret 2FA unique)
- Benoît (secret 2FA unique)
- Adrien (secret 2FA unique)

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
- `ADMIN_SHARED_PASSWORD` : Mot de passe partagé (bcrypt)
- `JWT_SECRET` : Secret pour signer les JWT
- `ADMIN_URL_SECRET` : URL secrète admin
- `RESEND_API_KEY` : Clé API Resend
- `SUMUP_API_KEY` : Clé API SumUp (à configurer)

**Bonnes pratiques :**
- Mots de passe hashés avec bcrypt
- JWT avec expiration 24h
- Cookies httpOnly + secure en production
- Validation des inputs avec Zod
- Rate limiting sur endpoints publics
- CORS configuré strictement

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

### 📋 À faire

#### Phase A : Infrastructure (✅ EN COURS)
- ✅ Docker Compose (PostgreSQL + pgAdmin)
- ✅ Schéma Prisma (6 modèles)
- ✅ Variables d'environnement (.env)
- ✅ Scripts de seed et initialisation
- ✅ Documentation backend

#### Phase B : Authentification Admin
- [ ] Page login admin (`/admin-<secret>`)
- [ ] API `/api/auth/login` (mot de passe + 2FA)
- [ ] Middleware JWT pour routes protégées
- [ ] UI pour scanner QR codes Google Authenticator
- [ ] Session management avec cookies httpOnly

#### Phase C : Dashboard Admin
- [ ] Page admin principale (dashboard)
- [ ] Liens de navigation admin
- [ ] Affichage stats globales
- [ ] Bouton déconnexion

#### Phase D : Gestion Formulaires
- [ ] Page liste demandes de contact
- [ ] Filtres et recherche
- [ ] Marquer comme traité/archivé
- [ ] Export CSV

#### Phase E : Gestion Événements
- [ ] CRUD événements (AE7, AE8...)
- [ ] Configuration formules/tarifs
- [ ] Activer/désactiver paiements
- [ ] Page de stats par événement

#### Phase F : Paiements SumUp
- [ ] Configuration compte SumUp
- [ ] Page formulaire inscription événement
- [ ] Workflow checkout SumUp
- [ ] Webhook callback
- [ ] Email confirmation Resend

#### À venir
- Page Témoignages
- Configuration Docker/Kubernetes (production)

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

## Future Enhancements

- **Backend API** : À créer pour gérer les réservations et paiements
- **Database** : PostgreSQL ou SQLite pour stocker les réservations
- **Auth System** : Pour la page d'administration
- **Email Notifications** : Envoyer des confirmations de réservation
- **CMS** : Éventuellement ajouter un headless CMS pour faciliter l'édition de contenu
