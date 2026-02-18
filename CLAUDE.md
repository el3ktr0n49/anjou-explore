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

### Astro Islands + Preact (✅ Refactorisation 30-31 jan 2026)

**Philosophie** : Utiliser Preact pour les composants interactifs complexes au lieu de TypeScript vanilla avec manipulation DOM.

**Avantages** :
- ✅ Séparation claire HTML/JS/CSS (vs `innerHTML` avec strings)
- ✅ Type-safety complète avec JSX/TSX
- ✅ Composants réutilisables et testables
- ✅ Réactivité automatique avec hooks (`useState`, `useEffect`)
- ✅ Bundle ultra-léger : Preact = 3kb vs React = 45kb
- ✅ API compatible React (migration facile si besoin)

**Pattern Astro Islands** :
```astro
---
// Page .astro (SSR)
import MyComponent from '../components/islands/MyComponent';
---

<Layout>
  {/* Island : Devient interactif côté client */}
  <MyComponent client:load initialData={data} />
</Layout>
```

**Directives client** :
- `client:load` : Hydrate immédiatement (pour interfaces admin)
- `client:idle` : Hydrate quand navigateur idle
- `client:visible` : Hydrate quand visible (lazy loading)

**Structure composants** :
```
src/components/admin/
├── types.ts                        # Types partagés (Event, Activity, ReservationFull, etc.)
├── ui/                             # Composants UI réutilisables
│   ├── Toast.tsx                   # Notification individuelle
│   ├── ToastContainer.tsx          # Gestionnaire de toasts
│   ├── Modal.tsx                   # Modal réutilisable
│   └── ConfirmDialog.tsx           # Dialog de confirmation
└── islands/                        # Astro Islands (composants interactifs)
    ├── EventDetailsPage.tsx        # Page détails événement
    ├── EventInfoCard.tsx           # Affichage/édition événement
    ├── ActivitiesManager.tsx       # CRUD activités + tarifs
    ├── ActivityCard.tsx            # Card d'une activité
    ├── StatsCard.tsx               # Statistiques événement
    ├── EventsListPage.tsx          # Page liste événements
    ├── ReservationsPage.tsx        # Page gestion réservations
    ├── ReservationFilters.tsx      # Filtres réservations
    └── ContactsPage.tsx            # Page gestion contacts

src/scripts/admin/                  # Scripts archivés (*.old)
├── event-details.ts.old            # 1100 lignes → EventDetailsPage.tsx
├── events.ts.old                   # 442 lignes → EventsListPage.tsx
├── reservations.ts.old             # 493 lignes → ReservationsPage.tsx
└── contacts.ts.old                 # 329 lignes → ContactsPage.tsx
```

**Pages refactorées (TOUTES COMPLÉTÉES)** :
- ✅ `/admin/events/[id]` : Gestion événement (EventDetailsPage) - 30 jan 2026
- ✅ `/admin/events` : Liste événements (EventsListPage) - 31 jan 2026
- ✅ `/admin/reservations` : Gestion réservations (ReservationsPage) - 31 jan 2026
- ✅ `/admin/contacts` : Gestion contacts (ContactsPage) - 31 jan 2026

**Statistiques** :
- 2364 lignes de TypeScript vanilla refactorisées
- 13 composants Preact créés (4 UI + 9 Islands)
- 100% des pages admin migrées

**Documentation complète** : Voir [REFACTOR_PREACT.md](docs/REFACTOR_PREACT.md)

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

# Admin Management
bun run admin:reset-password <adminName>   # Réinitialiser le mot de passe d'un admin
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

**Système d'authentification sécurisé en 3 couches :**
1. **URL secrète** : `/admin-<code-secret>` (non indexable, défini dans ADMIN_URL_SECRET)
2. **Mot de passe individuel** : Chaque admin a son propre mot de passe (hash bcrypt)
3. **2FA individuel** : Chaque admin a son Google Authenticator unique

