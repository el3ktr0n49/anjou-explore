# Phase D - Guide de Test

## Guide de test pour les Étapes 4-6 de la Phase D

Ce guide vous permettre de tester le système complet d'inscriptions aux événements.

---

## Prérequis

1. **Base de données** : Assurez-vous que PostgreSQL est lancé
   ```bash
   docker-compose up -d
   ```

2. **Seed data** : Vérifiez que vous avez des événements de test
   ```bash
   bun run db:seed
   ```

3. **Serveur** : Démarrez le serveur de développement
   ```bash
   bun run dev
   ```

---

## Test 1 : Activer les inscriptions pour AE6

Pour tester le formulaire d'inscriptions, nous devons d'abord ouvrir les inscriptions pour l'événement AE6.

### Option A : Via Prisma Studio

1. Ouvrir Prisma Studio :
   ```bash
   bun run db:studio
   ```

2. Aller dans la table `Event`

3. Trouver l'événement avec `slug = "ae6"`

4. Modifier les champs :
   - `status` : `OPEN`
   - `registrationOpenOverride` : `true` (pour forcer l'ouverture)

5. Sauvegarder

### Option B : Via l'interface admin

1. Se connecter : http://localhost:4321/admin/login

2. Aller dans **Événements**

3. Cliquer sur l'icône 👁️ de l'événement AE6

4. Cliquer sur **✏️ Modifier** (en haut)

5. Changer :
   - Statut : `OPEN`
   - Cocher "Forcer ouverture inscriptions"

6. Sauvegarder

---

## Test 2 : Vérifier la page événement AE6

1. Aller sur : http://localhost:4321/evenements/ae6

2. **Vérifications** :
   - ✅ Le badge en haut doit afficher : **"✅ Inscriptions ouvertes"** (vert)
   - ✅ Le bouton en bas doit afficher : **"📝 S'inscrire maintenant"** (or/olive)
   - ✅ Le bouton doit être cliquable (pas désactivé)

3. Cliquer sur **"S'inscrire maintenant"**

---

## Test 3 : Page d'inscriptions

URL : http://localhost:4321/evenements/ae6/inscriptions

### Vérifications visuelles

- ✅ Hero avec le nom de l'événement ("Anjou Explore #6")
- ✅ Date affichée correctement
- ✅ Formulaire visible avec tous les champs
- ✅ Liste des activités générée dynamiquement depuis la BDD
- ✅ Pour chaque activité, les tarifs sont affichés (adulte, enfant...)
- ✅ Total affiché : **0.00€** par défaut
- ✅ Résumé : **"Aucun participant sélectionné"**
- ✅ Bouton **"Réserver"** désactivé (grisé)

### Test du calcul en temps réel

1. Augmenter la quantité pour "Adulte" dans l'activité "Rando Papilles"
   - **Attendu** : Le total se met à jour immédiatement
   - **Attendu** : Le résumé affiche "X participant(s) sélectionné(s)"
   - **Attendu** : Le bouton "Réserver" devient actif

2. Ajouter d'autres participants (enfants, autres activités)
   - **Attendu** : Le total cumule correctement tous les tarifs

3. Remettre toutes les quantités à 0
   - **Attendu** : Total retourne à 0.00€
   - **Attendu** : Bouton "Réserver" redevient désactivé

---

## Test 4 : Soumission du formulaire

### Test 4.1 : Validation des champs obligatoires

1. Cliquer sur **"Réserver"** sans remplir les champs
   - **Attendu** : Message d'erreur navigateur pour champs requis

2. Remplir seulement le nom et prénom, cliquer "Réserver"
   - **Attendu** : Message d'erreur pour email requis

3. Remplir email invalide (ex: "test"), cliquer "Réserver"
   - **Attendu** : Message d'erreur pour format email

### Test 4.2 : Validation "Aucun participant"

1. Remplir tous les champs personnels (nom, prénom, email, téléphone)

2. NE PAS sélectionner de participants (quantités à 0)

3. Cliquer sur "Réserver"
   - **Attendu** : Message d'erreur : "Veuillez sélectionner au moins un participant"

### Test 4.3 : Création réussie d'une réservation

1. Remplir le formulaire :
   - **Prénom** : Jean
   - **Nom** : Dupont
   - **Email** : jean.dupont@example.com
   - **Téléphone** : 0612345678

2. Sélectionner :
   - 2 adultes pour "Rando Papilles" (par exemple)
   - 1 enfant pour "Rando Papilles"

3. Vérifier que le total est correct

4. Cliquer sur **"Réserver"**

5. **Attendu** :
   - Le bouton affiche "Envoi en cours..." et est désactivé
   - Après ~1 seconde, message de succès vert : "✅ Réservation confirmée ! Montant : XX.XX€..."
   - Le formulaire est reset (tous les champs vides)
   - Le total retourne à 0.00€
   - La page scroll en haut automatiquement

6. **Vérifier en BDD** :
   - Aller dans Prisma Studio : http://localhost:5555
   - Table `Reservation`
   - Vérifier qu'une nouvelle réservation existe avec :
     - `nom` : "Dupont"
     - `prenom` : "Jean"
     - `email` : "jean.dupont@example.com"
     - `paymentStatus` : "PENDING"
     - `amount` : montant correct
     - `participants` : JSON avec les quantités

---

## Test 5 : Vérification des capacités

### Test 5.1 : Affichage des capacités limitées

1. Aller dans Prisma Studio

2. Table `Activity`, trouver l'activité "Rando Papilles"

3. Modifier `maxParticipants` : mettre `20` (par exemple)

4. Sauvegarder

5. Recharger le formulaire d'inscriptions

6. **Attendu** :
   - L'activité affiche "Limité à 20 participants"
   - Aucun message "Complet"
   - Les champs de saisie sont actifs (pas grisés)

### Test 5.2 : Alerte places limitées

1. Créer manuellement des réservations dans Prisma Studio pour qu'il reste **8 places** pour "Rando Papilles"

2. Recharger le formulaire

3. **Attendu** :
   - Message en orange : "• Plus que 8 places" (affiché si ≤ 10 places restantes)
   - Les champs sont toujours actifs

### Test 5.3 : Activité complète (UX visuel)

1. Créer des réservations pour remplir complètement l'activité (0 places restantes)

2. Recharger le formulaire

3. **Attendu** :
   - Badge rouge "Complet" à côté du nom de l'activité
   - Message rouge : "• Plus de places disponibles"
   - Toute la section activité est **grisée** (opacity réduite)
   - Les champs de quantité sont **désactivés** (gris, non cliquables)
   - Background des cartes de tarifs en gris clair
   - Textes en gris (titres, prix)

4. Essayer de cliquer sur les champs de quantité

5. **Attendu** :
   - Impossible de modifier les valeurs (champs disabled)
   - Curseur "not-allowed"

### Test 5.4 : Capacité illimitée

1. Modifier `maxParticipants` : mettre `NULL` dans Prisma Studio

2. Recharger le formulaire

3. **Attendu** :
   - Aucun message "Limité à X participants"
   - Aucun message de places restantes
   - Les champs sont actifs normalement

### Test 5.5 : Dépassement de capacité (API protection)

1. Remettre `maxParticipants` à `5`

2. Via l'API directement (Postman/Thunder Client), essayer de créer une réservation avec **6 participants**

3. **Attendu** :
   - Requête POST vers `/api/public/reservations/create`
   - Status : 409 (Conflict)
   - Body : JSON avec détails de l'erreur
   - Message : "Capacité dépassée pour l'activité 'Rando Papilles'"

---

## Test 6 : Fermeture des inscriptions

### Setup : Fermer les inscriptions

1. Retourner dans Prisma Studio ou l'interface admin

2. Modifier l'événement AE6 :
   - `status` : `CLOSED` OU `registrationOpenOverride` : `false`

3. Sauvegarder

### Test :

1. **Recharger** http://localhost:4321/evenements/ae6

2. **Attendu** :
   - Badge : "🔒 Inscriptions fermées" (orange) OU "⏰ Évènement terminé" (rouge si ARCHIVED)
   - Bouton : "🔒 Inscriptions fermées" (rouge, non cliquable)

3. **Essayer d'accéder directement** à http://localhost:4321/evenements/ae6/inscriptions

4. **Attendu** :
   - Page affiche : "Inscriptions fermées"
   - Icône rouge avec croix
   - Message approprié selon le statut
   - Bouton "Retour à l'événement"

---

## Test 7 : Vérification depuis l'interface admin

1. Se connecter à http://localhost:4321/admin/login

2. Aller dans **Réservations**

3. **Vérifier** :
   - La réservation créée au Test 4.3 apparaît dans la liste
   - Nom, prénom, email, téléphone sont corrects
   - Montant est correct
   - Statut paiement : "En attente" (badge jaune)

4. Cliquer sur l'événement pour voir les détails

5. **Vérifier** :
   - Les stats affichent le bon nombre de participants
   - Les revenus "En attente" incluent cette réservation

---

## Checklist finale

- [ ] Les inscriptions s'ouvrent/ferment correctement (BDD)
- [ ] La page AE6 affiche le bon badge et bouton
- [ ] Le formulaire d'inscriptions se charge correctement
- [ ] Le calcul du total fonctionne en temps réel
- [ ] La validation des champs fonctionne
- [ ] La création de réservation fonctionne (BDD + message succès)
- [ ] La vérification de capacité API fonctionne (erreur 409 si dépassement)
- [ ] **Nouveau** : Les activités complètes sont grisées visuellement
- [ ] **Nouveau** : Les champs de quantité sont désactivés pour les activités complètes
- [ ] **Nouveau** : Le badge "Complet" s'affiche correctement
- [ ] **Nouveau** : Le message "Plus de places disponibles" s'affiche en rouge
- [ ] **Nouveau** : L'alerte "Plus que X places" s'affiche en orange (si ≤ 10 places)
- [ ] **Nouveau** : Les activités sans limite (maxParticipants = null) n'affichent pas de message de capacité
- [ ] Les inscriptions fermées bloquent bien le formulaire
- [ ] Les réservations apparaissent dans l'interface admin

---

## Problèmes courants

### "Événement introuvable" sur /evenements/ae6/inscriptions

**Cause** : L'événement AE6 n'existe pas en BDD ou le slug est incorrect.

**Solution** : Vérifier dans Prisma Studio que l'événement existe avec `slug = "ae6"`.

### Total ne se met pas à jour

**Cause** : JavaScript pas chargé ou erreur console.

**Solution** : Ouvrir F12 > Console, vérifier les erreurs. Vérifier que le script `inscription-event.ts` est bien chargé.

### Erreur 500 lors de la soumission

**Cause** : Erreur serveur (Prisma, validation...).

**Solution** : Vérifier les logs du serveur dans le terminal. Vérifier que la BDD est bien lancée.

### Les boutons n'apparaissent pas sur /evenements/ae6

**Cause** : Erreur lors de la requête Prisma.

**Solution** : Vérifier les logs du serveur. Vérifier que `import { prisma }` fonctionne.

---

## Prochaines étapes (Phase F)

Une fois les tests validés, la Phase F ajoutera :
- Intégration paiement SumUp
- Workflow de paiement complet
- Emails de confirmation via Resend
- Page de confirmation de paiement

Pour l'instant, les réservations sont créées avec `paymentStatus = PENDING` et attendent le paiement.
