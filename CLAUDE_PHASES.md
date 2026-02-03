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

#### Phase F : Paiements SumUp (✅ Complété - 1er février 2026)

**Intégration complète des paiements SumUp avec emails de confirmation Resend**

**Objectif** : Permettre aux utilisateurs de payer en ligne leurs réservations via SumUp hosted checkout.

**Architecture Implémentée** :

```
Utilisateur remplit formulaire → Création Reservation (PENDING)
→ Initialisation checkout SumUp → Redirection vers page paiement SumUp
→ Utilisateur paye → Webhook callback → Mise à jour Reservation (PAID)
→ Email confirmation Resend
```

**Fichiers créés** :

1. **Service SumUp** : `src/lib/services/sumupService.ts`
   - `createCheckout()` : Crée un checkout avec hosted checkout activé
   - `getCheckout()` : Récupère le statut d'un checkout
   - `isCheckoutPaid()` : Vérifie si payé
   - Types : `SumUpCheckoutRequest`, `SumUpCheckoutResponse`, `SumUpCheckoutDetails`

2. **Endpoint Checkout** : `src/pages/api/public/payments/checkout.ts`
   - `POST /api/public/payments/checkout`
   - Body : `{ reservationId: string }`
   - Crée checkout SumUp + `PaymentTransaction` (INITIATED)
   - Retourne : `{ checkoutUrl, checkoutId }`
   - Protections : Vérifie pas déjà payé, réutilise transaction < 1h

3. **Webhook SumUp** : `src/pages/api/webhooks/sumup.ts`
   - `POST /api/webhooks/sumup`
   - Reçoit notification de SumUp (payload flexible)
   - Vérifie statut réel via API (sécurité)
   - Met à jour `PaymentTransaction` et `Reservation`
   - Envoie email si PAID

4. **Service Email** : `src/lib/email/templates.ts`
   - `sendPaymentConfirmationEmail()` : Email HTML élégant
   - `sendPaymentFailedEmail()` : Email d'échec (optionnel)
   - Template responsive avec gradient or/olive
   - Helpers : `formatDate()`, `formatAmount()`, `formatParticipants()`

5. **Page de retour** : `src/pages/payment/return.astro`
   - Route : `/payment/return?reservationId=xxx`
   - Affiche statut : PAID (succès) | PENDING (attente) | FAILED (échec) | NOT FOUND
   - Design avec cards et gradients selon statut
   - Boutons : Retour accueil, Voir événement, Réessayer

6. **Script modifié** : `src/scripts/inscription-event.ts`
   - Après création réservation : Initialise paiement SumUp
   - Redirection automatique vers `checkoutUrl`

**Variables d'environnement** :
```bash
# IMPORTANT : Utiliser sup_sk_xxx (Secret Key), pas sup_pk_xxx (Public Key)
SUMUP_API_KEY="sup_sk_KRAfX9QRo5yPKa4wf2NUNvULyDIiopDCP"  # Secret Key (compte sandbox)
SUMUP_MERCHANT_CODE="M74XACCM"  # Code marchand (prioritaire sur pay_to_email)
SUMUP_PAY_TO_EMAIL="adrienlem2@gmail.com"  # Email marchand (fallback)
RESEND_API_KEY="re_aEx279DP_NNq7FN296riUJk25GzcrAkEb"
EMAIL_FROM="anjouexplore@gmail.com"
```

**Workflow Complet** :

1. Utilisateur remplit formulaire → `POST /api/public/reservations/create`
2. Réservation créée (PENDING) → Frontend appelle `POST /api/public/payments/checkout`
3. Backend crée checkout SumUp → Retourne `checkoutUrl`
4. Frontend redirige vers SumUp hosted page
5. Utilisateur paye (carte test : `4242 4242 4242 4242`)
6. SumUp traite paiement → Envoie webhook à notre backend
7. Webhook vérifie statut → Met à jour BDD → Envoie email
8. SumUp redirige vers `/payment/return?reservationId=xxx`
9. Page affiche "Paiement réussi !" avec détails

**Statuts PaymentTransaction** :
- `INITIATED` : Checkout créé, en attente de paiement
- `PENDING` : Paiement en cours
- `COMPLETED` : Paiement réussi
- `FAILED` : Paiement échoué
- `EXPIRED` : Checkout expiré (pas payé après 1h)
- `CANCELLED` : Annulé par l'utilisateur

**Correctifs et améliorations** :

