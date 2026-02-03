# CLAUDE_DEPLOY.md

Guide de déploiement pour Anjou Explore - Docker, Kubernetes, CI/CD

**Contexte spécialisé pour les tâches de déploiement et infrastructure.**
Pour le contexte général du projet, voir [CLAUDE.md](CLAUDE.md).
Pour l'historique des phases de développement, voir [CLAUDE_PHASES.md](CLAUDE_PHASES.md).

---

## Stack de Déploiement

- **Containerisation** : Docker + Docker Compose
- **Orchestration** : Kubernetes (à configurer)
- **CI/CD** : GitHub Actions (à configurer)
- **Base de données** : PostgreSQL 16 (container)
- **Runtime** : Bun (Node.js compatible)
- **Reverse Proxy** : Nginx (à configurer)
- **Monitoring** : À définir (Prometheus/Grafana ?)
- **Logs** : À définir (ELK stack ?)

---

## Structure Docker

### Dockerfile (Application Astro + Bun)

**À créer** : `Dockerfile` à la racine du projet

```dockerfile
# Exemple de structure (à adapter)
FROM oven/bun:1-alpine AS base

WORKDIR /app

# Copier package.json et lock
COPY package.json bun.lockb ./

# Installer dépendances
RUN bun install --frozen-lockfile --production

# Copier le code source
COPY . .

# Générer client Prisma
RUN bunx prisma generate

# Build Astro
RUN bun run build

# Port exposé
EXPOSE 4321

# Commande de démarrage
CMD ["bun", "run", "start"]
```

**Points d'attention** :
- Utiliser `oven/bun:1-alpine` pour image légère
- Multi-stage build pour réduire taille finale
- Variables d'environnement via `.env` ou Kubernetes secrets
- Volume pour uploads/assets si nécessaire

### Docker Compose (Full Stack)

**Existe déjà** : `docker-compose.yml` (PostgreSQL + pgAdmin)

**À améliorer** :
```yaml
version: '3.8'

services:
  # Base de données
  postgres:
    image: postgres:16-alpine
    container_name: anjouexplore-db
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - anjouexplore-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Application Astro
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: anjouexplore-app
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      SUMUP_API_KEY: ${SUMUP_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      # ... autres variables
    ports:
      - "4321:4321"
    networks:
      - anjouexplore-network
    restart: unless-stopped

  # pgAdmin (optionnel en prod)
  pgadmin:
    image: dpage/pgadmin4
    container_name: anjouexplore-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "5050:80"
    networks:
      - anjouexplore-network
    depends_on:
      - postgres

volumes:
  postgres_data:

networks:
  anjouexplore-network:
    driver: bridge
```

---

## Kubernetes Configuration

### Namespace

**À créer** : `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: anjouexplore
```

### ConfigMap (Variables non-sensibles)

**À créer** : `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: anjouexplore-config
  namespace: anjouexplore
data:
  NODE_ENV: "production"
  APP_URL: "https://anjouexplore.fr"
  EMAIL_FROM: "anjouexplore@gmail.com"
  # ... autres variables publiques
```

### Secret (Variables sensibles)

**À créer** : `k8s/secret.yaml` (ne PAS commiter avec vraies valeurs)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: anjouexplore-secrets
  namespace: anjouexplore
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres:5432/anjouexplore"
  JWT_SECRET: "changeme"
  ADMIN_SHARED_PASSWORD: "changeme"
  SUMUP_API_KEY: "sup_sk_xxx"
  RESEND_API_KEY: "re_xxx"
  # ... autres secrets
```

**Commande pour créer depuis .env (production)** :
```bash
kubectl create secret generic anjouexplore-secrets \
  --from-env-file=.env.production \
  --namespace=anjouexplore
```

### Deployment (PostgreSQL)

**À créer** : `k8s/postgres-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: anjouexplore
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: anjouexplore-secrets
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: anjouexplore-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: "anjouexplore"
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: anjouexplore
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### PersistentVolumeClaim (PostgreSQL)

**À créer** : `k8s/postgres-pvc.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: anjouexplore
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard  # À adapter selon le cloud provider
```

### Deployment (Application Astro)

**À créer** : `k8s/app-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: anjouexplore-app
  namespace: anjouexplore
spec:
  replicas: 2  # Haute disponibilité
  selector:
    matchLabels:
      app: anjouexplore-app
  template:
    metadata:
      labels:
        app: anjouexplore-app
    spec:
      containers:
      - name: app
        image: <registry>/anjouexplore:latest  # À remplacer par vraie image
        ports:
        - containerPort: 4321
        envFrom:
        - configMapRef:
            name: anjouexplore-config
        - secretRef:
            name: anjouexplore-secrets
        livenessProbe:
          httpGet:
            path: /api/health  # À créer
            port: 4321
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 4321
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: anjouexplore-app
  namespace: anjouexplore
spec:
  selector:
    app: anjouexplore-app
  ports:
  - port: 80
    targetPort: 4321
  type: ClusterIP
```

