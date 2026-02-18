#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Anjou Explore - Génération des K8s secrets depuis pass store
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/generate-k8s-secrets.sh [--env prod|sandbox]
#
# Par défaut: sandbox (pour les clés SumUp)
# Génère les fichiers :
#   - k8s/postgres-secret.yaml
#   - k8s/app-secret.yaml
#   - k8s/backup-s3-secret.yaml
#   - k8s/pgadmin/pgadmin-secret.yaml
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PREFIX="anjouexplore"
SUMUP_ENV="sandbox"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────
# Arguments
# ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env)
            SUMUP_ENV="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Argument inconnu: $1${NC}"
            echo "Usage: $0 [--env prod|sandbox]"
            exit 1
            ;;
    esac
done

if [[ "$SUMUP_ENV" != "prod" && "$SUMUP_ENV" != "sandbox" ]]; then
    echo -e "${RED}Environnement SumUp invalide: $SUMUP_ENV (prod ou sandbox)${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if ! command -v pass &> /dev/null; then
    echo -e "${RED}Erreur: 'pass' n'est pas installé.${NC}"
    exit 1
fi

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Anjou Explore - Génération K8s Secrets depuis pass${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Environnement SumUp : ${CYAN}$SUMUP_ENV${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Fonction pour lire un secret depuis pass
# ─────────────────────────────────────────────────────────────
get_secret() {
    local path="$1"
    local value
    value=$(pass show "$path" 2>/dev/null | head -n1) || true
    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}WARN${NC}  $path est vide ou introuvable" >&2
    fi
    echo "$value"
}

# ─────────────────────────────────────────────────────────────
# Lecture des secrets
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}Lecture des secrets depuis pass...${NC}"

DB_USER=$(get_secret "$PREFIX/database/postgres-user")
DB_PASSWORD=$(get_secret "$PREFIX/database/postgres-password")
DB_URL=$(get_secret "$PREFIX/database/database-url")
JWT_SECRET=$(get_secret "$PREFIX/auth/jwt-secret")
RESEND_API_KEY=$(get_secret "$PREFIX/email/resend-api-key")
SUMUP_API_KEY=$(get_secret "$PREFIX/payment/$SUMUP_ENV/sumup-api-key")
SUMUP_MERCHANT_CODE=$(get_secret "$PREFIX/payment/$SUMUP_ENV/sumup-merchant-code")
SUMUP_PAY_TO_EMAIL=$(get_secret "$PREFIX/payment/$SUMUP_ENV/sumup-pay-to-email")
S3_ENDPOINT=$(get_secret "$PREFIX/s3-backup/endpoint")
S3_BUCKET=$(get_secret "$PREFIX/s3-backup/bucket")
S3_ACCESS_KEY_ID=$(get_secret "$PREFIX/s3-backup/access-key-id")
S3_SECRET_ACCESS_KEY=$(get_secret "$PREFIX/s3-backup/secret-access-key")
S3_REGION=$(get_secret "$PREFIX/s3-backup/region")
PGADMIN_EMAIL=$(get_secret "$PREFIX/pgadmin/email")
PGADMIN_PASSWORD=$(get_secret "$PREFIX/pgadmin/password")

echo ""

# ─────────────────────────────────────────────────────────────
# 1. postgres-secret.yaml
# ─────────────────────────────────────────────────────────────
cat > "$PROJECT_ROOT/k8s/postgres-secret.yaml" << EOF
# Généré par scripts/generate-k8s-secrets.sh — ne pas éditer manuellement
# Régénérer avec : ./scripts/generate-k8s-secrets.sh --env $SUMUP_ENV

apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: anjouexplore
type: Opaque
stringData:
  POSTGRES_USER: "$DB_USER"
  POSTGRES_PASSWORD: "$DB_PASSWORD"
  POSTGRES_DB: "anjouexplore"
  DATABASE_URL: "$DB_URL"