1. **Clé API SumUp** (Problème initial 401 Unauthorized)
   - ❌ Problème : `sup_pk_xxx` (Public Key) → Erreur 401
   - ✅ Solution : `sup_sk_xxx` (Secret Key) pour appels serveur-side
   - Test curl validé avec la vraie clé

2. **Paramètre requis `pay_to_email`**
   - ❌ Problème : Erreur "Validation error: pay_to_email or merchant_code"
   - ✅ Solution : Ajout de `pay_to_email` dans la requête checkout
   - Référence : [sumupService.ts](src/lib/services/sumupService.ts:85)

3. **Priorité `merchant_code` > `pay_to_email`**
   - 🎯 Objectif : Cibler précisément le compte sandbox "anjou-explore" (M74XACCM)
   - ✅ Solution : Logique conditionnelle avec priorité merchant_code
   - Évite confusion avec compte principal "Ratons" (M2C95PTG)
   ```typescript
   ...(SUMUP_MERCHANT_CODE
     ? { merchant_code: SUMUP_MERCHANT_CODE }
     : { pay_to_email: SUMUP_PAY_TO_EMAIL })
   ```

4. **Webhook ne fonctionne pas en local** (Problème fondamental)
   - ❌ Problème : localhost non accessible par SumUp
   - ✅ Solution : Endpoint de fallback `/api/public/payments/check-status`
   - Vérifie le statut via API SumUp directement
   - Auto-refresh sur page de retour si status = "pending"
   - Script vérifie toutes les 3 secondes pendant 30 secondes

5. **Vérification sécurisée du statut** (Conformité SumUp)
   - 🔒 Implémentation : "Always verify if the event really took place"
   - Webhook appelle `getCheckout(checkoutId)` avant de mettre à jour la BDD
   - Protection contre webhooks falsifiés et attaques MITM
   - Référence : [webhooks/sumup.ts](src/pages/api/webhooks/sumup.ts:68-70)

**Fichiers supplémentaires créés** :
- `src/pages/api/public/payments/check-status.ts` - Fallback pour dev local
- `src/pages/payment/mock-checkout.astro` - Simulateur (non utilisé finalement)
- `src/lib/services/sumupService.mock.ts` - Mock service (non utilisé finalement)

**Tests** :
- ✅ Création checkout et redirection SumUp (vraie page hébergée)
- ✅ Paiement test réussi (carte `4242 4242 4242 4242`)
- ✅ Fallback check-status fonctionne en dev local
- ✅ Page retour se rafraîchit automatiquement après vérification
- ✅ BDD mise à jour (`Reservation.paymentStatus = PAID`)
- ✅ `PaymentTransaction` créée et complétée
- ✅ Email de confirmation Resend envoyé
- ✅ Merchant code correct (anjou-explore M74XACCM)

**Mode Test vs Production** :
- Test : `sup_pk_...` (Public Key), carte `4242 4242 4242 4242`, montant 11.00 = échec intentionnel
- Prod : `sup_sk_...` (Secret Key), vraies cartes, webhook configuré sur SumUp Dashboard

**Documentation complète** :
- [`PHASE_F_TESTS.md`](PHASE_F_TESTS.md) : Guide de test détaillé (10 tests)
- [`PHASE_F_SUMMARY.md`](PHASE_F_SUMMARY.md) : Récapitulatif complet de la phase

**Documentation complète** :
- [`PHASE_F_TESTS.md`](PHASE_F_TESTS.md) : Guide de test détaillé (10 tests)
- [`PHASE_F_SUMMARY.md`](PHASE_F_SUMMARY.md) : Récapitulatif technique complet

**Notes de développement** :
- En dev local : Webhook ne fonctionne pas (localhost), fallback check-status activé
- En production : Configurer webhook URL sur SumUp Dashboard
- Secret Key vs Public Key : Toujours utiliser `sup_sk_xxx` pour backend
- Vérification sécurisée : Toujours appeler API SumUp après webhook
- Merchant code : Permet de cibler précisément un compte (multi-comptes SumUp)

**Dernier commit Phase F** : `feat(phase-f): intégration complète paiements SumUp + emails Resend`

---

#### Améliorations Post-Phase F : Groupement Réservations Multi-Activités (✅ Complété - 3 février 2026)

**Contexte** : Après la Phase F, un bug a été découvert lors du test des réservations multi-activités. Seule une réservation était créée au lieu d'une par activité, causant une structure de données incorrecte. De plus, l'interface admin affichait plusieurs lignes dupliquées pour une même personne ayant réservé plusieurs activités, créant de la confusion.

