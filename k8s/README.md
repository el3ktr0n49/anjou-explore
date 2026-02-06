# Kubernetes Manifests - Anjou Explore

Ce dossier contient tous les manifests Kubernetes pour déployer Anjou Explore sur un cluster K3s.

## 📁 Structure

```
k8s/
├── namespace.yaml                    # Namespace anjouexplore
├── rbac.yaml                         # ServiceAccount
├── postgres-pvc.yaml                 # PVC Longhorn 1Gi pour PostgreSQL
├── postgres-secret.yaml.example      # Secret PostgreSQL (à créer)
├── postgres-statefulset.yaml         # PostgreSQL 18.1-alpine
├── postgres-service.yaml             # Service ClusterIP PostgreSQL
├── app-configmap.yaml                # Variables non-sensibles
├── app-secret.yaml.example           # Secret application (à créer)
├── app-deployment.yaml               # Deployment Anjou Explore (1 replica)
├── app-service.yaml                  # Service ClusterIP app
├── ingressroute.yaml                 # ⭐ Traefik IngressRoute (recommandé)
├── ingress.yaml.deprecated           # Ingress K8s standard (déprécié)
├── backup-pvc.yaml                   # PVC Longhorn 2Gi pour backups
├── backup-cronjob.yaml               # CronJob pg_dump quotidien (2h)
├── backup-s3-secret.yaml.example     # Secret S3 (optionnel)
├── backup-s3-cronjob.yaml            # CronJob sync S3 hebdomadaire (optionnel)
└── pgadmin/                          # pgAdmin (optionnel)
    ├── pgadmin-pvc.yaml
    ├── pgadmin-secret.yaml.example
    ├── pgadmin-deployment.yaml
    ├── pgadmin-service.yaml
    ├── pgadmin-ingressroute.yaml      # ⭐ Traefik IngressRoute (recommandé)
    └── pgadmin-ingress.yaml.deprecated # Ingress K8s standard (déprécié)
```

## ⚠️ Ingress vs IngressRoute

Ce projet propose **deux méthodes** d'exposition :

### Option 1 : IngressRoute (Traefik natif) - **Recommandé**

```bash
kubectl apply -f k8s/ingressroute.yaml
kubectl apply -f k8s/pgadmin/pgadmin-ingressroute.yaml
```

