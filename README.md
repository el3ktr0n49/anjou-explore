# Anjou Explore

Site web pour l'association Anjou Explore - Escapades nature, patrimoine et gastronomie en Anjou.

## Stack Technique

- **Framework** : Astro 5.x (mode hybride SSG + SSR)
- **Runtime** : Bun
- **Database** : PostgreSQL 16 (via Docker)
- **ORM** : Prisma 7.x
- **UI interactive** : Preact (Astro Islands)
- **Styling** : TailwindCSS v4
- **Language** : TypeScript
- **Auth** : JWT + Google Authenticator (2FA)
- **Paiements** : SumUp API
- **Emails** : Resend

## Commandes

```bash
# Developpement
bun run dev              # Serveur dev sur http://localhost:4321
bun run build            # Build de production
bun run preview          # Preview du build

# Base de donnees
docker-compose up -d     # Demarrer PostgreSQL + pgAdmin
bun run db:generate      # Generer le client Prisma
bun run db:push          # Pousser le schema (dev)
bun run db:migrate       # Migrations (prod)
bun run db:studio        # Prisma Studio
bun run db:seed          # Donnees de test
```

## Structure

```
anjouexplore/
├── src/
│   ├── pages/           # Routes (file-based) + API endpoints
│   ├── components/      # Composants Astro + Preact Islands
│   ├── layouts/         # Layout principal
│   ├── lib/             # Backend (auth, services, DB)
│   ├── scripts/         # Scripts client-side
│   └── styles/          # TailwindCSS
├── prisma/              # Schema et migrations
├── k8s/                 # Manifests Kubernetes
├── docs/                # Documentation detaillee
├── scripts/             # Scripts d'optimisation (images)
└── public/              # Assets statiques
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Instructions Claude Code et details techniques complets
- [docs/](./docs/) - Documentation detaillee :
  - [Backend Quickstart](./docs/BACKEND_QUICKSTART.md) - Demarrage rapide du backend
  - [Guide Images](./docs/GUIDE-IMAGES.md) - Optimisation et gestion des images
  - [Historique des Phases](./docs/CLAUDE_PHASES.md) - Phases de developpement A-F
  - [Refactorisation Preact](./docs/REFACTOR_PREACT.md) - Migration vers Astro Islands
  - [Deploiement](./docs/DEPLOYMENT.md) - Guide de deploiement
  - [Deploiement generique](./docs/CLAUDE_DEPLOY.md) - Docker, K8s, CI/CD
  - [CI/CD Homelab](./docs/CLAUDE_CICD.md) - Gitea Actions, Harbor
  - [Kubernetes K3s](./docs/CLAUDE_K3S.md) - Cluster K3s homelab

## Contact

Site : https://www.anjouexplore.com/
Telephone : 06.83.92.45.03
