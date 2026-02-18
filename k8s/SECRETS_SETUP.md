# 🔐 Configuration des Secrets Kubernetes

Guide pas-à-pas pour configurer tous les secrets nécessaires au déploiement.

## 📋 Checklist

- [ ] Secret PostgreSQL
- [ ] Secret Application
- [ ] Secret S3 Backup (optionnel)
- [ ] Secret pgAdmin (optionnel)
- [ ] Secret Harbor Registry (vérifié existant)

## 1️⃣ Secret PostgreSQL

```bash
# Créer le fichier
cp k8s/postgres-secret.yaml.example k8s/postgres-secret.yaml

# Éditer
nano k8s/postgres-secret.yaml
```

**Variables à remplacer :**

```yaml
POSTGRES_USER: "anjouexplore"
POSTGRES_PASSWORD: "CHANGEME"  # ⚠️ Générer un mot de passe fort
DATABASE_URL: "postgresql://anjouexplore:CHANGEME@postgres:5432/anjouexplore?schema=public"
```

**Générer un mot de passe sécurisé :**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Ou utiliser un gestionnaire de mots de passe
```

**Appliquer :**

```bash
kubectl apply -f k8s/postgres-secret.yaml
```

## 2️⃣ Secret Application

```bash
# Créer le fichier
cp k8s/app-secret.yaml.example k8s/app-secret.yaml

# Éditer
nano k8s/app-secret.yaml
```

### Variables critiques

#### A. DATABASE_URL
Doit être identique à celui de postgres-secret :
```yaml
DATABASE_URL: "postgresql://anjouexplore:VOTREMOTDEPASSE@postgres:5432/anjouexplore?schema=public"
```

> **Note sur les mots de passe admins** : Les mots de passe des administrateurs (José, Fabien, Benoît, Adrien) sont stockés individuellement dans la base de données (table `Admin`). Ils sont configurés lors du seed initial avec `bun run db:seed`. Il n'y a plus de mot de passe partagé.

#### B. JWT_SECRET (64+ caractères)

**Générer :**

```bash
# Linux/Mac/Git Bash
openssl rand -hex 32

# Exemple de sortie:
# 8f3d2a1b5c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
```

**Utiliser :**

```yaml
JWT_SECRET: "8f3d2a1b5c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2"
```

#### C. RESEND_API_KEY

Récupérer sur [resend.com/api-keys](https://resend.com/api-keys) :

1. Se connecter à Resend
2. API Keys → Create API Key
3. Copier la clé (format : `re_xxxxxxxxxxxxx`)

```yaml
RESEND_API_KEY: "re_xxxxxxxxxxxxx"
```

#### D. SUMUP_API_KEY

Récupérer sur [developer.sumup.com](https://developer.sumup.com/) :

1. Se connecter au compte SumUp
2. Developer Portal → API Keys
3. Copier la clé (format : `sup_sk_xxxxxxxxxxxxx`)

```yaml
SUMUP_API_KEY: "sup_sk_xxxxxxxxxxxxx"
SUMUP_MERCHANT_CODE: "M74XACCM"
SUMUP_PAY_TO_EMAIL: "adrienlem2@gmail.com"
```

### Fichier complet exemple

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: anjouexplore-secret
  namespace: anjouexplore
type: Opaque
stringData:
  # Database
  DATABASE_URL: "postgresql://anjouexplore:VotreMotDePasseDB@postgres:5432/anjouexplore?schema=public"

  # Auth & Security
  # Note : Les mots de passe admins sont stockés individuellement en BDD (table Admin)
  JWT_SECRET: "8f3d2a1b5c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2"

  # Email (Resend)
  RESEND_API_KEY: "re_VotreClé"

  # Payment (SumUp)
  SUMUP_API_KEY: "sup_sk_VotreClé"
  SUMUP_MERCHANT_CODE: "M74XACCM"
  SUMUP_PAY_TO_EMAIL: "adrienlem2@gmail.com"
```

**Appliquer :**

```bash
kubectl apply -f k8s/app-secret.yaml
```

## 3️⃣ Secret S3 Backup (Optionnel)

Pour les backups hebdomadaires vers Scaleway/AWS S3.

```bash
cp k8s/backup-s3-secret.yaml.example k8s/backup-s3-secret.yaml
nano k8s/backup-s3-secret.yaml
```

### Scaleway Object Storage

