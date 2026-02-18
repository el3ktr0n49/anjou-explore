#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Anjou Explore - Initialisation du password store (pass)
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   1. Remplir .env.pass-store avec les vraies valeurs
#   2. chmod +x scripts/init-pass-store.sh
#   3. ./scripts/init-pass-store.sh
#
# Prérequis:
#   - pass installé (https://www.passwordstore.org/)
#   - GPG key configurée
#   - Password store initialisé (pass init <gpg-id>)
#   - .env.pass-store rempli avec les valeurs
#
# Structure créée :
#
# anjouexplore/
# ├── database/
# │   ├── postgres-user
# │   ├── postgres-password
# │   └── database-url
# ├── auth/
# │   ├── jwt-secret
# │   ├── jose/
# │   │   ├── password
# │   │   └── 2fa-secret
# │   ├── fabien/
# │   │   ├── password
# │   │   └── 2fa-secret
# │   ├── benoit/
# │   │   ├── password
# │   │   └── 2fa-secret
# │   └── adrien/
# │       ├── password
# │       └── 2fa-secret
# ├── email/
# │   ├── resend-api-key
# │   └── email-from
# ├── payment/
# │   ├── prod/
# │   │   ├── sumup-api-key
# │   │   ├── sumup-pay-to-email
# │   │   └── sumup-merchant-code
# │   └── sandbox/
# │       ├── sumup-api-key
# │       ├── sumup-pay-to-email
# │       └── sumup-merchant-code
# ├── s3-backup/
# │   ├── endpoint
# │   ├── bucket
# │   ├── access-key-id
# │   ├── secret-access-key
# │   └── region
# ├── pgadmin/
# │   ├── email
# │   └── password
# ├── cicd/
# │   ├── harbor-username
# │   ├── harbor-password
# │   ├── kubeconfig-b64
# │   ├── gh-mirror-token
# │   └── gh-mirror-repo
# └── app/
#     ├── url
#     └── cors-origins
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Chemin relatif depuis la racine du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.pass-store"

