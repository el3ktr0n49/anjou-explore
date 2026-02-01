# Refactorisation Astro Islands + Preact

**Dates** : 30-31 janvier 2026
**Objectif** : Remplacer le code TypeScript vanilla avec manipulation DOM (`innerHTML`) par des composants Preact réactifs et maintenables.

---

## ✅ Ce qui a été fait

### 1. Installation de Preact

```bash
bun astro add preact --yes
```

**Packages ajoutés** :
- `@astrojs/preact@^4.1.3`
- `preact@^10.28.2`

**Configuration automatique** :
- `astro.config.mjs` : Intégration Preact ajoutée
- `tsconfig.json` : JSX configuré pour Preact

---

### 2. Structure des composants créés

```
src/components/admin/
├── types.ts                        # Types TypeScript partagés (Event, Activity, ReservationFull, etc.)
├── ui/                             # Composants UI réutilisables
│   ├── Toast.tsx                   # Notification individuelle
│   ├── ToastContainer.tsx          # Gestionnaire de toasts
│   ├── Modal.tsx                   # Modal réutilisable
│   └── ConfirmDialog.tsx           # Dialog de confirmation
└── islands/                        # Astro Islands (composants interactifs)
    ├── EventDetailsPage.tsx        # 🎯 Page détails événement (/admin/events/[id])
    ├── EventInfoCard.tsx           # Affichage/édition événement
    ├── ActivitiesManager.tsx       # CRUD activités + tarifs
    ├── ActivityCard.tsx            # Card d'une activité
    ├── StatsCard.tsx               # Statistiques événement
    ├── EventsListPage.tsx          # 🎯 Page liste événements (/admin/events)
    ├── ReservationsPage.tsx        # 🎯 Page gestion réservations (/admin/reservations)
    ├── ReservationFilters.tsx      # Filtres réservations
    └── ContactsPage.tsx            # 🎯 Page gestion contacts (/admin/contacts)

src/scripts/admin/                  # Scripts archivés
├── event-details.ts.old            # 1100 lignes → EventDetailsPage.tsx
├── events.ts.old                   # 442 lignes → EventsListPage.tsx
├── reservations.ts.old             # 493 lignes → ReservationsPage.tsx
└── contacts.ts.old                 # 329 lignes → ContactsPage.tsx
```

### 3. Pages admin refactorisées

| Page | Lignes avant | Composant Preact | Statut |
|------|--------------|------------------|--------|
| `/admin/events/[id]` | 1100 | EventDetailsPage.tsx | ✅ Complété (30 jan) |
| `/admin/events` | 442 | EventsListPage.tsx | ✅ Complété (31 jan) |
| `/admin/reservations` | 493 | ReservationsPage.tsx | ✅ Complété (31 jan) |
| `/admin/contacts` | 329 | ContactsPage.tsx | ✅ Complété (31 jan) |

**Total refactorisé** : 2364 lignes de TypeScript vanilla → 4 composants Preact réactifs

---

### 3. Avantages de la nouvelle architecture

#### ✅ Avant (TypeScript vanilla)
```typescript
// ❌ Manipulation DOM manuelle
tbody.innerHTML = events.map(event => `
  <tr>
    <td>${escapeHtml(event.name)}</td>
    ...
  </tr>
`).join('');

// ❌ Event listeners attachés manuellement
document.querySelectorAll('[data-action="delete"]').forEach(btn => {
  btn.addEventListener('click', () => deleteEvent(...));
});
```

**Problèmes** :
- État global mutable (`let event = null`)
- Code HTML dans des strings (pas de validation)
- Event listeners à gérer manuellement
- Difficile à tester et maintenir
- Pas de réactivité

#### ✅ Après (Preact)
```tsx
// ✅ Composant déclaratif
export default function ActivityCard({ activity, onEdit, onDelete }) {
  return (
    <div class="activity-card">
      <h3>{activity.name}</h3>
      <button onClick={onEdit}>✏️</button>
      <button onClick={onDelete}>🗑️</button>
    </div>
  );
}
```

**Avantages** :
- ✅ État encapsulé avec `useState`
- ✅ HTML typé avec JSX/TSX
- ✅ Event handlers déclaratifs
- ✅ Composants testables
- ✅ Réactivité automatique
- ✅ Type-safety complète
- ✅ Seulement 3kb (Preact vs 45kb React)

