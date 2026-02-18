#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Anjou Explore - Export du pass store vers .env.pass-store
# ═══════════════════════════════════════════════════════════════
#
# Recrée le fichier .env.pass-store à partir des secrets stockés
# dans le password store. Utile après un clone frais ou pour
# synchroniser entre machines.
#
# Usage:
#   ./scripts/export-env-pass-store.sh
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="$PROJECT_ROOT/.env.pass-store"

PREFIX="anjouexplore"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if ! command -v pass &> /dev/null; then
    echo -e "${RED}Erreur: 'pass' n'est pas installé.${NC}"
    exit 1
fi

# Protection contre l'écrasement
if [ -f "$OUTPUT" ]; then
    echo -e "${YELLOW}Le fichier $OUTPUT existe déjà.${NC}"
    read -rp "Écraser ? [y/N] " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Abandon."
        exit 0
    fi
fi

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Anjou Explore - Export pass store → .env.pass-store${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Fonction pour lire un secret (retourne "" si absent)
# ─────────────────────────────────────────────────────────────
get_secret() {
    local path="$1"
    local value
    value=$(pass show "$path" 2>/dev/null | head -n1) || true
    echo "$value"
}

# ─────────────────────────────────────────────────────────────
# Lecture et comptage
# ─────────────────────────────────────────────────────────────
count=0
count_empty=0

read_and_count() {
    local path="$1"
    local val
    val=$(get_secret "$path")
    count=$((count + 1))
    if [ -z "$val" ]; then
        count_empty=$((count_empty + 1))
        echo -e "  ${YELLOW}VIDE${NC}  $path" >&2
    else
        echo -e "  ${GREEN}OK${NC}    $path" >&2
    fi
    echo "$val"
}

echo -e "${CYAN}Lecture des secrets depuis pass...${NC}"

DB_USER=$(read_and_count "$PREFIX/database/postgres-user")
DB_PASSWORD=$(read_and_count "$PREFIX/database/postgres-password")
# database-url est dérivé, on ne le lit pas directement pour les composants
pass show "$PREFIX/database/database-url" &>/dev/null && echo -e "  ${GREEN}OK${NC}    $PREFIX/database/database-url" >&2 || true
DB_HOST="postgres"
DB_PORT="5432"
DB_NAME="anjouexplore"

JWT_SECRET=$(read_and_count "$PREFIX/auth/jwt-secret")

ADMIN_JOSE_PASSWORD=$(read_and_count "$PREFIX/auth/jose/password")
ADMIN_FABIEN_PASSWORD=$(read_and_count "$PREFIX/auth/fabien/password")
ADMIN_BENOIT_PASSWORD=$(read_and_count "$PREFIX/auth/benoit/password")
ADMIN_ADRIEN_PASSWORD=$(read_and_count "$PREFIX/auth/adrien/password")

ADMIN_JOSE_2FA=$(read_and_count "$PREFIX/auth/jose/2fa-secret")
ADMIN_FABIEN_2FA=$(read_and_count "$PREFIX/auth/fabien/2fa-secret")
ADMIN_BENOIT_2FA=$(read_and_count "$PREFIX/auth/benoit/2fa-secret")
ADMIN_ADRIEN_2FA=$(read_and_count "$PREFIX/auth/adrien/2fa-secret")

RESEND_API_KEY=$(read_and_count "$PREFIX/email/resend-api-key")
EMAIL_FROM=$(read_and_count "$PREFIX/email/email-from")

SUMUP_PROD_API_KEY=$(read_and_count "$PREFIX/payment/prod/sumup-api-key")
SUMUP_PROD_EMAIL=$(read_and_count "$PREFIX/payment/prod/sumup-pay-to-email")
SUMUP_PROD_MERCHANT=$(read_and_count "$PREFIX/payment/prod/sumup-merchant-code")

SUMUP_SANDBOX_API_KEY=$(read_and_count "$PREFIX/payment/sandbox/sumup-api-key")
SUMUP_SANDBOX_EMAIL=$(read_and_count "$PREFIX/payment/sandbox/sumup-pay-to-email")
SUMUP_SANDBOX_MERCHANT=$(read_and_count "$PREFIX/payment/sandbox/sumup-merchant-code")

S3_ENDPOINT=$(read_and_count "$PREFIX/s3-backup/endpoint")
S3_BUCKET=$(read_and_count "$PREFIX/s3-backup/bucket")
S3_ACCESS_KEY_ID=$(read_and_count "$PREFIX/s3-backup/access-key-id")
S3_SECRET_ACCESS_KEY=$(read_and_count "$PREFIX/s3-backup/secret-access-key")
S3_REGION=$(read_and_count "$PREFIX/s3-backup/region")

PGADMIN_EMAIL=$(read_and_count "$PREFIX/pgadmin/email")
PGADMIN_PASSWORD=$(read_and_count "$PREFIX/pgadmin/password")

HARBOR_USERNAME=$(read_and_count "$PREFIX/cicd/harbor-username")
HARBOR_PASSWORD=$(read_and_count "$PREFIX/cicd/harbor-password")
KUBECONFIG_B64=$(read_and_count "$PREFIX/cicd/kubeconfig-b64")
GH_MIRROR_TOKEN=$(read_and_count "$PREFIX/cicd/gh-mirror-token")
GH_MIRROR_REPO=$(read_and_count "$PREFIX/cicd/gh-mirror-repo")

APP_URL=$(read_and_count "$PREFIX/app/url")
CORS_ORIGINS=$(read_and_count "$PREFIX/app/cors-origins")

echo ""

# ─────────────────────────────────────────────────────────────
# Écriture du fichier
# ─────────────────────────────────────────────────────────────
cat > "$OUTPUT" << ENVFILE
# ═══════════════════════════════════════════════════════════════
# Anjou Explore - Valeurs secrètes pour init-pass-store.sh
# ═══════════════════════════════════════════════════════════════
#
# ⚠️  CE FICHIER NE DOIT JAMAIS ÊTRE COMMITÉ (.gitignore)
#
# Généré automatiquement par : scripts/export-env-pass-store.sh
# Source : password store (pass) — préfixe $PREFIX/
#
# Instructions :
#   1. Remplir toutes les valeurs ci-dessous
#   2. Exécuter : ./scripts/init-pass-store.sh
#   3. Vérifier : pass show $PREFIX/
#
# ═══════════════════════════════════════════════════════════════

# ─── DATABASE ────────────────────────────────────────────────
PASS_DB_USER="$DB_USER"
PASS_DB_PASSWORD="$DB_PASSWORD"
PASS_DB_HOST="$DB_HOST"
PASS_DB_PORT="$DB_PORT"
PASS_DB_NAME="$DB_NAME"

# ─── AUTH - JWT ──────────────────────────────────────────────
# Générer avec : openssl rand -base64 64
PASS_JWT_SECRET="$JWT_SECRET"

# ─── AUTH - Admins ───────────────────────────────────────────
# Mots de passe actuels (après changement du mot de passe par défaut)
# Laisser vide pour utiliser le mot de passe par défaut : AnjouExplore2026_<Prénom>
PASS_ADMIN_JOSE_PASSWORD="$ADMIN_JOSE_PASSWORD"
PASS_ADMIN_FABIEN_PASSWORD="$ADMIN_FABIEN_PASSWORD"
PASS_ADMIN_BENOIT_PASSWORD="$ADMIN_BENOIT_PASSWORD"
PASS_ADMIN_ADRIEN_PASSWORD="$ADMIN_ADRIEN_PASSWORD"

# Secrets 2FA (base32, générés par otplib lors du seed)
# Récupérer depuis la BDD : SELECT name, secret_2fa FROM "Admin";
PASS_ADMIN_JOSE_2FA_SECRET="$ADMIN_JOSE_2FA"
PASS_ADMIN_FABIEN_2FA_SECRET="$ADMIN_FABIEN_2FA"
PASS_ADMIN_BENOIT_2FA_SECRET="$ADMIN_BENOIT_2FA"
PASS_ADMIN_ADRIEN_2FA_SECRET="$ADMIN_ADRIEN_2FA"

# ─── EMAIL (Resend) ─────────────────────────────────────────
PASS_RESEND_API_KEY="$RESEND_API_KEY"
PASS_EMAIL_FROM="$EMAIL_FROM"

# ─── PAYMENT - SumUp Production ─────────────────────────────
PASS_SUMUP_PROD_API_KEY="$SUMUP_PROD_API_KEY"
PASS_SUMUP_PROD_PAY_TO_EMAIL="$SUMUP_PROD_EMAIL"
PASS_SUMUP_PROD_MERCHANT_CODE="$SUMUP_PROD_MERCHANT"

# ─── PAYMENT - SumUp Sandbox ────────────────────────────────
PASS_SUMUP_SANDBOX_API_KEY="$SUMUP_SANDBOX_API_KEY"
PASS_SUMUP_SANDBOX_PAY_TO_EMAIL="$SUMUP_SANDBOX_EMAIL"
PASS_SUMUP_SANDBOX_MERCHANT_CODE="$SUMUP_SANDBOX_MERCHANT"

# ─── S3 BACKUP (Scaleway) ───────────────────────────────────
PASS_S3_ENDPOINT="$S3_ENDPOINT"
PASS_S3_BUCKET="$S3_BUCKET"
PASS_S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
PASS_S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
PASS_S3_REGION="$S3_REGION"

# ─── PGADMIN ────────────────────────────────────────────────
PASS_PGADMIN_EMAIL="$PGADMIN_EMAIL"
PASS_PGADMIN_PASSWORD="$PGADMIN_PASSWORD"

# ─── CI/CD (Gitea Actions) ──────────────────────────────────
PASS_HARBOR_USERNAME="$HARBOR_USERNAME"
PASS_HARBOR_PASSWORD="$HARBOR_PASSWORD"
PASS_KUBECONFIG_B64="$KUBECONFIG_B64"
PASS_GH_MIRROR_TOKEN="$GH_MIRROR_TOKEN"
PASS_GH_MIRROR_REPO="$GH_MIRROR_REPO"

# ─── APPLICATION ─────────────────────────────────────────────
PASS_APP_URL="$APP_URL"
PASS_CORS_ORIGINS="$CORS_ORIGINS"
ENVFILE

# ─────────────────────────────────────────────────────────────
# Résumé
# ─────────────────────────────────────────────────────────────
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Fichier généré : $OUTPUT${NC}"
echo -e "${GREEN}  Secrets lus : $count (dont $count_empty vides)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