PREFIX="anjouexplore"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────
# Chargement du fichier de variables
# ─────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Erreur: Fichier $ENV_FILE introuvable.${NC}"
    echo "Créer le fichier à partir du template et remplir les valeurs."
    exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Anjou Explore - Initialisation Password Store${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Fichier source : ${CYAN}$ENV_FILE${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if ! command -v pass &> /dev/null; then
    echo -e "${RED}Erreur: 'pass' n'est pas installé.${NC}"
    echo "Installer avec: sudo apt install pass  (ou brew install pass)"
    exit 1
fi

# ─────────────────────────────────────────────────────────────
# Fonction pour insérer un secret (skip si déjà existant)
# ─────────────────────────────────────────────────────────────
insert_secret() {
    local path="$1"
    local value="$2"
    local description="$3"

    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}VIDE${NC}  $path  — $description (non renseigné dans .env.pass-store)"
        return
    fi

    if pass show "$path" &> /dev/null 2>&1; then
        echo -e "  ${YELLOW}SKIP${NC}  $path (déjà existant)"
    else
        echo "$value" | pass insert -m "$path" > /dev/null 2>&1
        echo -e "  ${GREEN}OK${NC}    $path  — $description"
    fi
}

# ═════════════════════════════════════════════════════════════
# DATABASE
# ═════════════════════════════════════════════════════════════
echo -e "${CYAN}[Database]${NC}"

insert_secret "$PREFIX/database/postgres-user" \
    "${PASS_DB_USER:-}" \
    "Utilisateur PostgreSQL"

insert_secret "$PREFIX/database/postgres-password" \
    "${PASS_DB_PASSWORD:-}" \
    "Mot de passe PostgreSQL"

# Construire DATABASE_URL à partir des composants
DB_URL=""
if [ -n "${PASS_DB_USER:-}" ] && [ -n "${PASS_DB_PASSWORD:-}" ]; then
    DB_URL="postgresql://${PASS_DB_USER}:${PASS_DB_PASSWORD}@${PASS_DB_HOST:-postgres}:${PASS_DB_PORT:-5432}/${PASS_DB_NAME:-anjouexplore}?schema=public"
fi

insert_secret "$PREFIX/database/database-url" \
    "$DB_URL" \
    "DATABASE_URL complète (Prisma)"

# ═════════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[Auth]${NC}"

insert_secret "$PREFIX/auth/jwt-secret" \
    "${PASS_JWT_SECRET:-}" \
    "JWT signing secret"

# Admins individuels
echo ""
echo -e "${CYAN}[Auth - Admins]${NC}"

insert_secret "$PREFIX/auth/jose/password" \
    "${PASS_ADMIN_JOSE_PASSWORD:-}" \
    "Mot de passe José"

insert_secret "$PREFIX/auth/jose/2fa-secret" \
    "${PASS_ADMIN_JOSE_2FA_SECRET:-}" \
    "Secret 2FA José (base32)"

insert_secret "$PREFIX/auth/fabien/password" \
    "${PASS_ADMIN_FABIEN_PASSWORD:-}" \
    "Mot de passe Fabien"

insert_secret "$PREFIX/auth/fabien/2fa-secret" \
    "${PASS_ADMIN_FABIEN_2FA_SECRET:-}" \
    "Secret 2FA Fabien (base32)"

insert_secret "$PREFIX/auth/benoit/password" \
    "${PASS_ADMIN_BENOIT_PASSWORD:-}" \
    "Mot de passe Benoît"

insert_secret "$PREFIX/auth/benoit/2fa-secret" \
    "${PASS_ADMIN_BENOIT_2FA_SECRET:-}" \
    "Secret 2FA Benoît (base32)"

insert_secret "$PREFIX/auth/adrien/password" \
    "${PASS_ADMIN_ADRIEN_PASSWORD:-}" \
    "Mot de passe Adrien"

insert_secret "$PREFIX/auth/adrien/2fa-secret" \
    "${PASS_ADMIN_ADRIEN_2FA_SECRET:-}" \
    "Secret 2FA Adrien (base32)"

# ═════════════════════════════════════════════════════════════
# EMAIL (Resend)
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[Email - Resend]${NC}"

insert_secret "$PREFIX/email/resend-api-key" \
    "${PASS_RESEND_API_KEY:-}" \
    "Clé API Resend"

insert_secret "$PREFIX/email/email-from" \
    "${PASS_EMAIL_FROM:-}" \
    "Email expéditeur"

# ═════════════════════════════════════════════════════════════
# PAYMENT (SumUp)
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[Payment - SumUp Prod]${NC}"

insert_secret "$PREFIX/payment/prod/sumup-api-key" \
    "${PASS_SUMUP_PROD_API_KEY:-}" \
    "Clé API SumUp production (sup_sk_xxx)"

insert_secret "$PREFIX/payment/prod/sumup-pay-to-email" \
    "${PASS_SUMUP_PROD_PAY_TO_EMAIL:-}" \
    "Email marchand SumUp production"

insert_secret "$PREFIX/payment/prod/sumup-merchant-code" \
    "${PASS_SUMUP_PROD_MERCHANT_CODE:-}" \
    "Code marchand SumUp production"

echo ""
echo -e "${CYAN}[Payment - SumUp Sandbox]${NC}"

insert_secret "$PREFIX/payment/sandbox/sumup-api-key" \
    "${PASS_SUMUP_SANDBOX_API_KEY:-}" \
    "Clé API SumUp sandbox"

insert_secret "$PREFIX/payment/sandbox/sumup-pay-to-email" \
    "${PASS_SUMUP_SANDBOX_PAY_TO_EMAIL:-}" \
    "Email marchand SumUp sandbox"

insert_secret "$PREFIX/payment/sandbox/sumup-merchant-code" \
    "${PASS_SUMUP_SANDBOX_MERCHANT_CODE:-}" \
    "Code marchand SumUp sandbox"

# ═════════════════════════════════════════════════════════════
# S3 BACKUP (Scaleway)
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[S3 Backup - Scaleway]${NC}"

insert_secret "$PREFIX/s3-backup/endpoint" \
    "${PASS_S3_ENDPOINT:-}" \
    "Endpoint S3 Scaleway"

insert_secret "$PREFIX/s3-backup/bucket" \
    "${PASS_S3_BUCKET:-}" \
    "Nom du bucket S3"

insert_secret "$PREFIX/s3-backup/access-key-id" \
    "${PASS_S3_ACCESS_KEY_ID:-}" \
    "Access Key ID Scaleway"

insert_secret "$PREFIX/s3-backup/secret-access-key" \
    "${PASS_S3_SECRET_ACCESS_KEY:-}" \
    "Secret Access Key Scaleway"

insert_secret "$PREFIX/s3-backup/region" \
    "${PASS_S3_REGION:-}" \
    "Région S3"

# ═════════════════════════════════════════════════════════════
# PGADMIN
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[pgAdmin]${NC}"

insert_secret "$PREFIX/pgadmin/email" \
    "${PASS_PGADMIN_EMAIL:-}" \
    "Email admin pgAdmin"

insert_secret "$PREFIX/pgadmin/password" \
    "${PASS_PGADMIN_PASSWORD:-}" \
    "Mot de passe pgAdmin"

# ═════════════════════════════════════════════════════════════
# CI/CD (Gitea Actions)
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[CI/CD - Gitea Actions]${NC}"

insert_secret "$PREFIX/cicd/harbor-username" \
    "${PASS_HARBOR_USERNAME:-}" \
    "Utilisateur Harbor Registry"

insert_secret "$PREFIX/cicd/harbor-password" \
    "${PASS_HARBOR_PASSWORD:-}" \
    "Mot de passe Harbor Registry"

insert_secret "$PREFIX/cicd/kubeconfig-b64" \
    "${PASS_KUBECONFIG_B64:-}" \
    "Kubeconfig encodé en base64"

insert_secret "$PREFIX/cicd/gh-mirror-token" \
    "${PASS_GH_MIRROR_TOKEN:-}" \
    "Token GitHub pour mirroring"

insert_secret "$PREFIX/cicd/gh-mirror-repo" \
    "${PASS_GH_MIRROR_REPO:-}" \
    "Repo GitHub cible (user/repo)"

# ═════════════════════════════════════════════════════════════
# APPLICATION
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}[Application]${NC}"

insert_secret "$PREFIX/app/url" \
    "${PASS_APP_URL:-}" \
    "URL de production"

insert_secret "$PREFIX/app/cors-origins" \
    "${PASS_CORS_ORIGINS:-}" \
    "Origins CORS autorisés"

# ═════════════════════════════════════════════════════════════
# RÉSUMÉ
# ═════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Terminé ! Structure créée sous : $PREFIX/${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Prochaines étapes :"
echo ""
echo "  1. Compléter les entrées VIDE :"
echo "     pass edit $PREFIX/auth/jwt-secret"
echo "     pass edit $PREFIX/database/postgres-password"
echo ""
echo "  2. Générer un JWT secret :"
echo "     openssl rand -base64 64 | pass insert -m $PREFIX/auth/jwt-secret"
echo ""
echo "  3. Récupérer les secrets 2FA depuis la BDD :"
echo "     SELECT name, secret_2fa FROM \"Admin\";"
echo ""
echo "  4. Vérifier la structure :"
echo "     pass $PREFIX/"
echo ""
echo -e "${YELLOW}⚠️  N'oubliez pas : pass git push${NC}"