**Workflow de connexion :**
```typescript
1. Accéder à l'URL secrète (ex: /admin/login)
2. Entrer identifiant (input texte pour sécurité, pas dropdown)
3. Entrer le mot de passe individuel
4. Entrer le code 2FA à 6 chiffres
5. → Si premier login : Redirection forcée vers /admin/change-password
6. → Session JWT valide 24h (cookie httpOnly + SameSite=Strict)
```

**Admins configurés (via seed.ts)** :
- José (mot de passe par défaut : `AnjouExplore2026_José`, secret 2FA unique)
- Fabien (mot de passe par défaut : `AnjouExplore2026_Fabien`, secret 2FA unique)
- Benoît (mot de passe par défaut : `AnjouExplore2026_Benoît`, secret 2FA unique)
- Adrien (mot de passe par défaut : `AnjouExplore2026_Adrien`, secret 2FA unique)

**Gestion des mots de passe** :
- **Premier login** : L'admin doit changer son mot de passe par défaut
- **Changement de mot de passe** : Page `/admin/change-password`
- **Réinitialisation** : Script CLI `bun run admin:reset-password <adminName>`
  - Génère un mot de passe temporaire aléatoire et sécurisé
  - Force le changement au prochain login
  - **Nécessite accès au serveur** (SSH ou kubectl pour Kubernetes)

**Politique de mot de passe** :
- Minimum 12 caractères
- Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&)
- Hash bcrypt avec salt (10 rounds)

**Mode développement vs Production** :
- **2FA en développement** : Peut être désactivé via `ENABLE_2FA="false"` dans .env
- **2FA en production** : TOUJOURS activé (override de ENABLE_2FA si NODE_ENV=production)
- **Mot de passe** : Hash bcrypt TOUJOURS (même en dev)

**Implémentation** :
```typescript
// src/pages/api/auth/login.ts
const is2FAEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_2FA === 'true';

// Vérification mot de passe individuel
const passwordValid = await bcrypt.compare(password, admin.password);
```

**Réinitialisation en production (Kubernetes)** :
```bash
# 1. Se connecter au pod
kubectl exec -it <pod-name> -- /bin/sh

# 2. Exécuter le script de réinitialisation
bun run admin:reset-password José

# 3. Noter le mot de passe temporaire affiché
# 4. Communiquer le mot de passe à l'admin de manière sécurisée
```

### Base de Données

**Modèles Prisma :**

```typescript
// Administrateurs
model Admin {
  id: string
  name: string                // "José", "Fabien", "Benoît", "Adrien"
  secret2FA: string           // Secret Google Authenticator
  password: string            // Hash bcrypt du mot de passe individuel
  mustChangePassword: boolean // Forcer changement au premier login (défaut: true)
  passwordChangedAt: DateTime?// Date du dernier changement
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
├── docs/                   # Documentation détaillée (phases, déploiement, guides)
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
- **Voir** : [GUIDE-IMAGES.md](docs/GUIDE-IMAGES.md) pour les détails complets

**Exemple d'utilisation** :
```astro
---
import { Image } from 'astro:assets';
import heroImage from '../assets/images/homepage/canoe.webp';
---

