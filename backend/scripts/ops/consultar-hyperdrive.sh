#!/usr/bin/env bash
# Lê a config do Hyperdrive na API da Cloudflare e a imprime em stdout.
# Uso: consultar-hyperdrive.sh <id-da-config>
# Entrada: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID; CLOUDFLARE_API_BASE é opcional (testes).
set -euo pipefail

if [[ ! "${CLOUDFLARE_API_TOKEN:-}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "CLOUDFLARE_API_TOKEN ausente ou com caracteres fora de [A-Za-z0-9_-]." >&2
  exit 1
fi

base="${CLOUDFLARE_API_BASE:-https://api.cloudflare.com/client/v4}"

# O token vai por stdin do curl (fora de argv); a validação acima impede que
# aspas, barra invertida ou quebra de linha injetem diretivas na config.
printf 'header = "Authorization: Bearer %s"\n' "$CLOUDFLARE_API_TOKEN" |
  curl --fail-with-body -sS --config - \
    "${base}/accounts/${CLOUDFLARE_ACCOUNT_ID}/hyperdrive/configs/${1}"