---

### 4. Pattern Astro Islands

**Page [id].astro** (SSR) :
```astro
---
import EventDetailsPage from '../../../components/admin/islands/EventDetailsPage';

// Fetch initial data (SSR)
const eventId = Astro.params.id;
---

<Layout>
  {/* Astro Island : Devient interactif côté client */}
  <EventDetailsPage client:load eventId={eventId} />
</Layout>
```

**Directives client:** disponibles :
- `client:load` : Hydrate immédiatement (utilisé ici)
- `client:idle` : Hydrate quand le navigateur est idle
- `client:visible` : Hydrate quand visible dans le viewport

---

### 5. Flux de données

```
EventDetailsPage (State manager)
├── loadEvent() → fetch API
├── handleUpdateEvent() → PUT /api/admin/events/:id
│   └── EventInfoCard
│       ├── Mode affichage
│       └── Mode édition (formulaire)
├── handleReload() → Rafraîchit après CRUD
│   └── ActivitiesManager
│       ├── ActivityCard[] (liste)
│       ├── Modal (création/édition activité)
│       ├── Modal (ajout tarif)
│       └── ConfirmDialog (suppressions)
└── StatsCard (calculs en temps réel)
```

---

### 6. Gestion de l'état

**Avant** : Variables globales
```typescript
let event: Event | null = null;
let isEditingEvent = false;
let currentActivityId: string | null = null;
```

**Après** : Hooks Preact
```tsx
const [event, setEvent] = useState<Event | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [activityForm, setActivityForm] = useState<ActivityFormData>({...});
```

**Réactivité automatique** : Quand `setEvent()` est appelé, tous les composants enfants qui utilisent `event` se re-render automatiquement.

---

### 7. Système Toast amélioré

**Avant** : Fonction standalone avec manipulation DOM
```typescript
function showToast(message: string, type: ToastType) {
  const toast = document.createElement('div');
  toast.innerHTML = `...`;
  container.appendChild(toast);
}
```

**Après** : Composant géré par état
```tsx
<ToastContainer onToastEmit={handleToastEmit} />

// Usage
showToast('Événement mis à jour', 'success');
```

**Avantages** :
- Gestion automatique du lifecycle (auto-hide après 5s)
- Animations fluides avec transitions CSS
- Stack de toasts multiples

---

### 8. Modals et Dialogs

**Pattern de composition** :
```tsx
<Modal isOpen={isModalOpen} onClose={closeModal} title="Nouvelle activité">
  <form onSubmit={handleSubmit}>
    <input type="text" value={form.name} onInput={...} />
    <button type="submit">Enregistrer</button>
  </form>
</Modal>
```

**Features** :
- Fermeture sur `Escape`
- Fermeture sur clic overlay
- Prévention du scroll body
- Props typées strictement

---

## 🧪 Comment tester

### 1. Démarrer le serveur dev

```bash
bun run dev
```

### 2. Tester la page événement

1. **Connexion** : `/admin/login`
2. **Liste événements** : `/admin/events`
3. **Détails événement** : `/admin/events/[uuid]`

### 3. Vérifier les fonctionnalités

#### ✅ Informations événement
- Affichage des infos (mode lecture)
- Bouton "Modifier" → Passe en mode édition
- Formulaire d'édition avec tous les champs
- Bouton "Annuler" → Retour mode lecture
- Bouton "Enregistrer" → Mise à jour via API

#### ✅ Activités
- Liste des activités avec tarifs
- Bouton "Nouvelle activité" → Modal création
- Bouton "✏️" sur activité → Modal édition
- Bouton "🗑️" sur activité → ConfirmDialog puis suppression
- Bouton "➕ Ajouter tarif" → Modal ajout tarif
- Bouton "✕" sur tarif → ConfirmDialog puis suppression

#### ✅ Toast notifications
- Toast vert "success" après actions réussies
- Toast rouge "error" en cas d'erreur
- Auto-hide après 5 secondes
- Bouton fermeture manuelle "✕"

#### ✅ Stats
- Nombre de réservations
- Nombre de participants
- Revenus payés (calcul automatique)