<Image src={heroImage} alt="Description" loading="lazy" />
```

## Additional Documentation

Ce fichier est le contexte principal du projet. Pour des informations plus détaillées sur des aspects spécifiques :

- **[CLAUDE_PHASES.md](docs/CLAUDE_PHASES.md)** : Historique complet des phases de développement (Phases A-F, Post-Phase F)
  - Infrastructure Backend (Phase A)
  - Authentification Admin (Phase B)
  - Gestion Contacts et Dashboard (Phase C)
  - Gestion Événements et Inscriptions (Phase D)
  - Formulaire Public (Phase E)
  - Paiements SumUp (Phase F)
  - Groupement Réservations Multi-Activités (Post-Phase F)

- **[CLAUDE_DEPLOY.md](docs/CLAUDE_DEPLOY.md)** : Guide de déploiement générique
  - Docker et Docker Compose (configuration générique)
  - Kubernetes (manifests, secrets, deployments)
  - CI/CD avec GitHub Actions
  - Variables d'environnement production
  - Monitoring, Logging, Backups
  - Sécurité et Troubleshooting

- **[CLAUDE_CICD.md](docs/CLAUDE_CICD.md)** : CI/CD spécifique homelab (référence)
  - Gitea Actions (git.ratons.ovh)
  - Harbor Registry (harbor.ratons.ovh)
  - Workflows de build, test, et déploiement
  - Stratégie de tagging Docker
  - Mirroring vers GitHub

- **[CLAUDE_K3S.md](docs/CLAUDE_K3S.md)** : Kubernetes K3s spécifique homelab (référence)
  - K3s cluster (*.ratons.ovh)
  - Traefik ingress controller
  - Authelia SSO/2FA
  - cert-manager (Let's Encrypt)
  - Middlewares et sécurité

## Status Actuel

**Dernière mise à jour** : 3 février 2026

**Phases complétées** :
- ✅ Phase A : Infrastructure Backend (PostgreSQL, Prisma, Docker)
- ✅ Phase B : Authentification Admin (JWT, 2FA, Login)
- ✅ Phase C : Gestion Contacts et Dashboard
- ✅ Phase D : Gestion Événements et Inscriptions
- ✅ Phase E : Formulaire Public et Contact
- ✅ Phase F : Paiements SumUp + Emails Resend
- ✅ Post-Phase F : Groupement Réservations Multi-Activités

**Prochaines phases** :
- Phase G : CI/CD et Déploiement Production (Docker, Kubernetes)
- Tests automatisés (Vitest)
- Monitoring et Logging

### 📋 À faire

#### Phase F+ : Améliorations Paiements (Optionnel)
- [ ] Gestion des remboursements (API SumUp refund)
- [ ] Export CSV des transactions
- [ ] Dashboard analytics revenus
- [ ] Retry automatique paiements échoués
- [ ] Email de rappel si paiement en attente > 24h

#### À venir
- [ ] Page Témoignages
- [ ] Configuration Docker/Kubernetes (production)
- [ ] Environnement "prod locale" (Docker Compose)
  - `docker-compose.prod.yml` : build multi-stage + `NODE_ENV=production` sur la machine de dev
  - Valide : build Docker, cookies Secure/HTTPS, migrations Prisma, variables d'env
  - Script `bun run preview:prod` pour lancer la stack conteneurisée
  - Tunnel ngrok/cloudflared pour tester les webhooks SumUp ponctuellement
- [ ] Tests automatisés (Vitest, stratégie ciblée ~20-30 tests)
  - Priorité 1 : Services / logique métier (`src/lib/services/`) — calculs montants, groupement réservations, transitions de statut
  - Priorité 2 : Routes API (`src/pages/api/`) — auth 401, validation inputs, webhook SumUp (signature, idempotence)
  - Priorité 3 : Utilitaires (`src/lib/utils/`, `src/lib/auth/`) — JWT, validation mot de passe, helpers purs
  - Hors scope : pages .astro statiques, composants Preact UI, queries Prisma simples
- [ ] Linting & Formatting (ESLint + Prettier, config minimale)
  - ESLint : config flat, règles recommandées TypeScript (bugs réels, pas cosmétique)
  - Prettier : formatage automatique uniforme
  - Intégration CI/CD (Phase G)
- [ ] Analytics avec Umami (self-hosted, utilise PostgreSQL existant, GDPR-compliant, script < 2 KB)
  - Déploiement Docker/K3s (`ghcr.io/umami-software/umami:postgresql-latest`)
  - Intégration dashboard admin via API REST Umami (composants Preact StatsCard)

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