**Avantages :**
- ✅ Performance optimale (pas de conversion interne)
- ✅ Accès à toutes les fonctionnalités Traefik
- ✅ Configuration plus propre (pas d'annotations string)
- ✅ Type-safety YAML
- ✅ Standard dans ce homelab

**Utilise le certificat wildcard** : `ratons-ovh-wildcard-tls` (géré par Reflector)

### Option 2 : Ingress (K8s standard) - Déprécié

```bash
kubectl apply -f k8s/ingress.yaml.deprecated
kubectl apply -f k8s/pgadmin/pgadmin-ingress.yaml.deprecated
```

**Avantages :**
- ✅ Portable entre ingress controllers
- ✅ Standard Kubernetes

**Inconvénients :**
- ⚠️ Annotations string (risque d'erreurs)
- ⚠️ Conversion interne par Traefik
- ⚠️ Fonctionnalités limitées

**Génère un certificat séparé** via cert-manager

## 🚀 Déploiement initial

### 1. Prérequis

- Cluster K3s opérationnel avec :
  - Traefik Ingress Controller
  - cert-manager (Let's Encrypt)
  - Longhorn (StorageClass)
  - Harbor registry accessible
  - Secret `harbor-registry` créé dans le namespace
  - Certificat wildcard `ratons-ovh-wildcard-tls` avec Reflector

### 2. Synchroniser le certificat wildcard

**Ajouter le namespace `anjouexplore` dans le certificat wildcard :**

```bash
kubectl edit certificate ratons-ovh-wildcard -n traefik

# Ajouter "anjouexplore" dans les annotations Reflector :
# reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "...,anjouexplore"
# reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "...,anjouexplore"
```

**Vérifier que le certificat est copié :**

```bash
kubectl get secret ratons-ovh-wildcard-tls -n anjouexplore
```

### 3. Créer les Secrets

```bash
# PostgreSQL
cp k8s/postgres-secret.yaml.example k8s/postgres-secret.yaml
# Éditer et remplacer CHANGEME_STRONG_PASSWORD
kubectl apply -f k8s/postgres-secret.yaml

# Application
cp k8s/app-secret.yaml.example k8s/app-secret.yaml
# Éditer et remplacer toutes les valeurs CHANGEME
kubectl apply -f k8s/app-secret.yaml

# S3 Backup (optionnel)
cp k8s/backup-s3-secret.yaml.example k8s/backup-s3-secret.yaml
# Éditer les credentials S3
kubectl apply -f k8s/backup-s3-secret.yaml

# pgAdmin (optionnel)
cp k8s/pgadmin/pgadmin-secret.yaml.example k8s/pgadmin/pgadmin-secret.yaml
# Éditer le mot de passe pgAdmin
kubectl apply -f k8s/pgadmin/pgadmin-secret.yaml
```

### 4. Déployer l'infrastructure

```bash
# Namespace et RBAC
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml

# ConfigMap
kubectl apply -f k8s/app-configmap.yaml

# PostgreSQL
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/postgres-statefulset.yaml

# Attendre que PostgreSQL soit prêt
kubectl wait --for=condition=ready pod -l app=postgres -n anjouexplore --timeout=5m

# Backups
kubectl apply -f k8s/backup-pvc.yaml
kubectl apply -f k8s/backup-cronjob.yaml
kubectl apply -f k8s/backup-s3-cronjob.yaml  # Optionnel

# Application (déployée par CI/CD normalement)
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml
kubectl apply -f k8s/ingressroute.yaml  # ⭐ IngressRoute natif Traefik

# Attendre le rollout
kubectl rollout status deployment/anjouexplore-app -n anjouexplore --timeout=5m
```

### 5. Déployer pgAdmin (optionnel)

```bash
kubectl apply -f k8s/pgadmin/pgadmin-pvc.yaml
kubectl apply -f k8s/pgadmin/pgadmin-deployment.yaml
kubectl apply -f k8s/pgadmin/pgadmin-service.yaml
kubectl apply -f k8s/pgadmin/pgadmin-ingressroute.yaml  # ⭐ Avec Authelia 2FA
```

## 🔍 Vérification

```bash
# Pods
kubectl get pods -n anjouexplore

# Services
kubectl get svc -n anjouexplore

# IngressRoute (Traefik)
kubectl get ingressroute -n anjouexplore

# Logs application
kubectl logs -n anjouexplore -l app=anjouexplore --tail=100 -f

# Logs PostgreSQL
kubectl logs -n anjouexplore -l app=postgres --tail=100 -f
```

## 🗄️ Accès à la base de données

### Option A : pgAdmin via IngressRoute (si déployé)

Accéder à : `https://pgadmin.anjouexplore.ratons.ovh`

- Protection Authelia 2FA automatique
- Se connecter avec les credentials du secret pgAdmin
- Ajouter le serveur PostgreSQL :
  - Host : `postgres`
  - Port : `5432`
  - Database : `anjouexplore`
  - Username/Password : depuis `postgres-secret`

### Option B : Port-forward kubectl + DBeaver

```bash
# Terminal 1 : Créer le tunnel
kubectl port-forward -n anjouexplore svc/postgres 5432:5432

# Terminal 2 : Se connecter avec DBeaver/pgAdmin local
# Host: localhost
# Port: 5432
# Database: anjouexplore
# User/Password: depuis postgres-secret
```

### Option C : Bastion Pod temporaire

```bash
# Lancer un pod avec psql
kubectl run -it --rm psql \
  --image=postgres:18.1-alpine \
  --namespace=anjouexplore \
  --restart=Never \
  --env="PGPASSWORD=$(kubectl get secret postgres-secret -n anjouexplore -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d)" \
  -- psql -h postgres -U anjouexplore -d anjouexplore
```

## 💾 Gestion des backups

### Backups automatiques

- **Niveau 1** : Snapshots Longhorn (configuration du cluster)
- **Niveau 2** : pg_dump quotidien à 2h (CronJob)
- **Niveau 3** : Sync S3 hebdomadaire dimanche 3h (CronJob optionnel)

### Backup manuel

```bash
# Lancer le job de backup immédiatement
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n anjouexplore

# Voir les logs
kubectl logs -n anjouexplore -l job-name=manual-backup-XXX -f
```

### Restauration depuis backup

```bash
# 1. Lister les backups disponibles
kubectl exec -n anjouexplore -it statefulset/postgres -- ls -lh /backups

# 2. Copier un backup localement
kubectl cp anjouexplore/postgres-0:/backups/anjouexplore_backup_YYYYMMDD_HHMMSS.sql.gz ./backup.sql.gz

# 3. Décompresser
gunzip backup.sql.gz

# 4. Restaurer
kubectl exec -i -n anjouexplore statefulset/postgres -- \
  psql -U anjouexplore -d anjouexplore < backup.sql
```

### Restauration depuis S3

```bash
# Lister les backups S3
kubectl run -it --rm rclone \
  --image=rclone/rclone \
  --namespace=anjouexplore \
  --restart=Never \
  --env-from=secret/s3-backup-secret \
  -- rclone ls s3remote:anjouexplore-backups/postgres-backups

# Télécharger depuis S3
kubectl run -it --rm rclone \
  --image=rclone/rclone \
  --namespace=anjouexplore \
  --restart=Never \
  --env-from=secret/s3-backup-secret \
  -- rclone copy s3remote:anjouexplore-backups/postgres-backups/backup_YYYYMMDD.sql.gz /tmp/

# Ensuite restaurer comme ci-dessus
```

## 🔄 Mise à jour de l'application

La mise à jour est automatique via CI/CD (Gitea Actions) :

1. Push vers `main` → Build image → Push Harbor → Deploy K8s
2. Les migrations Prisma sont exécutées automatiquement avant le deploy
3. Rollout automatique du Deployment

### Mise à jour manuelle

```bash
# Forcer le pull de la nouvelle image
kubectl rollout restart deployment/anjouexplore-app -n anjouexplore

# Suivre le rollout
kubectl rollout status deployment/anjouexplore-app -n anjouexplore --timeout=5m
```

## ↩️ Rollback

```bash
# Voir l'historique
kubectl rollout history deployment/anjouexplore-app -n anjouexplore

# Rollback vers version précédente
kubectl rollout undo deployment/anjouexplore-app -n anjouexplore

# Rollback vers révision spécifique
kubectl rollout undo deployment/anjouexplore-app -n anjouexplore --to-revision=3
```

## 📏 Scaling

```bash
# Augmenter le nombre de replicas
kubectl scale deployment/anjouexplore-app -n anjouexplore --replicas=2

# Vérifier
kubectl get pods -n anjouexplore -l app=anjouexplore
```

## 🧹 Nettoyage complet

⚠️ **ATTENTION : Ceci supprime TOUTES les données !**

```bash
# Supprimer l'application
kubectl delete -f k8s/app-deployment.yaml
kubectl delete -f k8s/app-service.yaml
kubectl delete -f k8s/ingressroute.yaml

# Supprimer PostgreSQL
kubectl delete -f k8s/postgres-statefulset.yaml
kubectl delete -f k8s/postgres-service.yaml
kubectl delete pvc postgres-pvc -n anjouexplore  # ⚠️ Données supprimées

# Supprimer les backups
kubectl delete -f k8s/backup-cronjob.yaml
kubectl delete pvc backup-pvc -n anjouexplore  # ⚠️ Backups supprimés

# Supprimer le namespace (tout)
kubectl delete namespace anjouexplore
```

## 🔧 Troubleshooting

### Pods en erreur

```bash
# Voir les logs
kubectl logs -n anjouexplore <pod-name> -f

# Décrire le pod
kubectl describe pod -n anjouexplore <pod-name>

# Entrer dans le pod
kubectl exec -it -n anjouexplore <pod-name> -- /bin/sh
```

### Base de données inaccessible

```bash
# Tester la connexion depuis l'app
kubectl exec -it -n anjouexplore deployment/anjouexplore-app -- \
  bun -e "import {prisma} from './src/lib/db/client'; await prisma.\$queryRaw\`SELECT 1\`; console.log('OK')"
```

### IngressRoute ne fonctionne pas

```bash
# Vérifier l'IngressRoute
kubectl describe ingressroute anjouexplore -n anjouexplore

# Vérifier le certificat TLS wildcard
kubectl get secret ratons-ovh-wildcard-tls -n anjouexplore
kubectl describe secret ratons-ovh-wildcard-tls -n anjouexplore

# Logs Traefik
kubectl logs -n traefik -l app.kubernetes.io/name=traefik -f
```

### Certificat wildcard non copié

```bash
# Vérifier Reflector
kubectl get pods -n kube-system -l app.kubernetes.io/name=reflector

# Vérifier les annotations du Certificate
kubectl get certificate ratons-ovh-wildcard -n traefik -o yaml | grep -A5 annotations

# Forcer la copie (redémarrer Reflector)
kubectl rollout restart deployment reflector -n kube-system
```

## 📚 Ressources

- [CLAUDE_DEPLOY.md](../CLAUDE_DEPLOY.md) : Guide de déploiement général
- [CLAUDE_K3S.md](../CLAUDE_K3S.md) : Spécificités K3s homelab
- [CLAUDE_CICD.md](../CLAUDE_CICD.md) : Pipeline Gitea Actions
- [.env.production.example](../.env.production.example) : Template variables prod
- [Traefik IngressRoute](https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/) : Documentation officielle
