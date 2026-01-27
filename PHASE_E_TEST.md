# Phase E - Test du Formulaire de Contact

## Ce qui a été implémenté

### 1. Endpoint API `POST /api/public/contact`
- **Fichier** : `src/pages/api/public/contact.ts`
- **Validation Zod** : name, email, phone, message, isBooking, bookingData
- **Logique** :
  - Si `isBooking = false` : Simple demande de renseignement
  - Si `isBooking = true` : Demande de réservation aventure (avec participants, duration, formula)
  - Insertion en base via Prisma dans `contact_requests`
  - Status par défaut : `NEW`

### 2. Modification du script TypeScript
- **Fichier** : `src/scripts/formulaire-groupe.ts`
- **Changements** :
  - Envoi des données vers `/api/public/contact` via `fetch()`
  - Gestion des erreurs (network, validation, serveur)
  - Messages de succès/erreur avec styles appropriés
  - Désactivation du bouton pendant l'envoi
  - Reset du formulaire après succès

## Guide de Test

### 1. Démarrer le serveur
```bash
bun run dev
```
Le serveur démarre sur `http://localhost:4321/`

### 2. Accéder au formulaire
Ouvrir : `http://localhost:4321/formulaire-groupe`

### 3. Test #1 : Demande de contact simple
1. Remplir :
   - Nom : Jean Dupont
   - Email : jean@example.com
   - Téléphone : 0612345678
   - Message : "Je souhaite des renseignements sur vos escapades"
2. **NE PAS cocher** "Je souhaite réserver une formule d'aventure"
3. Cliquer "Envoyer ma demande"
4. **Résultat attendu** :
   - Message vert : "Votre message a été envoyé avec succès."
   - Formulaire réinitialisé
   - Ligne créée en base avec `isBooking = false`, `bookingData = null`

### 4. Test #2 : Demande de réservation aventure
1. Remplir :
   - Nom : Marie Martin
   - Email : marie@example.com
   - Téléphone : 0698765432
   - Message : "Nous sommes un groupe de 8 personnes"
2. **Cocher** "Je souhaite réserver une formule d'aventure"
3. Remplir les champs supplémentaires :
   - Participants : 8
   - Durée : "2 jours & 1 nuit en bivouac"
   - Formule : "All Inclusive"
4. Cliquer "Envoyer ma demande"
5. **Résultat attendu** :
   - Message vert : "Votre demande de réservation a été envoyée avec succès."
   - Formulaire réinitialisé
   - Ligne créée avec `isBooking = true`, `bookingData = { participants: 8, duration: "2jours", formula: "all-inclusive" }`

### 5. Vérifier en base de données
```bash
bun run db:studio
```
Ouvrir : `http://localhost:5555`
- Aller dans **ContactRequest**
- Vérifier que les 2 lignes sont créées
- Vérifier les champs `isBooking` et `bookingData`

### 6. Vérifier dans l'admin
```bash
# Ouvrir dans le navigateur
http://localhost:4321/admin/login
```
1. Se connecter avec un admin
2. Aller dans "Demandes de contact"
3. Les 2 demandes doivent apparaître :
   - Une avec badge "Contact"
   - Une avec badge "Réservation"
4. Cliquer sur 👁️ pour voir les détails
   - Pour la réservation, les données `bookingData` doivent s'afficher en grid

## Cas d'erreur à tester

### Test #3 : Validation email invalide
- Email : "invalid-email"
- **Attendu** : Message rouge "Une erreur s'est produite. Veuillez réessayer."

### Test #4 : Réservation incomplète
- Cocher "Je souhaite réserver"
- Ne remplir que le nombre de participants (pas la durée ni la formule)
- **Attendu** : Message rouge avec détails de validation

### Test #5 : Message vide
- Laisser le champ "Message" vide
- **Attendu** : Validation HTML (required) empêche la soumission

## API Response Examples

### Succès (Contact simple)
```json
{
  "success": true,
  "contactId": "uuid-here",
  "message": "Votre message a été envoyé avec succès."
}
```

### Succès (Réservation)
```json
{
  "success": true,
  "contactId": "uuid-here",
  "message": "Votre demande de réservation a été envoyée avec succès."
}
```

### Erreur (Validation)
```json
{
  "error": "Données invalides",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "email": ["Email invalide"]
    }
  }
}
```

### Erreur (Réservation incomplète)
```json
{
  "error": "Données de réservation incomplètes",
  "message": "Pour une réservation, vous devez renseigner le nombre de participants, la durée et la formule."
}
```

## Structure de Données en Base

### ContactRequest (Table: contact_requests)
```typescript
{
  id: "uuid",
  nom: "Jean Dupont",
  email: "jean@example.com",
  telephone: "0612345678",
  message: "Je souhaite des renseignements...",
  isBooking: false,
  bookingData: null, // ou { participants: 8, duration: "2jours", formula: "all-inclusive" }
  status: "NEW",
  processedBy: null,
  processedAt: null,
  createdAt: "2026-01-28T00:00:00.000Z",
  updatedAt: "2026-01-28T00:00:00.000Z"
}
```

## Prochaines Étapes (Optionnel - Hors Phase E)

### Email de Confirmation (Resend)
- [ ] Créer template email pour confirmation utilisateur
- [ ] Créer template email pour notification admin
- [ ] Intégrer Resend dans l'endpoint `/api/public/contact`

### Améliorations UX
- [ ] Ajouter un loader/spinner pendant l'envoi
- [ ] Ajouter un indicateur de progression
- [ ] Validation côté client (en plus du serveur)

## Notes Importantes

1. **Distinction Réservations** :
   - **ContactRequest** (cette phase) : Demande de renseignements pour aventure groupe
   - **Reservation** (Phase F) : Inscription événement avec paiement SumUp

2. **Pas de paiement dans Phase E** : Le formulaire `/formulaire-groupe` ne gère PAS de paiement

3. **Compatibilité avec Phase C** : Les demandes créées ici apparaissent dans `/admin/contacts` (déjà fonctionnel)
