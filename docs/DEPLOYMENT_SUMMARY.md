# 📦 Récapitulatif du Déploiement - Anjou Explore

## ✅ Fichiers créés

### Docker & Build

- ✅ [Dockerfile](Dockerfile) : Image multi-stage Bun + Astro
- ✅ [src/pages/api/health.ts](src/pages/api/health.ts) : Endpoint health check
- ✅ [scripts/init-db.ts](scripts/init-db.ts) : Initialisation intelligente de la BDD

### Kubernetes Manifests

#### Infrastructure de base
- ✅ [k8s/namespace.yaml](k8s/namespace.yaml)
- ✅ [k8s/rbac.yaml](k8s/rbac.yaml)
- ✅ [k8s/app-configmap.yaml](k8s/app-configmap.yaml)

#### PostgreSQL 18.1-alpine
- ✅ [k8s/postgres-pvc.yaml](k8s/postgres-pvc.yaml) (1Gi Longhorn)
- ✅ [k8s/postgres-secret.yaml.example](k8s/postgres-secret.yaml.example)
- ✅ [k8s/postgres-statefulset.yaml](k8s/postgres-statefulset.yaml)
- ✅ [k8s/postgres-service.yaml](k8s/postgres-service.yaml)

#### Application
- ✅ [k8s/app-secret.yaml.example](k8s/app-secret.yaml.example)
- ✅ [k8s/app-deployment.yaml](k8s/app-deployment.yaml) (1 replica)
- ✅ [k8s/app-service.yaml](k8s/app-service.yaml)
- ✅ [k8s/ingress.yaml](k8s/ingress.yaml) (Traefik, Let's Encrypt)

#### Backups
- ✅ [k8s/backup-pvc.yaml](k8s/backup-pvc.yaml) (2Gi Longhorn)
- ✅ [k8s/backup-cronjob.yaml](k8s/backup-cronjob.yaml) (pg_dump quotidien 2h)
- ✅ [k8s/backup-s3-secret.yaml.example](k8s/backup-s3-secret.yaml.example)
- ✅ [k8s/backup-s3-cronjob.yaml](k8s/backup-s3-cronjob.yaml) (sync S3 hebdomadaire)

#### pgAdmin (optionnel)
- ✅ [k8s/pgadmin/pgadmin-pvc.yaml](k8s/pgadmin/pgadmin-pvc.yaml)
- ✅ [k8s/pgadmin/pgadmin-secret.yaml.example](k8s/pgadmin/pgadmin-secret.yaml.example)
- ✅ [k8s/pgadmin/pgadmin-deployment.yaml](k8s/pgadmin/pgadmin-deployment.yaml)
- ✅ [k8s/pgadmin/pgadmin-service.yaml](k8s/pgadmin/pgadmin-service.yaml)
- ✅ [k8s/pgadmin/pgadmin-ingress.yaml](k8s/pgadmin/pgadmin-ingress.yaml) (Authelia 2FA)

### CI/CD

- ✅ [.gitea/workflows/ci-cd.yaml](.gitea/workflows/ci-cd.yaml) : Pipeline complet
  - Build & Test
  - Docker Build & Push (Harbor)
  - Database Migrations
  - Deploy Kubernetes
  - Sync GitHub

### Documentation

- ✅ [DEPLOYMENT.md](DEPLOYMENT.md) : Guide de déploiement rapide
- ✅ [k8s/README.md](k8s/README.md) : Documentation complète K8s
- ✅ [.env.production.example](.env.production.example) : Template variables prod

### Modifications

- ✅ [prisma/seed.ts](prisma/seed.ts) : Export fonction `seedAdmins()`
- ✅ [.gitignore](.gitignore) : Ajout secrets K8s

## 🏗️ Architecture déployée

```
┌─────────────────────────────────────────────────────────────┐
│  Gitea Actions (git.ratons.ovh)                             │
│  └─ Build → Harbor (harbor.ratons.ovh/anjou/anjouexplore)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  K3s Cluster - Namespace: anjouexplore                      │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  PostgreSQL 18.1  │◄───│  Backup CronJob  │              │
│  │  StatefulSet      │    │  Daily 2h        │              │
│  │  PVC: 1Gi         │    │  PVC: 2Gi        │              │
│  └────────┬──────────┘    └──────────────────┘              │
│           │                        │                         │
│           │                        ▼                         │
│           │               ┌──────────────────┐              │
│           │               │  S3 Sync CronJob │              │
│           │               │  Weekly Sunday   │              │
│           │               └──────────────────┘              │
│           ▼                                                  │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Anjou Explore    │    │  pgAdmin         │              │
│  │  Deployment       │    │  (optionnel)     │              │
│  │  1 replica        │    │  + Authelia      │              │
│  └────────┬──────────┘    └────────┬─────────┘              │
│           │                        │                         │
│           ▼                        ▼                         │
│  ┌─────────────────────────────────────────┐                │
│  │  Traefik Ingress                        │                │
│  │  ├─ anjouexplore.ratons.ovh             │                │
│  │  └─ pgadmin.anjouexplore.ratons.ovh     │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Stratégie de sauvegarde (3 niveaux)

### Niveau 1 : Snapshots Longhorn
- Automatique (configuration cluster)
- Rétention : 7 jours
- Restauration instantanée

### Niveau 2 : pg_dump quotidien
- CronJob à 2h du matin (UTC)
- Format : SQL compressé (gzip)
- Stockage : PVC Longhorn 2Gi
- Rétention : 30 backups

### Niveau 3 : Export S3 hebdomadaire
- CronJob dimanche 3h (UTC)
- Destination : Scaleway/AWS S3
- Encryption at rest
- Rétention : 12 semaines

## 📊 Ressources allouées

### PostgreSQL
- CPU : 100m request, 500m limit
- Memory : 256Mi request, 512Mi limit
- Storage : 1Gi (Longhorn, 1 replica)

### Application
- CPU : 100m request, 1000m limit
- Memory : 256Mi request, 512Mi limit
- Replicas : 1 (scalable)

### Backups
- PVC : 2Gi (Longhorn)
- CronJob : 128Mi memory

### pgAdmin (optionnel)
- CPU : 100m request, 500m limit
- Memory : 256Mi request, 512Mi limit
- Storage : 500Mi

## 🌐 Exposition

- **Public** : https://anjouexplore.ratons.ovh
  - Certificat Let's Encrypt automatique
  - Pas de middleware (l'app gère son 2FA)

- **pgAdmin** : https://pgadmin.anjouexplore.ratons.ovh
  - Certificat Let's Encrypt automatique
  - Middleware Authelia 2FA obligatoire

## 🔄 Workflow CI/CD

**Déclencheurs :**
- Push sur `main` → Déploiement automatique
- Push sur `develop` → Build uniquement
- Pull requests → Tests uniquement

**Jobs :**
1. **build-test** : Bun install + build Astro
2. **docker-build-push** : Build image + Push Harbor
3. **database-migrations** : Job Kubernetes exécutant Prisma migrations
4. **deploy-k8s** : Apply manifests + Rollout
5. **sync-github** : Mirror vers GitHub

## 🚀 Prochaines étapes

### 1. Secrets Kubernetes (À faire AVANT le premier déploiement)

```bash
# Créer et éditer les secrets
cd k8s
cp postgres-secret.yaml.example postgres-secret.yaml
cp app-secret.yaml.example app-secret.yaml
cp backup-s3-secret.yaml.example backup-s3-secret.yaml

# Éditer avec les vraies valeurs
nano postgres-secret.yaml
nano app-secret.yaml
nano backup-s3-secret.yaml

# Appliquer
kubectl apply -f postgres-secret.yaml
kubectl apply -f app-secret.yaml
kubectl apply -f backup-s3-secret.yaml
```

### 2. Secrets Gitea Actions

Dans les paramètres du repository Gitea, configurer :

- `HARBOR_USERNAME` : Utilisateur Harbor
- `HARBOR_PASSWORD` : Mot de passe Harbor
- `KUBECONFIG` : Fichier kubeconfig encodé base64
- `GH_MIRROR_TOKEN` : Token GitHub (optionnel)
- `GH_MIRROR_REPO` : Format `username/repo` (optionnel)

### 3. Déploiement initial

```bash
# Clone le projet
git clone https://git.ratons.ovh/user/anjouexplore.git
cd anjouexplore

# Push vers main → Déploiement automatique
git push origin main
```

Ou déploiement manuel :
```bash
# Suivre DEPLOYMENT.md
```

### 4. Configuration DNS

Pointer `anjouexplore.ratons.ovh` vers l'IP du cluster K3s.

### 5. Vérification post-déploiement

```bash
# Vérifier les pods
kubectl get pods -n anjouexplore

# Tester l'accès
curl -s https://anjouexplore.ratons.ovh/api/health | jq

# Vérifier les logs
kubectl logs -n anjouexplore -l app=anjouexplore -f
```

## 🎯 Migration future vers VPS OVH (si nécessaire)

Si vous décidez de migrer vers un VPS OVH simple :

1. **Restaurer backup S3** : Les backups S3 sont portables
2. **Docker Compose** : Utiliser `docker-compose.dev.yml` comme base
3. **Simplifier** : 1 VPS = moins de complexité pour un site vitrine
4. **Coût** : ~10€/mois VPS vs homelab gratuit

**Recommandation actuelle** : Rester sur K3s homelab pour :
- Apprendre Kubernetes
- Coût zéro
- Infrastructure déjà en place
- Facilement migrable plus tard

## 📚 Documentation

- **Guide rapide** : [DEPLOYMENT.md](DEPLOYMENT.md)
- **Détails K8s** : [k8s/README.md](k8s/README.md)
- **Contexte projet** : [CLAUDE.md](CLAUDE.md)
- **CI/CD homelab** : [CLAUDE_CICD.md](CLAUDE_CICD.md)
- **K3s homelab** : [CLAUDE_K3S.md](CLAUDE_K3S.md)

## ✨ Fonctionnalités mises en place

- ✅ Build Docker optimisé multi-stage
- ✅ Health checks Kubernetes
- ✅ Initialisation smart de la BDD
- ✅ Migrations automatiques Prisma
- ✅ Backups 3 niveaux (Longhorn + pg_dump + S3)
- ✅ pgAdmin avec Authelia 2FA
- ✅ CI/CD complet Gitea Actions
- ✅ TLS Let's Encrypt automatique
- ✅ Rollback facile Kubernetes
- ✅ Scaling horizontal simple
- ✅ Documentation complète

🎉 **Le projet est prêt à être déployé !**