### Ingress (Nginx)

**À créer** : `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: anjouexplore-ingress
  namespace: anjouexplore
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - anjouexplore.fr
    - www.anjouexplore.fr
    secretName: anjouexplore-tls
  rules:
  - host: anjouexplore.fr
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: anjouexplore-app
            port:
              number: 80
  - host: www.anjouexplore.fr
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: anjouexplore-app
            port:
              number: 80
```

---

## CI/CD avec GitHub Actions

### Workflow Build & Deploy

**À créer** : `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test  # À créer

      - name: Build
        run: bun run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'latest'

      - name: Configure kubeconfig
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/ --namespace=anjouexplore
          kubectl rollout status deployment/anjouexplore-app --namespace=anjouexplore
```

---

## Variables d'Environnement Production

### Fichier `.env.production` (NE PAS COMMITER)

```bash
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/anjouexplore"
POSTGRES_USER="anjouexplore"
POSTGRES_PASSWORD="<strong-password>"
POSTGRES_DB="anjouexplore"

# App
NODE_ENV="production"
APP_URL="https://anjouexplore.fr"

# Auth
ADMIN_SHARED_PASSWORD="<bcrypt-hash>"
JWT_SECRET="<random-64-chars>"
JWT_EXPIRATION_HOURS="24"
ADMIN_URL_SECRET="<secret-path>"
ENABLE_2FA="true"  # Toujours true en prod

# Email
RESEND_API_KEY="re_xxx"
EMAIL_FROM="anjouexplore@gmail.com"

# Payment
SUMUP_API_KEY="sup_sk_xxx"
SUMUP_MERCHANT_CODE="M74XACCM"
SUMUP_PAY_TO_EMAIL="adrienlem2@gmail.com"

# Security
CORS_ORIGINS="https://anjouexplore.fr,https://www.anjouexplore.fr"
COOKIE_SECURE="true"

# pgAdmin (si utilisé en prod)
PGADMIN_EMAIL="admin@anjouexplore.fr"
PGADMIN_PASSWORD="<strong-password>"
```

---

## Commandes de Déploiement

### Docker Compose (Développement local)

```bash
# Démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f app

# Arrêter
docker-compose down

# Rebuild
docker-compose up -d --build
```

### Kubernetes

```bash
# Créer le namespace
kubectl apply -f k8s/namespace.yaml

# Créer les secrets
kubectl create secret generic anjouexplore-secrets \
  --from-env-file=.env.production \
  --namespace=anjouexplore

# Appliquer tous les manifests
kubectl apply -f k8s/ --namespace=anjouexplore

# Vérifier le déploiement
kubectl get pods -n anjouexplore
kubectl get services -n anjouexplore
kubectl get ingress -n anjouexplore

# Voir les logs
kubectl logs -f deployment/anjouexplore-app -n anjouexplore

# Redémarrer l'app (après push image)
kubectl rollout restart deployment/anjouexplore-app -n anjouexplore

# Vérifier le statut
kubectl rollout status deployment/anjouexplore-app -n anjouexplore
```

### Migrations Prisma en Production

```bash
# Depuis le pod de l'application
kubectl exec -it deployment/anjouexplore-app -n anjouexplore -- bun run db:migrate

# Ou via job Kubernetes (recommandé)
# Créer k8s/migration-job.yaml
```

---

## Health Check Endpoint

**À créer** : `src/pages/api/health.ts`

```typescript
import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db/client';

export const GET: APIRoute = async () => {
  try {
    // Vérifier la connexion DB
    await prisma.$queryRaw`SELECT 1`;

    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
```

---

## Sécurité Production

### Checklist

- [ ] **HTTPS obligatoire** : Ingress avec cert-manager + Let's Encrypt
- [ ] **Secrets Kubernetes** : Ne jamais commiter de secrets
- [ ] **Variables sensibles** : Utiliser Kubernetes Secrets ou vault externe
- [ ] **2FA activé** : `ENABLE_2FA=true` en production (override automatique)
- [ ] **Cookies sécurisés** : `COOKIE_SECURE=true` avec HTTPS
- [ ] **CORS strict** : Limiter `CORS_ORIGINS` aux domaines autorisés
- [ ] **Rate limiting** : À implémenter (nginx ingress annotations)
- [ ] **WAF** : Considérer Cloudflare ou équivalent
- [ ] **Backups DB** : Cronjob automatique (voir section suivante)
- [ ] **Monitoring** : Prometheus + Grafana pour métriques
- [ ] **Logs centralisés** : ELK stack ou équivalent
- [ ] **Scans de vulnérabilités** : Trivy ou Snyk sur images Docker