1. Se connecter à [console.scaleway.com](https://console.scaleway.com)
2. Object Storage → Create Bucket
   - Nom : `anjouexplore-backups`
   - Région : `fr-par` (Paris)
3. API Keys → Generate API Key
   - Access Key ID
   - Secret Access Key

```yaml
stringData:
  S3_ENDPOINT: "https://s3.fr-par.scw.cloud"
  S3_BUCKET: "anjouexplore-backups"
  S3_ACCESS_KEY_ID: "VotreAccessKeyID"
  S3_SECRET_ACCESS_KEY: "VotreSecretAccessKey"
  S3_REGION: "fr-par"
```

**Appliquer :**

```bash
kubectl apply -f k8s/backup-s3-secret.yaml
kubectl apply -f k8s/backup-s3-cronjob.yaml
```

## 4️⃣ Secret pgAdmin (Optionnel)

Si vous déployez pgAdmin pour accéder à la base de données.

```bash
cp k8s/pgadmin/pgadmin-secret.yaml.example k8s/pgadmin/pgadmin-secret.yaml
nano k8s/pgadmin/pgadmin-secret.yaml
```

```yaml
stringData:
  PGADMIN_DEFAULT_EMAIL: "admin@ratons.ovh"
  PGADMIN_DEFAULT_PASSWORD: "VotreMotDePassePgAdmin"
```

**Appliquer :**

```bash
kubectl apply -f k8s/pgadmin/pgadmin-secret.yaml
```

## 5️⃣ Secret Harbor Registry

**À vérifier** : Ce secret doit déjà exister dans votre cluster.

```bash
kubectl get secret harbor-registry -n anjouexplore
```

Si absent, le créer :

```bash
kubectl create secret docker-registry harbor-registry \
  --docker-server=harbor.ratons.ovh \
  --docker-username=votre-username \
  --docker-password=votre-password \
  --namespace=anjouexplore
```

## ✅ Vérification finale

```bash
# Vérifier tous les secrets
kubectl get secrets -n anjouexplore

# Devrait afficher:
# NAME                    TYPE                             DATA   AGE
# anjouexplore-secret     Opaque                           6      1m
# postgres-secret         Opaque                           4      2m
# s3-backup-secret        Opaque                           5      1m    (optionnel)
# pgadmin-secret          Opaque                           2      1m    (optionnel)
# harbor-registry         kubernetes.io/dockerconfigjson   1      XXd

# Vérifier le contenu d'un secret (décoder base64)
kubectl get secret anjouexplore-secret -n anjouexplore -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

## 🔒 Sécurité

- ✅ **Ne JAMAIS commiter** les fichiers `*-secret.yaml` dans Git
- ✅ **Backuper** les secrets dans un gestionnaire de mots de passe (1Password, Bitwarden, etc.)
- ✅ **Rotation** : Changer les secrets périodiquement (tous les 6 mois)
- ✅ **Accès limité** : Seuls les admins cluster peuvent lire les secrets K8s

## 📝 Template de sauvegarde sécurisée

Créer un fichier local **NON COMMITÉ** avec vos valeurs :

```bash
# secrets-backup.txt (À GARDER EN SÉCURITÉ)

=== PostgreSQL ===
POSTGRES_PASSWORD=...
DATABASE_URL=...

=== Application ===
JWT_SECRET=...

Note: Les mots de passe admins (José, Fabien, Benoît, Adrien) sont dans la BDD.
Pour les réinitialiser: kubectl exec -it deployment/anjouexplore-app -- bun run db:seed

=== APIs ===
RESEND_API_KEY=...
SUMUP_API_KEY=...

=== S3 ===
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

=== pgAdmin ===
PGADMIN_PASSWORD=...
```

Sauvegarder dans un gestionnaire de mots de passe sécurisé.

## 🆘 Problèmes courants

### Secret non trouvé

```bash
# Erreur: secrets "anjouexplore-secret" not found
kubectl get secrets -n anjouexplore

# Vérifier le namespace
kubectl config set-context --current --namespace=anjouexplore
```

### Mot de passe admin oublié

```bash
# Réinitialiser tous les mots de passe admins
kubectl exec -it -n anjouexplore deployment/anjouexplore-app -- bun run db:seed

# Ou modifier un seul admin en BDD via pgAdmin/bastion pod
```

### Base de données inaccessible

```bash
# Tester la connexion
kubectl exec -it -n anjouexplore deployment/anjouexplore-app -- \
  bun -e "import {prisma} from './src/lib/db/client'; await prisma.\$connect(); console.log('OK')"
```

---

**Prochaine étape** : [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Déployer l'infrastructure