---

## 🎨 Styles CSS

**Conservés depuis l'ancienne version** :
- Tous les styles globaux dans `<style is:global>` de [id].astro
- Classes réutilisables : `.modal`, `.toast`, `.activity-card`, `.badge`, etc.
- Animations : `fadeIn`, `slideIn`, `slideOut`

**Pourquoi ?**
- Styles déjà bien conçus et testés
- Cohérence avec le reste du site Anjou Explore
- Preact utilise directement ces classes CSS

---

## 📦 Bundle Size

**Preact vs React** :
- Preact : **3kb** gzipped
- React : 45kb gzipped

**Performance** :
- Hydratation ultra-rapide
- Virtual DOM optimisé
- API identique à React (migration facile si besoin)

---

## 📄 Détails des pages refactorisées

### EventsListPage (`/admin/events`)
**Refactorisé le** : 31 janvier 2026

**Fonctionnalités** :
- Liste tous les événements avec pagination
- Filtre par statut (DRAFT, OPEN, CLOSED, ARCHIVED)
- Actions : Voir détails, Supprimer événement
- Bouton "Nouvel Événement" (redirige vers `/admin/events/new`)
- Badges de statut colorés
- Protection suppression si réservations existent

**Composant** : `EventsListPage.tsx` (320 lignes)
- State : events, loading, statusFilter, totalEvents
- Toast notifications + ConfirmDialog
- Animations fadeIn sur les lignes

### ReservationsPage (`/admin/reservations`)
**Refactorisé le** : 31 janvier 2026

**Fonctionnalités** :
- Liste toutes les réservations avec filtres multiples
- Filtre par statut paiement (PENDING, PAID, FAILED, REFUNDED, CANCELLED)
- Filtre par événement (dropdown dynamique)
- Filtre par archivage (Actives, Archivées, Toutes)
- Actions : Marquer comme payé (manuel), Rembourser, Archiver, Restaurer, Supprimer
- Export CSV complet
- Protection paiement manuel si transaction SumUp active

**Composants** :
- `ReservationsPage.tsx` (580 lignes) - Orchestrateur principal
- `ReservationFilters.tsx` (120 lignes) - Filtres contrôlés

**Particularités** :
- Gestion intelligente des transactions SumUp
- Double confirmation pour suppression définitive
- Bouton "Payé" désactivé si transaction SumUp en cours (avec tooltip)
- Total montant calculé en temps réel

### ContactsPage (`/admin/contacts`)
**Refactorisé le** : 31 janvier 2026

**Fonctionnalités** :
- Liste toutes les demandes de contact et réservations aventure
- Filtre par statut (NEW, PROCESSED, ARCHIVED)
- Filtre par type (Contact simple, Demande réservation)
- Actions : Voir message, Marquer comme traité, Archiver, Supprimer
- **Système de lignes extensibles** : Clic sur 👁️ affiche message complet
- bookingData affiché en grille si réservation aventure

**Composant** : `ContactsPage.tsx` (400 lignes)
- State : contacts, expandedRowId (gestion lignes extensibles)
- Badges de type (contact / réservation)
- Message préservé avec formatage (white-space: pre-wrap)

**Particularités** :
- Une seule ligne extensible à la fois
- Bouton fermeture dans ligne étendue
- Affichage conditionnel de bookingData
- CSS séparé dans `src/styles/admin/contacts.css`

---

## 🔄 Migration d'autres pages (COMPLÉTÉ)

✅ **Toutes les pages admin ont été refactorisées** :
- `/admin/events/[id]` - Détails événement
- `/admin/events` - Liste événements
- `/admin/reservations` - Gestion réservations
- `/admin/contacts` - Gestion contacts

Pour référence, voici le pattern utilisé :

### 1. Créer les composants Preact

```tsx
// src/components/admin/islands/ContactsManager.tsx
export default function ContactsManager({ initialContacts }) {
  const [contacts, setContacts] = useState(initialContacts);
  // ...
}
```

### 2. Refactoriser la page .astro

```astro
---
import ContactsManager from '../../components/admin/islands/ContactsManager';
---

<Layout>
  <ContactsManager client:load initialContacts={contacts} />
</Layout>
```

