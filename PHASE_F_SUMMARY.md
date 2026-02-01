# Phase F : Paiements SumUp - Récapitulatif d'implémentation

## 📅 Date de réalisation
**1er février 2026**

---

## 🎯 Objectifs

Implémenter un système complet de paiement en ligne avec SumUp et envoi d'emails de confirmation via Resend.

---

## 📦 Fichiers créés

### 1. Service SumUp
**Fichier** : [`src/lib/services/sumupService.ts`](src/lib/services/sumupService.ts)

**Contenu** :
- `createCheckout()` : Crée un checkout SumUp avec hosted checkout
- `getCheckout()` : Récupère le statut d'un checkout
- `isCheckoutPaid()` : Vérifie si un checkout est payé
- `getTransactionId()` : Récupère l'ID de transaction

**Types** :
- `SumUpCheckoutRequest`
- `SumUpCheckoutResponse`
- `SumUpCheckoutDetails`
- `SumUpCheckoutStatus`

---

### 2. Endpoint Checkout
**Fichier** : [`src/pages/api/public/payments/checkout.ts`](src/pages/api/public/payments/checkout.ts)

**Route** : `POST /api/public/payments/checkout`

**Body** :
```typescript
{
  reservationId: string
}
```

**Workflow** :
1. Récupère la réservation depuis la BDD
2. Vérifie qu'elle n'est pas déjà payée
3. Vérifie qu'il n'y a pas de transaction en cours (< 1h)
4. Crée un checkout SumUp
5. Enregistre une `PaymentTransaction` (status INITIATED)
6. Retourne l'URL de checkout

**Response** :
```typescript
{
  success: true,
  checkoutUrl: string,
  checkoutId: string,
  existing?: boolean  // Si transaction existante réutilisée
}
```

---

### 3. Webhook SumUp
**Fichier** : [`src/pages/api/webhooks/sumup.ts`](src/pages/api/webhooks/sumup.ts)

**Route** : `POST /api/webhooks/sumup`

**Workflow** :
1. Reçoit notification de SumUp (format flexible)
2. Extrait `checkoutId` du payload
3. Récupère la transaction depuis la BDD
4. Vérifie le statut réel via API SumUp (sécurité)
5. Met à jour `PaymentTransaction` selon le statut
6. Si PAID :
   - Met à jour `Reservation.paymentStatus = PAID`
   - Envoie email de confirmation via Resend
7. Retourne succès

**Statuts gérés** :
- `PAID` → `COMPLETED` + email confirmation
- `FAILED` → `FAILED`
- `CANCELLED` → `CANCELLED`
- `EXPIRED` → `EXPIRED`

---

### 4. Service Email Resend
**Fichier** : [`src/lib/email/templates.ts`](src/lib/email/templates.ts)

**Fonctions** :
- `sendPaymentConfirmationEmail()` : Email de confirmation après paiement réussi
- `sendPaymentFailedEmail()` : Email d'échec de paiement (optionnel)

**Template HTML** :
- Design cohérent avec charte Anjou Explore
- Gradient or/olive dans le header
- Détails complets de la réservation
- Montant payé mis en valeur
- Infos de contact

**Formatage** :
- `formatDate()` : Date en français
- `formatAmount()` : Montant en euros
- `formatParticipants()` : Liste des participants

---

### 5. Script Client-Side (Modifié)
**Fichier** : [`src/scripts/inscription-event.ts`](src/scripts/inscription-event.ts)

**Modifications** :
- Après création réservation réussie :
  1. Affiche message "Redirection vers le paiement..."
  2. Attend 1 seconde
  3. Appelle `POST /api/public/payments/checkout`
  4. Redirige vers `checkoutUrl` (SumUp hosted checkout)

**Avant** :
```typescript
// Success! Reservation created
showMessage('✅ Réservation confirmée !', 'success');
form.reset();
```

**Après** :
```typescript
// Success! Reservation created, now initialize payment
showMessage('✅ Réservation créée ! Redirection vers le paiement...', 'success');
await new Promise(resolve => setTimeout(resolve, 1000));

const paymentResponse = await fetch('/api/public/payments/checkout', {
  method: 'POST',
  body: JSON.stringify({ reservationId: data.reservationId }),
});

window.location.href = paymentData.checkoutUrl;
```

---

### 6. Page de Retour Paiement
**Fichier** : [`src/pages/payment/return.astro`](src/pages/payment/return.astro)

**Route** : `/payment/return?reservationId=xxx`

**États gérés** :
1. **PAID** : Paiement réussi
   - ✓ Icône verte
   - Détails de la réservation
   - Message email de confirmation
   - Boutons : "Retour à l'accueil" | "Voir l'événement"

2. **PENDING** : En attente
   - ⏳ Icône orange
   - Message d'attente
   - Boutons : "Retour à l'accueil" | "Rafraîchir"

3. **FAILED** : Échec
   - ✕ Icône rouge
   - Message d'erreur
   - Boutons : "Réessayer" | "Retour à l'accueil"

4. **NOT FOUND** : Réservation introuvable
   - ? Icône grise
   - Message d'erreur
   - Bouton : "Retour à l'accueil"

**Design** :
- Cards avec gradient dans le header
- Responsive (mobile/desktop)
- Couleurs selon statut (vert/orange/rouge/gris)

---

## 🔧 Configuration

### Variables d'environnement ajoutées

**Fichier** : [`.env`](.env) (et [`.env.example`](.env.example))

```bash
# SumUp (Payment Gateway)
SUMUP_API_KEY="sup_pk_I7MqKIejENUbwd3IWuxRjaOdXAuq12u2d"  # Test account

# Resend (Email)
RESEND_API_KEY="re_aEx279DP_NNq7FN296riUJk25GzcrAkEb"
EMAIL_FROM="anjouexplore@gmail.com"
```

