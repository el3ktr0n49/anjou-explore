# Contexte CI/CD - Gitea Actions

Ce document décrit l'infrastructure CI/CD pour référence future dans d'autres projets.

## Infrastructure

### Plateforme Git
- **Gitea** hébergé sur `git.ratons.ovh`
- Gitea Actions (compatible GitHub Actions)
- Repository mirroring automatique vers GitHub

### Registry Docker
- **Harbor** privé : `harbor.ratons.ovh`
- Authentification requise via secrets
- Organisation des images : `harbor.ratons.ovh/[project]/[image-name]:[tag]`

### Runners
- Runners Ubuntu latest
- Support Docker-in-Docker via image custom : `harbor.ratons.ovh/cicd/node-dind:node24-docker29`

## Structure type d'un workflow CI/CD

### Fichier : `.gitea/workflows/ci.yaml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: harbor.ratons.ovh
  IMAGE_NAME: [project]/[app-name]
  KUBE_NAMESPACE: default
```

## Jobs standards

### 1. Build and Test
```yaml
build-test:
  name: Build and Test
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Install dependencies
      run: npm install

    - name: Run linter (if configured)
      run: npm run lint || echo "No linter configured, skipping"
      continue-on-error: true

    - name: Run tests (if configured)
      run: npm test || echo "No tests configured, skipping"
      continue-on-error: true
```

### 2. Docker Build & Push
```yaml
docker-build-push:
  name: Build and Push Docker Image
  runs-on: ubuntu-latest
  container:
    image: harbor.ratons.ovh/cicd/node-dind:node24-docker29
    options: --privileged
  needs: build-test
  if: github.event_name == 'push'
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Log in to Harbor
      run: |
        echo "${{ secrets.HARBOR_PASSWORD }}" | docker login ${{ env.REGISTRY }} -u "${{ secrets.HARBOR_USERNAME }}" --password-stdin

    - name: Build and push Docker image
      run: |
        # Stratégie de tagging
        if [ "${{ github.ref }}" = "refs/heads/main" ]; then
          TAGS="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest"
          TAGS="$TAGS,${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main"
        else
          BRANCH_NAME=$(echo "${{ github.ref }}" | sed 's|refs/heads/||')
          TAGS="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${BRANCH_NAME}"
        fi

        SHORT_SHA=$(echo "${{ github.sha }}" | cut -c1-7)
        TAGS="$TAGS,${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${SHORT_SHA}"

        # Build avec buildx
        BUILD_ARGS=""
        for tag in $(echo "$TAGS" | tr ',' ' '); do
          BUILD_ARGS="$BUILD_ARGS --tag $tag"
        done

        docker buildx build \
          $BUILD_ARGS \
          --push \
          --label "org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}" \
          --label "org.opencontainers.image.revision=${{ github.sha }}" \
          --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
          .
```

**Notes importantes:**
- Utiliser `docker buildx build` avec `--push` directement
- Pas besoin de `docker buildx create` (déjà configuré dans l'image DinD)
- Tags multiples : latest, main/branch, SHA court

### 3. Deploy to Kubernetes
```yaml
deploy-k8s:
  name: Deploy to Kubernetes
  runs-on: ubuntu-latest
  needs: docker-build-push
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      run: |
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x kubectl
        mv kubectl /usr/local/bin/

    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config

    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/rbac.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/deployment.yaml
        kubectl apply -f k8s/service.yaml
        kubectl apply -f k8s/ingress.yaml
        kubectl rollout restart deployment/[app-name] -n ${{ env.KUBE_NAMESPACE }}

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/[app-name] -n ${{ env.KUBE_NAMESPACE }} --timeout=5m
```

### 4. Sync to GitHub (optionnel)
```yaml
sync-github:
  name: Sync to GitHub
  runs-on: ubuntu-latest
  needs: build-test
  if: github.event_name == 'push'
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Important pour le mirror

    - name: Push to GitHub mirror
      env:
        GITHUB_TOKEN: ${{ secrets.GH_MIRROR_TOKEN }}
        GITHUB_REPO: ${{ secrets.GH_MIRROR_REPO }}
      run: |
        git config --global user.name "Gitea Actions"
        git config --global user.email "actions@git.ratons.ovh"
        git remote add github https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git || true
        git fetch --all
        git push github --mirror --force
```

## Secrets requis

À configurer dans les paramètres du repository Gitea :

- `HARBOR_USERNAME` : Nom d'utilisateur Harbor
- `HARBOR_PASSWORD` : Mot de passe Harbor
- `KUBECONFIG` : Fichier kubeconfig encodé en base64
- `GH_MIRROR_TOKEN` (optionnel) : Token GitHub pour mirroring
- `GH_MIRROR_REPO` (optionnel) : Format `username/repo`

## Bonnes pratiques

1. **Checkout** : Toujours utiliser `actions/checkout@v4` (standardisé)
2. **Tagging** : Utiliser latest + branch + SHA pour traçabilité
3. **Security** : Labels OCI pour métadonnées des images
4. **Deployment** : Déploiement uniquement sur `main` après tests
5. **Rollout** : Forcer le redémarrage pour pull de `latest`
6. **Conditionnels** : Utiliser `if:` pour contrôler l'exécution des jobs

## Stratégie de branches

- `main` : Production, déclenchement automatique du déploiement
- `develop` : Développement, build et tests uniquement
- Tags `v*` : Releases versionnées
- Pull requests : Tests uniquement, pas de déploiement