**Solution Implémentée** :

1. **Refactorisation Complète du Système de Réservation** :
   - Ajout du champ `groupId` (UUID) dans le modèle `Reservation` (Prisma)
   - Modification de l'API `/api/public/reservations/create` : création d'une ligne par activité avec `groupId` partagé
   - Une réservation multi-activités génère maintenant N lignes en base avec le même `groupId`
   - Index ajouté sur `groupId` pour performances

2. **Adaptation Paiements SumUp** :
   - `/api/public/payments/checkout` : Accepte `groupId` OU `reservationId`
   - Récupère toutes les réservations du groupe pour calculer le montant total
   - Crée une `PaymentTransaction` pour chaque réservation du groupe (même `checkoutId`)
   - `/api/webhooks/sumup` : Met à jour toutes les transactions avec le même `checkoutId`
   - `/api/public/payments/check-status` : Vérifie et met à jour toutes les réservations du groupe

3. **Amélioration Email de Confirmation** :
   - Ajout du paramètre `activities` dans `sendPaymentConfirmationEmail()`
   - Template HTML affiche maintenant chaque activité séparément avec ses participants et montant
   - Design avec cards individuelles pour chaque activité
   - Montant total affiché en footer
   - Espacement corrigé (padding au lieu de gap pour compatibilité email clients)

4. **Page de Retour Paiement** :
   - Accepte `groupId` en plus de `reservationId`
   - Affiche toutes les activités réservées avec détails
   - Script auto-check fonctionne avec les deux paramètres

5. **Groupement Interface Admin** (Principal apport UX) :
   - Création du type `GroupedReservation` pour agréger les données
   - Fonction `groupReservations()` : groupe par `groupId`, calcule montants totaux et statuts consolidés
   - **Affichage simplifié** : Une seule ligne par personne dans le tableau
     - Date, Événement, Nom, Email : affichés une seule fois
     - Colonne "Activités" : liste toutes les activités (ex: • rando papilles • le défi)
     - Colonne "Participants" : liste les participants par activité
     - Colonne "Montant Total" : somme de toutes les activités
   - **Actions groupées** : Les boutons (Payé, Archiver, Supprimer) affectent toutes les réservations du groupe
   - **Statut consolidé** : PAID si toutes payées, FAILED si au moins une échouée, sinon premier statut
   - Fix filtre événement : Ajout de `event.id` et `activity` dans l'API

**Fichiers modifiés** :
```
prisma/schema.prisma                           # Ajout groupId + index
src/pages/api/public/reservations/create.ts    # Création multi-lignes avec groupId
src/pages/api/public/payments/checkout.ts      # Support groupId
src/pages/api/webhooks/sumup.ts                # Gestion groupes
src/pages/api/public/payments/check-status.ts  # Gestion groupes
src/pages/payment/return.astro                 # Affichage groupes
src/lib/email/templates.ts                     # Template multi-activités
src/components/admin/types.ts                  # Ajout groupId au type ReservationFull
src/components/admin/islands/ReservationsPage.tsx  # Logique groupement + affichage
src/pages/api/admin/reservations.ts            # Ajout event.id et activity
```

**Exemple Visuel** :

Avant (confus) :
```
| Date       | Nom           | Email          | Activité         | Montant |
|------------|---------------|----------------|------------------|---------|
| 03/02/2026 | José Dupont   | jose@test.com  | rando papilles   | 90€     |
| 03/02/2026 | José Dupont   | jose@test.com  | le défi          | 100€    |
```

Après (clair) :
```
| Date       | Nom           | Email          | Activités           | Montant Total |
|------------|---------------|----------------|---------------------|---------------|
| 03/02/2026 | José Dupont   | jose@test.com  | • rando papilles    | 190€          |
|            |               |                | • le défi           |               |
```

**Tests réalisés** :
- ✅ Réservation multi-activités crée N lignes en BDD avec même `groupId`
- ✅ Paiement SumUp fonctionne pour groupes (montant total correct)
- ✅ Webhook met à jour toutes les réservations du groupe
- ✅ Email affiche toutes les activités séparément
- ✅ Interface admin affiche une seule ligne par personne
- ✅ Actions admin (Payé, Archiver, Supprimer) affectent tout le groupe
- ✅ Filtre événement fonctionne sans erreur 400

**Dernier commit** : `feat(admin): groupement réservations multi-activités par groupId`

---