---

## 📊 Modèle de Données (Déjà existant)

**Table** : `PaymentTransaction` (créée en Phase C)

```prisma
model PaymentTransaction {
  id              String            @id @default(uuid())
  reservationId   String
  reservation     Reservation       @relation(...)

  // IDs SumUp
  checkoutId      String            // ID du checkout SumUp
  transactionId   String?           // ID de la transaction (si payé)

  // Montant
  amount          Decimal           @db.Decimal(10, 2)
  currency        String            @default("EUR")

  // Statut
  status          TransactionStatus @default(INITIATED)
  // INITIATED | PENDING | COMPLETED | FAILED | EXPIRED | CANCELLED

  // Métadonnées
  sumupResponse   Json?             // Réponse complète API SumUp
  checkoutUrl     String?           // URL de paiement hébergée

  // Dates
  initiatedAt     DateTime          @default(now())
  completedAt     DateTime?
  expiredAt       DateTime?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}
```

**Pas de migration nécessaire** : Le modèle existait déjà.

---

## 🔄 Workflow Complet

### Étape 1 : Utilisateur remplit le formulaire
- Page : `/evenements/ae7/inscriptions`
- Choix activité + participants
- Saisie coordonnées (nom, prénom, email, téléphone)

### Étape 2 : Création de la réservation
- `POST /api/public/reservations/create`
- Création `Reservation` (status PENDING)
- Retour : `{ reservationId, amount }`

### Étape 3 : Initialisation du paiement
- `POST /api/public/payments/checkout`
- Création checkout SumUp via API
- Création `PaymentTransaction` (status INITIATED)
- Retour : `{ checkoutUrl }`

### Étape 4 : Redirection vers SumUp
- `window.location.href = checkoutUrl`
- Utilisateur arrive sur page hébergée SumUp
- Saisit infos carte (ou annule)

### Étape 5 : Traitement du paiement
- SumUp traite le paiement
- Si succès : Statut checkout devient PAID
- Si échec : Statut checkout devient FAILED

### Étape 6 : Webhook callback (production)
- SumUp envoie notification à `/api/webhooks/sumup`
- Backend vérifie le statut via API
- Met à jour `PaymentTransaction` et `Reservation`
- Envoie email de confirmation (si PAID)

### Étape 7 : Retour utilisateur
- SumUp redirige vers `/payment/return?reservationId=xxx`
- Page affiche le statut selon `Reservation.paymentStatus`
- Message approprié (succès/attente/échec)

---

## 🧪 Tests

**Guide complet** : [`PHASE_F_TESTS.md`](PHASE_F_TESTS.md)

**Tests principaux** :
1. ✅ Création réservation + redirection SumUp
2. ✅ Paiement test réussi (carte `4242 4242 4242 4242`)
3. ✅ Page de retour affiche "Paiement réussi"
4. ✅ BDD mise à jour (Reservation.paymentStatus = PAID)
5. ✅ PaymentTransaction créée et complétée
6. ✅ Email de confirmation envoyé

**Tests optionnels** :
- Paiement échoué (montant 11.00)
- Annulation paiement
- Webhook manuel (dev local)

---

## 🚀 Mode Production

### Changements nécessaires

1. **Clé API SumUp** :
   - Remplacer `sup_pk_...` (test) par `sup_sk_...` (production)
   - Obtenir sur [SumUp Dashboard](https://me.sumup.com)

2. **Configuration Webhook** :
   - URL : `https://www.anjouexplore.com/api/webhooks/sumup`
   - Events : `checkout.completed`, `checkout.failed`, `checkout.expired`

3. **Domaine Email Resend** :
   - Vérifier le domaine sur [Resend.com](https://resend.com)
   - OU utiliser email vérifié

4. **Variables d'environnement** :
   ```bash
   APP_URL="https://www.anjouexplore.com"
   NODE_ENV="production"
   SUMUP_API_KEY="sup_sk_XXXXXXXXXX"  # Clé prod
   ```

---

## 📈 Métriques & Monitoring

### Logs à surveiller

**Console serveur** :
```
[SumUp] Création checkout: xxx
[Webhook SumUp] Payload reçu: {...}
[Webhook SumUp] Statut checkout: PAID
[Email] Email de confirmation envoyé: xxx
```

**Errors à surveiller** :
```
[SumUp] Erreur création checkout
[Webhook SumUp] Transaction introuvable
[Email] Erreur Resend
```

### Dashboard Admin

Les réservations payées sont visibles dans :
- `/admin/reservations` (badge vert "PAYÉ")
- `/admin/events/[id]` (stats revenus)

---

## 🎯 Améliorations Futures

**Phase F+** (optionnelles) :
- [ ] Gestion des remboursements (API SumUp refund)
- [ ] Export CSV des transactions
- [ ] Dashboard analytics (revenus par événement)
- [ ] Retry automatique paiements échoués
- [ ] Email de rappel si paiement en attente > 24h
- [ ] Multi-devises (actuellement EUR seulement)
- [ ] Tests automatisés (Vitest)

---

## ✅ Checklist Phase F Complète

- [x] Service SumUp créé
- [x] Endpoint checkout créé
- [x] Webhook SumUp créé
- [x] Service email Resend créé
- [x] Script client-side modifié
- [x] Page de retour créée
- [x] Variables d'environnement configurées
- [x] Guide de test complet
- [x] Documentation complète

**Phase F : ✅ COMPLÉTÉE** (1er février 2026)

---

## 📚 Documentation Externe

- [SumUp API Documentation](https://developer.sumup.com)
- [Resend Documentation](https://resend.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Astro API Routes](https://docs.astro.build/en/core-concepts/endpoints/)
