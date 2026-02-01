# Guide de Test - Phase F : Paiements SumUp

## 📋 Vue d'ensemble

Ce guide vous permet de tester l'intégration complète des paiements SumUp avec Resend pour les emails.

**Stack Phase F** :
- ✅ Service SumUp (API REST)
- ✅ Endpoint checkout (`/api/public/payments/checkout`)
- ✅ Webhook SumUp (`/api/webhooks/sumup`)
- ✅ Service email Resend
- ✅ Page de retour (`/payment/return`)
- ✅ Modèle `PaymentTransaction` en BDD

---

## 🔧 Prérequis

### 1. Variables d'environnement configurées

Vérifier que `.env` contient :
```bash
# SumUp (compte test)
SUMUP_API_KEY="sup_pk_I7MqKIejENUbwd3IWuxRjaOdXAuq12u2d"

# Resend
RESEND_API_KEY="re_aEx279DP_NNq7FN296riUJk25GzcrAkEb"
EMAIL_FROM="anjouexplore@gmail.com"

# Application
APP_URL="http://localhost:4321"
NODE_ENV="development"
```

### 2. Base de données synchronisée

Si vous venez de créer `PaymentTransaction`, synchronisez la DB :
```bash
bun run db:push
bun run db:generate
```

### 3. Serveur de développement démarré

```bash
bun run dev
```

Le serveur devrait être accessible sur `http://localhost:4321`

---

## 🧪 Tests à effectuer

### Test 1 : Vérifier qu'un événement est ouvert aux inscriptions

1. Aller sur `/admin/events`
2. Sélectionner un événement (ex: AE7)
3. Vérifier que `status = OPEN` et `paymentEnabled = true`
4. Si non, modifier l'événement pour activer les inscriptions

**Résultat attendu** : Un événement avec inscriptions ouvertes existe.

---

### Test 2 : Page publique d'inscription

1. Aller sur `/evenements/ae7` (ou votre événement test)
2. Cliquer sur le bouton "S'inscrire maintenant"
3. Vous devriez arriver sur `/evenements/ae7/inscriptions`

**Résultat attendu** : La page d'inscription s'affiche avec le formulaire dynamique.

---

### Test 3 : Création d'une réservation

1. Sur la page d'inscription, remplir le formulaire :
   - Choisir une activité (ex: "rando papilles")
   - Sélectionner des participants (ex: 2 adultes)
   - Le total doit se calculer en temps réel
   - Remplir nom, prénom, email, téléphone

2. Cliquer sur "Réserver"

**Résultat attendu** :
- Message "✅ Réservation créée ! Redirection vers le paiement sécurisé..."
- Bouton change en "Initialisation du paiement..."
- Après 1-2 secondes : Redirection automatique vers SumUp

---

### Test 4 : Page de paiement SumUp (Hosted Checkout)

Vous devriez être redirigé vers une URL type :
```
https://pay.sumup.com/...
```

**Compte test SumUp** :
- La page affiche "Test Mode" (badge ou bannière)
- Vous pouvez utiliser des cartes de test

**Cartes de test SumUp** :
- Succès : `4242 4242 4242 4242` (toute date future, tout CVC)
- Échec : Montant `11.00` dans n'importe quelle devise
- Expiration : Attendre quelques minutes sans payer

**Résultat attendu** : Page de paiement SumUp s'affiche correctement.

---

### Test 5 : Workflow de paiement réussi

1. Sur la page SumUp, entrer les infos de carte test :
   - Numéro : `4242 4242 4242 4242`
   - Date : N'importe quelle date future (ex: 12/28)
   - CVC : N'importe quel code 3 chiffres (ex: 123)

2. Cliquer sur "Payer"

3. SumUp traite le paiement et vous redirige vers :
   ```
   http://localhost:4321/payment/return?reservationId=xxx
   ```

**Résultat attendu** :
- ✅ Page affiche "Paiement réussi !"
- Détails de la réservation affichés
- Message "Un email de confirmation a été envoyé"

---

### Test 6 : Vérifier la BDD (après paiement réussi)

1. Ouvrir Prisma Studio :
   ```bash
   bun run db:studio
   ```

2. Vérifier la table `Reservation` :
   - `paymentStatus` doit être `PAID`
   - `paidAt` doit contenir une date
   - `sumupCheckoutId` et `sumupTransactionId` doivent être remplis

3. Vérifier la table `PaymentTransaction` :
   - Une ligne avec `status = COMPLETED`
   - `checkoutId` rempli
   - `transactionId` rempli (ID de la transaction SumUp)
   - `completedAt` contient une date

**Résultat attendu** : Les données sont correctement enregistrées.

---

### Test 7 : Vérifier l'email de confirmation

1. Vérifier la console du serveur Bun :
   ```
   [Email] Email de confirmation envoyé: xxx
   ```

2. Si vous avez configuré Resend avec votre email :
   - Vérifier votre boîte mail
   - L'email doit contenir :
     - ✅ Titre "Confirmation de réservation - [Événement]"
     - Nom du participant
     - Détails de la réservation
     - Montant payé

**Note** : En mode test Resend, vous devez avoir vérifié votre email expéditeur sur Resend.com

**Résultat attendu** : Email reçu avec le bon contenu.

---

### Test 8 : Workflow paiement échoué