### 3. Réutiliser les composants UI

```tsx
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import ToastContainer from '../ui/ToastContainer';
```

---

## 🚀 Prochaines étapes possibles

✅ **Toutes les pages admin sont refactorisées !**

Les améliorations futures peuvent inclure :

### 1. Ajouter tests unitaires
```bash
bun add -d @testing-library/preact vitest
```

**Exemple de test** :
```typescript
import { render, fireEvent } from '@testing-library/preact';
import EventsListPage from '../islands/EventsListPage';

test('should filter events by status', async () => {
  const { getByLabelText } = render(<EventsListPage />);
  const select = getByLabelText('Statut');
  fireEvent.change(select, { target: { value: 'OPEN' } });
  // Assert filtered results
});
```

### 2. CSS Modules (optionnel)
Actuellement, les styles sont en CSS global (`.badge`, `.btn-action`, etc.). On pourrait migrer vers CSS Modules pour éviter les conflits de noms :

```tsx
// ActivityCard.module.css
import styles from './ActivityCard.module.css';

<div className={styles.card}>...</div>
```

**Avantages** :
- Scoped styles (pas de conflits)
- Tree-shaking CSS
- TypeScript autocomplete pour les classes

**Inconvénients** :
- Styles actuels fonctionnent bien
- Cohérence avec le reste du site Anjou Explore

### 3. Optimisations performances
- Lazy loading pour modals (charger uniquement quand ouvert)
- Virtual scrolling pour listes très longues (ex: 1000+ réservations)
- React.memo pour éviter re-renders inutiles

### 4. Améliorer l'accessibilité (a11y)
- Ajouter aria-labels sur tous les boutons d'action
- Navigation au clavier dans les tableaux
- Focus management dans les modals
- Annonces screen reader pour les toasts

---

## 🐛 Troubleshooting

### Erreur : "h is not defined"
**Solution** : Ajouter `import { h } from 'preact'` en haut du fichier .tsx

### Erreur : Types JSX
**Solution** : Vérifier `tsconfig.json` :
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

### Modal ne se ferme pas
**Solution** : Vérifier que `isOpen` est bien géré par `useState` et que `onClose` appelle `setIsOpen(false)`

### Toast ne s'affiche pas
**Solution** : Vérifier que `ToastContainer` est bien monté et que `onToastEmit` est appelé

---

## 📚 Ressources

- [Documentation Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [Documentation Preact](https://preactjs.com/)
- [Astro + Preact Integration](https://docs.astro.build/en/guides/integrations-guide/preact/)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks/)

---

## ✨ Résumé

**Avant** : 2364 lignes de TypeScript vanilla avec manipulation DOM manuelle (4 pages admin)
**Après** : Code modulaire, typé, réactif et maintenable avec Preact

**Pages refactorisées** :
- ✅ `/admin/events/[id]` : 1100 lignes → EventDetailsPage.tsx + 4 sous-composants
- ✅ `/admin/events` : 442 lignes → EventsListPage.tsx
- ✅ `/admin/reservations` : 493 lignes → ReservationsPage.tsx + ReservationFilters.tsx
- ✅ `/admin/contacts` : 329 lignes → ContactsPage.tsx

**Composants créés** :
- 4 composants UI réutilisables (Toast, ToastContainer, Modal, ConfirmDialog)
- 4 pages principales (EventDetailsPage, EventsListPage, ReservationsPage, ContactsPage)
- 5 sous-composants (EventInfoCard, ActivitiesManager, ActivityCard, StatsCard, ReservationFilters)

**Gains** :
- ✅ Séparation claire HTML/JS/CSS
- ✅ Type-safety complète avec TypeScript
- ✅ Composants réutilisables (DRY)
- ✅ Testabilité améliorée (composants isolés)
- ✅ Réactivité automatique (useState/useEffect)
- ✅ Bundle ultra-léger (3kb Preact vs 45kb React)
- ✅ Meilleure DX (Developer Experience)
- ✅ Maintenance facilitée (code modulaire)

🎉 **La philosophie Astro Islands est respectée !**
- Server-Side Rendering par défaut
- Hydratation sélective avec `client:load`
- JavaScript uniquement où nécessaire