EOF
echo -e "  ${GREEN}OK${NC}  k8s/postgres-secret.yaml"

# ─────────────────────────────────────────────────────────────
# 2. app-secret.yaml
# ─────────────────────────────────────────────────────────────
cat > "$PROJECT_ROOT/k8s/app-secret.yaml" << EOF
# Généré par scripts/generate-k8s-secrets.sh — ne pas éditer manuellement
# Régénérer avec : ./scripts/generate-k8s-secrets.sh --env $SUMUP_ENV

apiVersion: v1
kind: Secret
metadata:
  name: anjouexplore-secret
  namespace: anjouexplore
type: Opaque
stringData:
  # Database (référence le même que postgres-secret)
  DATABASE_URL: "$DB_URL"

  # Auth & Security
  JWT_SECRET: "$JWT_SECRET"

  # Email (Resend)
  RESEND_API_KEY: "$RESEND_API_KEY"

  # Payment (SumUp - $SUMUP_ENV)
  SUMUP_API_KEY: "$SUMUP_API_KEY"
  SUMUP_MERCHANT_CODE: "$SUMUP_MERCHANT_CODE"
  SUMUP_PAY_TO_EMAIL: "$SUMUP_PAY_TO_EMAIL"
EOF
echo -e "  ${GREEN}OK${NC}  k8s/app-secret.yaml"

# ─────────────────────────────────────────────────────────────
# 3. backup-s3-secret.yaml
# ─────────────────────────────────────────────────────────────
cat > "$PROJECT_ROOT/k8s/backup-s3-secret.yaml" << EOF
# Généré par scripts/generate-k8s-secrets.sh — ne pas éditer manuellement
# Régénérer avec : ./scripts/generate-k8s-secrets.sh --env $SUMUP_ENV

apiVersion: v1
kind: Secret
metadata:
  name: s3-backup-secret
  namespace: anjouexplore
type: Opaque
stringData:
  S3_ENDPOINT: "$S3_ENDPOINT"
  S3_BUCKET: "$S3_BUCKET"
  S3_ACCESS_KEY_ID: "$S3_ACCESS_KEY_ID"
  S3_SECRET_ACCESS_KEY: "$S3_SECRET_ACCESS_KEY"
  S3_REGION: "$S3_REGION"
EOF
echo -e "  ${GREEN}OK${NC}  k8s/backup-s3-secret.yaml"

# ─────────────────────────────────────────────────────────────
# 4. pgadmin/pgadmin-secret.yaml
# ─────────────────────────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/k8s/pgadmin"
cat > "$PROJECT_ROOT/k8s/pgadmin/pgadmin-secret.yaml" << EOF
# Généré par scripts/generate-k8s-secrets.sh — ne pas éditer manuellement
# Régénérer avec : ./scripts/generate-k8s-secrets.sh --env $SUMUP_ENV

apiVersion: v1
kind: Secret
metadata:
  name: pgadmin-secret
  namespace: anjouexplore
type: Opaque
stringData:
  PGADMIN_DEFAULT_EMAIL: "$PGADMIN_EMAIL"
  PGADMIN_DEFAULT_PASSWORD: "$PGADMIN_PASSWORD"
EOF
echo -e "  ${GREEN}OK${NC}  k8s/pgadmin/pgadmin-secret.yaml"

# ─────────────────────────────────────────────────────────────
# Résumé
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  4 fichiers K8s secrets générés !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Appliquer avec :"
echo "  kubectl apply -f k8s/postgres-secret.yaml"
echo "  kubectl apply -f k8s/app-secret.yaml"
echo "  kubectl apply -f k8s/backup-s3-secret.yaml"
echo "  kubectl apply -f k8s/pgadmin/pgadmin-secret.yaml"
echo ""
echo -e "${YELLOW}⚠️  Ces fichiers sont dans .gitignore — ne pas les commiter${NC}"
