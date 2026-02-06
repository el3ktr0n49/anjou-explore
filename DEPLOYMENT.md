# Guide de Déploiement - Anjou Explore

Guide rapide pour déployer Anjou Explore sur le cluster K3s homelab.

## 📋 Prérequis

- [x] Cluster K3s opérationnel
- [x] kubectl configuré et connecté au cluster
- [x] Harbor registry accessible
- [x] Secret `harbor-registry` créé
- [x] Image Docker buildée et pushée sur Harbor

## 🚀 Déploiement en 5 étapes

### 1️⃣ Créer les Secrets Kubernetes

```bash
cd k8s

# PostgreSQL
cp postgres-secret.yaml.example postgres-secret.yaml
nano postgres-secret.yaml  # Remplacer CHANGEME
kubectl apply -f postgres-secret.yaml

# Application
cp app-secret.yaml.example app-secret.yaml
nano app-secret.yaml  # Remplacer tous les CHANGEME
kubectl apply -f app-secret.yaml
```

**Variables critiques à définir :**

- `DATABASE_URL` : URL complète PostgreSQL
- `ADMIN_SHARED_PASSWORD` : Hash bcrypt du mot de passe admin
- `JWT_SECRET` : 64+ caractères aléatoires
- `ADMIN_URL_SECRET` : Chemin secret pour l'admin
- `RESEND_API_KEY` : Clé API Resend.com
- `SUMUP_API_KEY` : Clé API SumUp

**Générer un mot de passe hashé :**

```bash
bun -e "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash('MonMotDePasseSecurisé123!', 10))"
```

**Générer un secret JWT :**

```bash
openssl rand -hex 32
```

### 2️⃣ Déployer l'infrastructure

```bash
# Namespace et RBAC
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml

# ConfigMap
kubectl apply -f app-configmap.yaml

# PostgreSQL
kubectl apply -f postgres-pvc.yaml
kubectl apply -f postgres-service.yaml
kubectl apply -f postgres-statefulset.yaml

# Attendre PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n anjouexplore --timeout=5m
```

### 3️⃣ Initialiser la base de données

**✅ Automatique** : L'initialisation se fait automatiquement au premier démarrage de l'application via l'InitContainer `init-database` qui exécute `scripts/init-db.ts`.

Le script est **idempotent** :
- Premier déploiement (DB vide) → Exécute migrations + seed admins
- Déploiements suivants → Exécute migrations seulement (si nouvelles migrations disponibles)

**Ou manuellement avec un Job Kubernetes (si besoin de débugger) :**

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: init-db
  namespace: anjouexplore
spec:
  template:
    spec:
      restartPolicy: Never
      imagePullSecrets:
        - name: harbor-registry
      containers:
        - name: init
          image: harbor.ratons.ovh/anjou/anjouexplore:latest
          command: ["bun", "run", "scripts/init-db.ts"]
          envFrom:
            - secretRef:
                name: anjouexplore-secret
EOF

# Suivre les logs
kubectl logs -n anjouexplore -l job-name=init-db -f
```

### 4️⃣ Déployer l'application

```bash
# Application
kubectl apply -f app-deployment.yaml
kubectl apply -f app-service.yaml
kubectl apply -f ingress.yaml

# Attendre le rollout
kubectl rollout status deployment/anjouexplore-app -n anjouexplore --timeout=5m

# Vérifier
kubectl get pods -n anjouexplore
kubectl get ingress -n anjouexplore
```

### 5️⃣ Configurer les backups

```bash
# Backups quotidiens pg_dump
kubectl apply -f backup-pvc.yaml
kubectl apply -f backup-cronjob.yaml

# Backups S3 hebdomadaires (optionnel)
cp backup-s3-secret.yaml.example backup-s3-secret.yaml
nano backup-s3-secret.yaml  # Configurer S3/Scaleway
kubectl apply -f backup-s3-secret.yaml
kubectl apply -f backup-s3-cronjob.yaml
```

## ✅ Vérification

```bash
# Status complet
kubectl get all -n anjouexplore

# Logs application
kubectl logs -n anjouexplore -l app=anjouexplore --tail=50 -f

# Test health check
kubectl exec -n anjouexplore deployment/anjouexplore-app -- \
  curl -s http://localhost:4321/api/health | jq
```

## 🌐 Accès

- **Site public** : https://anjouexplore.ratons.ovh
- **Admin** : https://anjouexplore.ratons.ovh/admin-{SECRET}
- **Health check** : https://anjouexplore.ratons.ovh/api/health

## 🗄️ pgAdmin (Optionnel)

```bash
cd pgadmin

# Créer le secret
cp pgadmin-secret.yaml.example pgadmin-secret.yaml
nano pgadmin-secret.yaml
kubectl apply -f pgadmin-secret.yaml

# Déployer pgAdmin
kubectl apply -f pgadmin-pvc.yaml
kubectl apply -f pgadmin-deployment.yaml
kubectl apply -f pgadmin-service.yaml
kubectl apply -f pgadmin-ingress.yaml

# Accès : https://pgadmin.anjouexplore.ratons.ovh
# (Protégé par Authelia 2FA)
```

## 🔄 CI/CD Automatique

Une fois configuré, tout push sur `main` déclenchera automatiquement :

1. Build & Tests
2. Docker Build & Push vers Harbor
3. Migrations Prisma
4. Deploy Kubernetes
5. Sync GitHub (mirror)

Voir [.gitea/workflows/ci-cd.yaml](../.gitea/workflows/ci-cd.yaml)

## 📚 Documentation complète

- [k8s/README.md](k8s/README.md) : Détails des manifests et troubleshooting
- [CLAUDE_DEPLOY.md](CLAUDE_DEPLOY.md) : Guide de déploiement général
- [CLAUDE_K3S.md](CLAUDE_K3S.md) : Spécificités K3s homelab
- [CLAUDE_CICD.md](CLAUDE_CICD.md) : Pipeline Gitea Actions

## 🆘 Support

En cas de problème :

1. Vérifier les logs : `kubectl logs -n anjouexplore -l app=anjouexplore`
2. Vérifier les events : `kubectl get events -n anjouexplore --sort-by='.lastTimestamp'`
3. Consulter [k8s/README.md#troubleshooting](k8s/README.md#-troubleshooting)
