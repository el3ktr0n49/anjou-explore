# Contexte Kubernetes K3s - Homelab

Ce document décrit l'infrastructure Kubernetes K3s et ses spécificités pour référence future dans d'autres projets.

## Infrastructure générale

### Cluster
- **K3s** (lightweight Kubernetes)
- Domaine principal : `*.ratons.ovh`
- Namespace par défaut : `default` (mais possibilité d'utiliser d'autres namespaces)

### Composants clés
- **Traefik** : Ingress controller et reverse proxy
- **Authelia** : SSO et authentification 2FA
- **cert-manager** : Gestion automatique des certificats Let's Encrypt
- **Harbor** : Registry Docker privé (`harbor.ratons.ovh`)
- **Longhorn** : Solution de stockage persistant
- **CrowdSec** : IPS/IDS pour la sécurité

## Structure type des manifests Kubernetes

### Organisation des fichiers
```
k8s/
├── rbac.yaml        # ServiceAccount, ClusterRole, ClusterRoleBinding
├── configmap.yaml   # Configuration applicative
├── deployment.yaml  # Déploiement de l'application
├── service.yaml     # Service ClusterIP
└── ingress.yaml     # Exposition via Traefik
```

## 1. RBAC (rbac.yaml)

### ServiceAccount
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: [app-name]
  namespace: default
```

### ClusterRole (si accès Kubernetes API requis)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: [app-name]-role
rules:
  # Lecture des Ingresses
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch"]

  # Lecture des Services
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list"]

  # Lecture des ConfigMaps
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]
```

### ClusterRoleBinding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: [app-name]-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: [app-name]-role
subjects:
  - kind: ServiceAccount
    name: [app-name]
    namespace: default
```

## 2. Deployment (deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: [app-name]
  namespace: default
  labels:
    app: [app-name]
    version: v1.0.0
spec:
  replicas: 1
  selector:
    matchLabels:
      app: [app-name]
  template:
    metadata:
      labels:
        app: [app-name]
        version: v1.0.0
    spec:
      serviceAccountName: [app-name]
      imagePullSecrets:
        - name: harbor-registry  # Secret pour Harbor
      containers:
        - name: [app-name]
          image: harbor.ratons.ovh/[project]/[app-name]:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          env:
            - name: PORT
              value: "3000"
            - name: NODE_ENV
              value: "production"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
      restartPolicy: Always
```

**Notes importantes:**
- Toujours utiliser `imagePullSecrets: [name: harbor-registry]` pour Harbor
- `imagePullPolicy: Always` pour forcer le pull des images latest
- Security context strict pour la conformité
- Volume emptyDir pour `/tmp` avec readOnlyRootFilesystem

## 3. Service (service.yaml)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: [app-name]
  namespace: default
  labels:
    app: [app-name]
spec:
  type: ClusterIP
  selector:
    app: [app-name]
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  sessionAffinity: None
```

**Note:** Toujours utiliser `ClusterIP` (exposition via Ingress uniquement)

## 4. Ingress avec Traefik (ingress.yaml)

### Structure de base
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: [app-name]
  namespace: default
  labels:
    app: [app-name]
  annotations:
    # === TRAEFIK ===
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"

    # === CERT-MANAGER (Let's Encrypt) ===
    cert-manager.io/cluster-issuer: letsencrypt-prod

    # === MIDDLEWARES TRAEFIK ===
    traefik.ingress.kubernetes.io/router.middlewares: >-
      [middleware-1],
      [middleware-2]

    # === MÉTADONNÉES ===
    app.kubernetes.io/name: [app-name]
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/description: "[Description]"
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - [subdomain].ratons.ovh
      secretName: [app-name]-tls
  rules:
    - host: [subdomain].ratons.ovh
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: [app-name]
                port:
                  name: http
```

## Middlewares Traefik disponibles

Les middlewares Traefik sont des composants réutilisables qui s'appliquent aux Ingress.

### Format de référence
```yaml
traefik.ingress.kubernetes.io/router.middlewares: >-
  namespace-middleware-name@kubernetescrd,
  autre-namespace-autre-middleware@kubernetescrd
```

### Middlewares standards du cluster

#### 1. Géo-blocking France uniquement
```yaml
traefik-geoblock-france-only@kubernetescrd
```
Restreint l'accès aux IP françaises uniquement.

#### 2. Authelia SSO/2FA
```yaml
authelia-authelia@kubernetescrd
```
Protection par authentification SSO avec 2FA obligatoire.

#### 3. Chaînage de middlewares (exemple)
```yaml
traefik.ingress.kubernetes.io/router.middlewares: >-
  traefik-geoblock-france-only@kubernetescrd,
  authelia-authelia@kubernetescrd
```
L'ordre est important : géo-blocking d'abord, puis authentification.

## Authelia : Spécificités

### Niveaux de protection

Authelia offre différents niveaux de protection configurables :