### Rate Limiting (Nginx Ingress)

Ajouter dans `k8s/ingress.yaml` :
```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"  # 10 requêtes/sec par IP
    nginx.ingress.kubernetes.io/limit-connections: "5"
```

---

## Monitoring & Logging

### Prometheus + Grafana (À configurer)

```bash
# Installer via Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

### Métriques Custom (À implémenter)

**À créer** : Endpoint `/api/metrics` pour Prometheus

```typescript
// Compter réservations, revenus, erreurs, temps de réponse, etc.
```

### Logs

- **Stdout/stderr** : Capturés automatiquement par Kubernetes
- **Agrégation** : ELK stack, Loki, ou service cloud (AWS CloudWatch, GCP Logging)
- **Alertes** : Configurer alertes sur erreurs critiques

---

## Backup & Restore

### Backup PostgreSQL (CronJob)

**À créer** : `k8s/backup-cronjob.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: anjouexplore
spec:
  schedule: "0 2 * * *"  # Tous les jours à 2h du matin
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump $DATABASE_URL > /backups/backup_$TIMESTAMP.sql
              # Garder seulement les 7 derniers backups
              ls -t /backups/*.sql | tail -n +8 | xargs rm -f
            envFrom:
            - secretRef:
                name: anjouexplore-secrets
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Restore Manuelle

```bash
# Copier backup depuis pod vers local
kubectl cp anjouexplore/postgres-xxx:/backups/backup_20260201_020000.sql ./backup.sql

# Restore
kubectl exec -it deployment/postgres -n anjouexplore -- \
  psql -U anjouexplore -d anjouexplore < backup.sql
```

---

## Rollback

### Docker Compose

```bash
# Voir les images précédentes
docker images

# Modifier docker-compose.yml avec image précédente
# Redémarrer
docker-compose up -d
```

### Kubernetes

```bash
# Voir l'historique des déploiements
kubectl rollout history deployment/anjouexplore-app -n anjouexplore

# Rollback vers version précédente
kubectl rollout undo deployment/anjouexplore-app -n anjouexplore

# Rollback vers révision spécifique
kubectl rollout undo deployment/anjouexplore-app -n anjouexplore --to-revision=3
```

---

## Troubleshooting Production

### Pods crashent

```bash
# Voir les logs
kubectl logs -f pod/anjouexplore-app-xxx -n anjouexplore

# Voir les events
kubectl describe pod/anjouexplore-app-xxx -n anjouexplore

# Entrer dans le pod
kubectl exec -it pod/anjouexplore-app-xxx -n anjouexplore -- /bin/sh
```

### Base de données inaccessible

```bash
# Vérifier le service PostgreSQL
kubectl get svc postgres -n anjouexplore

# Tester la connexion depuis l'app pod
kubectl exec -it deployment/anjouexplore-app -n anjouexplore -- \
  psql $DATABASE_URL -c "SELECT 1"
```

### Ingress ne fonctionne pas

```bash
# Vérifier l'ingress controller
kubectl get pods -n ingress-nginx

# Vérifier les logs
kubectl logs -f deployment/nginx-ingress-controller -n ingress-nginx

# Vérifier le certificat TLS
kubectl get certificate -n anjouexplore
kubectl describe certificate anjouexplore-tls -n anjouexplore
```

---

## TODO Deployment

- [ ] Créer `Dockerfile` optimisé multi-stage
- [ ] Créer tous les manifests Kubernetes (`k8s/`)
- [ ] Configurer GitHub Actions (`.github/workflows/deploy.yml`)
- [ ] Créer endpoint `/api/health` pour health checks
- [ ] Implémenter rate limiting (nginx ingress)
- [ ] Configurer Prometheus + Grafana
- [ ] Configurer backups automatiques PostgreSQL
- [ ] Configurer alertes (Slack, email, PagerDuty)
- [ ] Documenter procédures de rollback
- [ ] Tester déploiement complet sur environnement staging
- [ ] Configurer domaine `anjouexplore.fr` avec DNS
- [ ] Configurer certificats SSL (Let's Encrypt)
- [ ] Migration des données Wix → PostgreSQL (si nécessaire)
- [ ] Tests de charge (k6, Artillery)

---

## Ressources Utiles

- **Astro Deployment** : https://docs.astro.build/en/guides/deploy/
- **Bun Docker** : https://bun.sh/docs/install/docker
- **Kubernetes Docs** : https://kubernetes.io/docs/home/
- **Nginx Ingress** : https://kubernetes.github.io/ingress-nginx/
- **Cert-Manager** : https://cert-manager.io/docs/
- **Prisma Production** : https://www.prisma.io/docs/guides/deployment
- **GitHub Actions** : https://docs.github.com/en/actions
