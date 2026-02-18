#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Génère un kubeconfig dédié au CI/CD (Gitea Actions)
# ═══════════════════════════════════════════════════════════════
#
# Utilise le ServiceAccount "cicd-deployer" avec des permissions
# limitées au namespace "anjouexplore" uniquement.
#
# Prérequis :
#   1. kubectl configuré avec un accès admin au cluster
#   2. Le RBAC CI/CD appliqué :
#      kubectl apply -f k8s/cicd-rbac.yaml
#
# Usage :
#   ./scripts/generate-cicd-kubeconfig.sh
#
# Résultat :
#   - Affiche le kubeconfig en clair (pour vérification)
#   - Affiche la version base64 (à coller dans Gitea secrets)
#   - Optionnel : stocke dans le password store
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

NAMESPACE="anjouexplore"
SA_NAME="cicd-deployer"
SECRET_NAME="cicd-deployer-token"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Génération kubeconfig CI/CD (cicd-deployer)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Erreur: kubectl n'est pas installé.${NC}"
    exit 1
fi

echo -e "${CYAN}Vérification du ServiceAccount...${NC}"

# Vérifier que le ServiceAccount existe
if ! kubectl get sa "$SA_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Erreur: ServiceAccount '$SA_NAME' introuvable dans le namespace '$NAMESPACE'.${NC}"
    echo "Appliquer d'abord le RBAC :"
    echo "  kubectl apply -f k8s/cicd-rbac.yaml"
    exit 1
fi

# Vérifier que le Secret token existe
if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Erreur: Secret '$SECRET_NAME' introuvable.${NC}"
    echo "Appliquer d'abord le RBAC :"
    echo "  kubectl apply -f k8s/cicd-rbac.yaml"
    exit 1
fi

echo -e "  ${GREEN}OK${NC}  ServiceAccount '$SA_NAME' trouvé"

# ─────────────────────────────────────────────────────────────
# Extraction des informations
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}Extraction du token et du certificat...${NC}"

# Token du ServiceAccount
SA_TOKEN=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' | base64 -d)

if [ -z "$SA_TOKEN" ]; then
    echo -e "${RED}Erreur: Impossible de récupérer le token.${NC}"
    echo "Le Secret '$SECRET_NAME' n'a peut-être pas encore été provisionné."
    echo "Attendre quelques secondes et réessayer."
    exit 1
fi

echo -e "  ${GREEN}OK${NC}  Token récupéré (${#SA_TOKEN} caractères)"

# CA certificate du cluster
CA_CERT=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}')
echo -e "  ${GREEN}OK${NC}  Certificat CA récupéré"

# URL du serveur API
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
echo -e "  ${GREEN}OK${NC}  Serveur API : $SERVER"

# ─────────────────────────────────────────────────────────────
# Vérification : le serveur ne doit pas être 127.0.0.1
# ─────────────────────────────────────────────────────────────
if echo "$SERVER" | grep -q "127.0.0.1\|localhost"; then
    echo ""
    echo -e "${YELLOW}⚠️  Le serveur pointe vers $SERVER${NC}"
    echo -e "${YELLOW}   Ce n'est pas accessible depuis un runner CI/CD externe.${NC}"
    echo ""
    read -rp "Entrer l'adresse accessible du serveur API (ex: https://192.168.1.10:6443) : " NEW_SERVER
    if [ -n "$NEW_SERVER" ]; then
        SERVER="$NEW_SERVER"
        echo -e "  ${GREEN}OK${NC}  Serveur mis à jour : $SERVER"
    else
        echo -e "${YELLOW}Conservé tel quel. Penser à le modifier si le runner est externe.${NC}"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Génération du kubeconfig
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Génération du kubeconfig...${NC}"

KUBECONFIG_CONTENT=$(cat << EOF
apiVersion: v1
kind: Config
current-context: cicd-deployer@anjouexplore
clusters:
  - name: anjouexplore-cluster
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CA_CERT}
contexts:
  - name: cicd-deployer@anjouexplore
    context:
      cluster: anjouexplore-cluster
      namespace: ${NAMESPACE}
      user: cicd-deployer
users:
  - name: cicd-deployer
    user:
      token: ${SA_TOKEN}
EOF
)

echo -e "  ${GREEN}OK${NC}  Kubeconfig généré"

# ─────────────────────────────────────────────────────────────
# Test de connexion
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Test de connexion avec le nouveau kubeconfig...${NC}"

TEMP_KUBECONFIG=$(mktemp)
echo "$KUBECONFIG_CONTENT" > "$TEMP_KUBECONFIG"

if KUBECONFIG="$TEMP_KUBECONFIG" kubectl get pods -n "$NAMESPACE" &> /dev/null; then
    echo -e "  ${GREEN}OK${NC}  Connexion réussie ! Pods listés dans '$NAMESPACE'"
else
    echo -e "  ${YELLOW}WARN${NC}  Connexion échouée (normal si exécuté hors cluster)"
fi

# Vérifier que l'accès est bien limité
if KUBECONFIG="$TEMP_KUBECONFIG" kubectl get pods -n kube-system &> /dev/null 2>&1; then
    echo -e "  ${RED}DANGER${NC}  Accès au namespace kube-system détecté ! Le RBAC est trop permissif."
else
    echo -e "  ${GREEN}OK${NC}  Accès à kube-system refusé (RBAC correct)"
fi

rm -f "$TEMP_KUBECONFIG"

# ─────────────────────────────────────────────────────────────
# Encodage base64
# ─────────────────────────────────────────────────────────────
KUBECONFIG_B64=$(echo "$KUBECONFIG_CONTENT" | base64 -w 0)

# ─────────────────────────────────────────────────────────────
# Stockage optionnel dans pass
# ─────────────────────────────────────────────────────────────
echo ""
if command -v pass &> /dev/null; then
    read -rp "Stocker dans le password store (anjouexplore/cicd/kubeconfig-b64) ? [y/N] " store_pass
    if [[ "$store_pass" == "y" || "$store_pass" == "Y" ]]; then
        echo "$KUBECONFIG_B64" | pass insert -m anjouexplore/cicd/kubeconfig-b64 > /dev/null 2>&1
        echo -e "  ${GREEN}OK${NC}  Stocké dans pass anjouexplore/cicd/kubeconfig-b64"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Résultat
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Kubeconfig CI/CD généré avec succès !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Prochaines étapes :"
echo ""
echo "  1. Ajouter le secret dans Gitea :"
echo "     Repository → Settings → Actions Secrets"
echo "     Nom    : KUBECONFIG"
echo "     Valeur : (la chaîne base64 ci-dessous)"
echo ""
echo -e "${CYAN}── Kubeconfig base64 (à coller dans Gitea) ──${NC}"
echo ""
echo "$KUBECONFIG_B64"
echo ""
echo -e "${CYAN}──────────────────────────────────────────────${NC}"
echo ""
echo -e "${YELLOW}⚠️  Ce token n'expire pas. Pour le révoquer :${NC}"
echo "  kubectl delete secret $SECRET_NAME -n $NAMESPACE"
echo "  kubectl delete sa $SA_NAME -n $NAMESPACE"