1. **Public** : Aucune authentification
2. **One Factor** : Authentification simple (login/password)
3. **Two Factor** : Authentification 2FA obligatoire (TOTP, U2F)

### Configuration dans Authelia

La configuration Authelia se fait via sa ConfigMap, pas dans l'Ingress. Exemple :

```yaml
# ConfigMap Authelia (pas à créer par défaut, juste pour référence)
access_control:
  rules:
    - domain: "*.ratons.ovh"
      policy: two_factor  # two_factor, one_factor, bypass
```

### Application du middleware Authelia

Pour appliquer Authelia à un service :

```yaml
traefik.ingress.kubernetes.io/router.middlewares: authelia-authelia@kubernetescrd
```

Le niveau de protection est ensuite géré dans la configuration Authelia elle-même.

## Certificats TLS avec cert-manager

### Configuration automatique
```yaml
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-prod

spec:
  tls:
    - hosts:
        - [subdomain].ratons.ovh
      secretName: [app-name]-tls
```

**Important:**
- Le secret TLS est créé automatiquement par cert-manager
- Utiliser toujours `letsencrypt-prod` (pas staging)
- Format du secretName : `[app-name]-tls`

## ConfigMap pour métadonnées (optionnel)

Pour les applications qui gèrent plusieurs services (dashboards, etc.) :

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: [app-name]-metadata
  namespace: default
data:
  metadata.json: |
    {
      "default/service-name": {
        "icon": "🔧",
        "description": "Description du service",
        "category": "Catégorie"
      }
    }
```

## Exemples de configurations d'Ingress

### Service public (sans authentification)
```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: websecure
  traefik.ingress.kubernetes.io/router.tls: "true"
  cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Service avec géo-blocking uniquement
```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: websecure
  traefik.ingress.kubernetes.io/router.tls: "true"
  cert-manager.io/cluster-issuer: letsencrypt-prod
  traefik.ingress.kubernetes.io/router.middlewares: traefik-geoblock-france-only@kubernetescrd
```

### Service avec authentification Authelia
```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: websecure
  traefik.ingress.kubernetes.io/router.tls: "true"
  cert-manager.io/cluster-issuer: letsencrypt-prod
  traefik.ingress.kubernetes.io/router.middlewares: authelia-authelia@kubernetescrd
```

### Service avec géo-blocking + Authelia (sécurité maximale)
```yaml
annotations:
  traefik.ingress.kubernetes.io/router.entrypoints: websecure
  traefik.ingress.kubernetes.io/router.tls: "true"
  cert-manager.io/cluster-issuer: letsencrypt-prod
  traefik.ingress.kubernetes.io/router.middlewares: >-
    traefik-geoblock-france-only@kubernetescrd,
    authelia-authelia@kubernetescrd
```

## Commandes kubectl utiles

### Déploiement complet
```bash
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Forcer un redéploiement (pull nouvelle image)
```bash
kubectl rollout restart deployment/[app-name] -n default
kubectl rollout status deployment/[app-name] -n default --timeout=5m
```

### Vérifications
```bash
kubectl get pods -n default -l app=[app-name]
kubectl get svc -n default [app-name]
kubectl get ingress -n default [app-name]
kubectl logs -n default -l app=[app-name] --tail=100 -f
```

### Debug Traefik
```bash
kubectl get middleware -A
kubectl get ingressroute -A
kubectl describe ingress [app-name] -n default
```

## Services du homelab (référence)

Services exposés avec leurs configurations :

- **gitea** (`git.ratons.ovh`) : DevOps - Git forge
- **harbor** (`harbor.ratons.ovh`) : DevOps - Registry Docker
- **homepage** : Dashboard - Dashboard centralisé
- **kubernetes-dashboard** : Admin - Dashboard K8s
- **authelia** : Sécurité - SSO/2FA
- **traefik-dashboard** : Admin - Dashboard Traefik
- **longhorn-frontend** : Stockage - Gestion du stockage
- **crowdsec-dashboard** : Sécurité - IPS/IDS

## Bonnes pratiques

1. **Sécurité** : Utiliser Authelia pour tous les services sensibles
2. **Géo-blocking** : Appliquer pour les services d'administration
3. **TLS** : Toujours utiliser HTTPS avec cert-manager
4. **Namespaces** : Organiser par projet si nécessaire (default par défaut)
5. **Labels** : Toujours ajouter `app`, `version` pour le suivi
6. **Resources** : Définir requests/limits pour tous les conteneurs
7. **Health checks** : Implémenter liveness et readiness probes
8. **Security context** : Appliquer les bonnes pratiques (non-root, etc.)
9. **Secrets Harbor** : Toujours utiliser `imagePullSecrets: [name: harbor-registry]`

## Notes importantes

- Le secret `harbor-registry` doit exister dans le namespace (créé par l'admin)
- Les middlewares Traefik sont gérés globalement (ne pas les créer par projet)
- La configuration Authelia est centralisée (ne pas la modifier par service)
- Les certificats sont automatiquement renouvelés par cert-manager