1. Créer une nouvelle réservation
2. Sur la page SumUp, entrer une carte avec montant `11.00` (test d'échec)
3. OU cliquer sur "Annuler" / fermer la page

**Résultat attendu** :
- Retour sur `/payment/return?reservationId=xxx`
- Page affiche "Paiement échoué" (si FAILED) ou "Paiement en attente" (si PENDING)
- Bouton "Réessayer" disponible

---

### Test 9 : Vérifier le webhook SumUp (optionnel)

**Note** : En développement local, le webhook SumUp ne peut pas être appelé directement (URL localhost non accessible par SumUp).

**Solutions** :
1. **Tester manuellement** : Appeler le webhook avec curl/Postman
2. **Utiliser ngrok** : Exposer votre localhost et configurer l'URL webhook sur SumUp
3. **Mode production** : Le webhook fonctionnera automatiquement

**Test manuel du webhook** :
```bash
# Remplacer CHECKOUT_ID par un vrai ID de checkout
curl -X POST http://localhost:4321/api/webhooks/sumup \
  -H "Content-Type: application/json" \
  -d '{"checkout_id": "CHECKOUT_ID"}'
```

**Résultat attendu** :
- Status 200
- Logs dans la console : `[Webhook SumUp] Statut checkout: PAID`
- Réservation mise à jour

---

### Test 10 : Interface admin - Vérifier les réservations

1. Se connecter à `/admin/login`
2. Aller sur `/admin/reservations`
3. Filtrer par status "PAID"

**Résultat attendu** :
- Les réservations payées sont visibles
- Badge vert "PAYÉ"
- Montant et date de paiement affichés

---

## 🐛 Dépannage

### Erreur : "SUMUP_API_KEY manquante"

**Cause** : Variable d'environnement non chargée.

**Solution** :
1. Vérifier que `.env` contient `SUMUP_API_KEY="sup_pk_..."`
2. Redémarrer le serveur : `Ctrl+C` puis `bun run dev`
3. Vérifier que `dotenv/config` est importé dans les services

---

### Erreur : "Failed to create checkout"

**Cause** : Problème avec l'API SumUp.

**Solution** :
1. Vérifier que la clé API est valide (compte test)
2. Vérifier les logs serveur pour le message d'erreur exact
3. Tester manuellement l'API SumUp avec curl :
   ```bash
   curl -X POST https://api.sumup.com/v0.1/checkouts \
     -H "Authorization: Bearer sup_pk_I7MqKIejENUbwd3IWuxRjaOdXAuq12u2d" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 45.00,
       "currency": "EUR",
       "checkout_reference": "test123",
       "description": "Test",
       "hosted_checkout": {"enabled": true}
     }'
   ```

---

### Erreur : "Email non envoyé"

**Cause** : Resend non configuré ou email non vérifié.

**Solution** :
1. Vérifier que `RESEND_API_KEY` est dans `.env`
2. Aller sur [Resend.com](https://resend.com) → Domains
3. Vérifier votre domaine ou utiliser un email de test vérifié
4. En mode test, Resend permet seulement d'envoyer à des emails vérifiés

---

### Page de retour affiche "Paiement en attente" au lieu de "Paiement réussi"

**Cause** : Le webhook n'a pas encore mis à jour la réservation.

**Solutions** :
1. **En dev local** : Le webhook ne fonctionne pas (localhost non accessible)
   - Solution temporaire : Mettre à jour manuellement dans Prisma Studio
   - OU appeler le webhook manuellement (voir Test 9)

2. **En production** : Configurer l'URL du webhook sur SumUp Dashboard :
   - URL : `https://www.anjouexplore.com/api/webhooks/sumup`
   - Events : Payment completed

---

## 📊 Checklist finale

Avant de passer en production, vérifier :

- [ ] ✅ Tous les tests ci-dessus réussis
- [ ] ✅ Email de confirmation reçu et formaté correctement
- [ ] ✅ Page de retour affiche le bon message selon le statut
- [ ] ✅ BDD enregistre correctement les transactions
- [ ] ✅ Interface admin affiche les paiements
- [ ] ✅ Workflow de bout en bout fonctionnel

**Production uniquement** :
- [ ] Remplacer `SUMUP_API_KEY` par la clé de production (`sup_sk_...`)
- [ ] Configurer le webhook sur SumUp Dashboard
- [ ] Vérifier le domaine email sur Resend (pour emails prod)
- [ ] Mettre à jour `APP_URL` dans `.env` vers l'URL de production
- [ ] Tester avec une vraie carte (montant < 1€ pour limiter les frais)

---

## 📝 Notes supplémentaires

### Configuration webhook en production

1. Aller sur [SumUp Dashboard](https://me.sumup.com) → Developer
2. Ajouter Webhook URL : `https://www.anjouexplore.com/api/webhooks/sumup`
3. Sélectionner events : `checkout.completed`, `checkout.failed`

### Mode test vs Production

**Mode test (actuel)** :
- Clé API : `sup_pk_...` (Public Key)
- Aucun vrai argent transféré
- Carte test : `4242 4242 4242 4242`

**Mode production** :
- Clé API : `sup_sk_...` (Secret Key)
- Vrais paiements
- Cartes réelles

---

## 🎉 Conclusion

La Phase F est maintenant complète ! Vous avez implémenté :

- ✅ Intégration SumUp avec hosted checkout
- ✅ Gestion des transactions en BDD
- ✅ Webhook pour mise à jour automatique
- ✅ Emails de confirmation via Resend
- ✅ Pages de retour dynamiques

**Prochaines étapes possibles** :
- Gestion des remboursements (API SumUp refund)
- Dashboard admin avec analytics paiements
- Export CSV des transactions
- Tests automatisés (Vitest)
