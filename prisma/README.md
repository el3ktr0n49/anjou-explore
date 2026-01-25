# Prisma Database Management

Ce dossier contient la configuration et les scripts de gestion de la base de données PostgreSQL.

## 📋 Prérequis

1. Docker Desktop installé et démarré
2. Variables d'environnement configurées dans `.env`

## 🚀 Démarrage rapide

### 1. Lancer PostgreSQL avec Docker

```bash
docker-compose up -d
```

Cela démarre :
- PostgreSQL sur `localhost:5432`
- pgAdmin sur `http://localhost:5050`

### 2. Générer le client Prisma

```bash
bun run db:generate
```

### 3. Créer les tables dans la base de données

**Option A : Push (développement rapide)**
```bash
bun run db:push
```

**Option B : Migration (recommandé pour production)**
```bash
bun run db:migrate
```

### 4. Initialiser les données (seed)

```bash
bun run db:seed
```

Cela crée :
- 4 administrateurs (José, Fabien, Benoît, Adrien) avec leurs secrets 2FA
- Un événement de test (AE7)
- Des formules/tarifs
- Des données de test

⚠️ **Important** : Le script affiche les QR codes pour Google Authenticator. Scannez-les avec l'app pour configurer le 2FA.

## 🔧 Commandes disponibles

| Commande | Description |
|----------|-------------|
| `bun run db:generate` | Génère le client Prisma TypeScript |
| `bun run db:push` | Pousse le schéma vers la DB (sans migration) |
| `bun run db:migrate` | Crée et applique une migration |
| `bun run db:studio` | Ouvre Prisma Studio (UI web) |
| `bun run db:seed` | Remplit la DB avec données initiales |
| `bun run db:reset` | ⚠️ RÉINITIALISE la DB (supprime tout) |

## 🗄️ Accès à la base de données

### Via pgAdmin

1. Ouvrir http://localhost:5050
2. Login :
   - Email: `admin@anjouexplore.com`
   - Password: `admin2026`
3. Ajouter un serveur :
   - Host: `postgres` (nom du container Docker)
   - Port: `5432`
   - Database: `anjouexplore`
   - Username: `anjou`
   - Password: `anjou_password_2026`

### Via Prisma Studio

```bash
bun run db:studio
```

Ouvre une interface web sur http://localhost:5555 pour explorer/éditer les données.

### Via CLI PostgreSQL

```bash
docker exec -it anjouexplore-db psql -U anjou -d anjouexplore
```

## 📊 Structure de la base de données

### Tables principales

- **admins** : Administrateurs avec secrets 2FA
- **events** : Événements (AE6, AE7, etc.)
- **formulas** : Formules/tarifs par événement
- **reservations** : Réservations aux événements
- **contact_requests** : Demandes de contact/info
- **sessions** : Sessions JWT pour l'authentification

### Relations

```
Event (1) ─→ (N) Formula
Event (1) ─→ (N) Reservation
```

## 🔄 Workflow de développement

1. Modifier `schema.prisma`
2. Générer le client : `bun run db:generate`
3. Appliquer les changements :
   - Dev : `bun run db:push`
   - Prod : `bun run db:migrate`
4. Mettre à jour le seed si nécessaire

## 🐛 Dépannage

### La connexion échoue

Vérifier que Docker tourne :
```bash
docker ps
```

Devrait afficher `anjouexplore-db` et `anjouexplore-pgadmin`.

### Réinitialiser complètement

```bash
bun run db:reset
bun run db:seed
```

### Voir les logs PostgreSQL

```bash
docker logs anjouexplore-db
```

## 📚 Documentation

- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
