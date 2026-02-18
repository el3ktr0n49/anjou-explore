# 🚀 Guide de Démarrage Backend - Anjou Explore

Ce guide vous accompagne pour lancer le backend (PostgreSQL + Prisma) en 5 minutes.

## ✅ Prérequis

- [x] Docker Desktop installé et **démarré**
- [x] Bun installé
- [x] Git configuré

## 🎯 Étapes de Configuration

### 1. Vérifier Docker

Assurez-vous que Docker Desktop est bien démarré :

```bash
docker --version
# Docker version 24.x.x...
```

### 2. Lancer PostgreSQL

```bash
docker-compose up -d
```

Vérifier que les containers tournent :

```bash
docker ps
```

Vous devriez voir :
- `anjouexplore-db` (PostgreSQL)
- `anjouexplore-pgadmin` (Interface web)

### 3. Générer le client Prisma

```bash
bun run db:generate
```

### 4. Créer les tables

```bash
bun run db:push
```

### 5. Initialiser les données

```bash
bun run db:seed
```

**⚠️ IMPORTANT** : Cette commande va afficher les **QR codes pour Google Authenticator**.

Vous verrez quelque chose comme :

```
José:
Secret: JBSWY3DPEHPK3PXP
QR Code (ouvrir dans navigateur):
data:image/png;base64,iVBORw0KGgoAAAANSUhE...
```

**Actions à faire :**

1. Copier le QR Code (data:image...)
2. Ouvrir un navigateur
3. Coller dans la barre d'adresse
4. Scanner avec Google Authenticator (ou équivalent)
5. Répéter pour les 4 personnes

### 6. Tester l'accès à la base de données

**Option A : Prisma Studio (recommandé)**

```bash
bun run db:studio
```

Ouvre http://localhost:5555 → Interface graphique pour explorer les données

**Option B : pgAdmin**

1. Ouvrir http://localhost:5050
2. Login :
   - Email: `admin@anjouexplore.com`
   - Password: `admin2026`
3. Ajouter un serveur :
   - Name: Anjou Explore
   - Host: `postgres` (important : nom du container Docker)
   - Port: 5432
   - Database: `anjouexplore`
   - Username: `anjou`
   - Password: `anjou_password_2026`

### 7. Lancer le site

```bash
bun run dev
```

→ Site accessible sur http://localhost:4321

## 🗂️ Données créées par le seed

Le script `bun run db:seed` a créé :

### Admins (4)
- José (avec secret 2FA)
- Fabien (avec secret 2FA)
- Benoît (avec secret 2FA)
- Adrien (avec secret 2FA)

### Événement de test
- **AE7** (Anjou Explore #7)
  - Date : 15 juin 2026
  - Statut : DRAFT (brouillon)
  - Paiements désactivés

### Formules/Tarifs
- Rando Papilles - Adulte : 25€
- Rando Papilles - Enfant : 15€
- Le Défi - Adulte : 30€
- Le Défi - Enfant : 18€

### Réservation de test
- Jean Dupont
- Email: jean.dupont@example.com
- Activité : Rando Papilles
- 2 adultes + 1 enfant = 65€
- Statut : En attente de paiement

### Demande de contact
- Sophie Martin
- Demande de réservation Adventure+

## 🔍 Vérifications

### Base de données fonctionne ?

```bash
docker exec -it anjouexplore-db psql -U anjou -d anjouexplore -c "SELECT COUNT(*) FROM admins;"
```

Devrait afficher `4` (les 4 admins).

### Prisma client généré ?

```bash
ls node_modules/.prisma/client/
```

Devrait contenir des fichiers TypeScript.

## 🐛 Problèmes courants

### "Cannot connect to database"

→ Docker n'est pas démarré
```bash
docker-compose up -d
```

### "Port 5432 already in use"

→ Vous avez déjà PostgreSQL installé localement
```bash
# Option 1 : Arrêter PostgreSQL local
# Option 2 : Changer le port dans docker-compose.yml
```

### "Prisma command not found"

→ Réinstaller les dépendances
```bash
bun install
```

### Réinitialiser complètement

```bash
docker-compose down -v  # Supprime volumes
docker-compose up -d
bun run db:push
bun run db:seed
```

## 📚 Prochaines Étapes

Maintenant que le backend est configuré, nous allons passer à la **Phase B : Authentification Admin**.

Cela inclut :
- Page de login avec mot de passe + 2FA
- Middleware JWT pour sécuriser les routes
- Dashboard admin de base

## 🆘 Aide

### Voir les logs Docker

```bash
docker logs anjouexplore-db
docker logs anjouexplore-pgadmin
```

### Accéder au shell PostgreSQL

```bash
docker exec -it anjouexplore-db psql -U anjou -d anjouexplore
```

### Arrêter le backend

```bash
docker-compose down
```

### Redémarrer proprement

```bash
docker-compose down
docker-compose up -d
bun run db:push
bun run db:seed
```

---

**✨ Vous êtes prêt !** Le backend est maintenant opérationnel.
