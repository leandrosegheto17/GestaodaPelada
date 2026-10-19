#!/usr/bin/env bash
# Dump do Postgres cifrado em fluxo (nada em claro no disco).
# Entradas por variável de ambiente: PG_URL (string de conexão), CHAVE_AGE (destinatário público age, age1...) e
# SAIDA (arquivo cifrado). Não imprime a URL nem a chave.
set -euo pipefail

: "${PG_URL:?PG_URL ausente}"
: "${CHAVE_AGE:?CHAVE_AGE ausente}"
: "${SAIDA:?SAIDA ausente}"

case "$CHAVE_AGE" in
  age1*) ;;
  *)
    echo 'CHAVE_AGE deve ser o destinatário público age (age1...).' >&2
    exit 1
    ;;
esac

# O stderr do psql/pg_dump traz host e IP do servidor e o log do Actions é público: vai para um
# arquivo temporário descartável e nunca é repassado; na falha só sai mensagem fixa.
erro="$(mktemp)"
trap 'rm -f "$erro"' EXIT

# O cliente do runner pode ser mais antigo que o servidor: usa a imagem oficial da versão maior dele.
if ! numero="$(docker run --rm -e PG_URL postgres:17 sh -c 'psql "$PG_URL" -Atc "show server_version_num"' 2>"$erro")"; then
  echo 'Falha ao consultar a versão do servidor.' >&2
  exit 1
fi
case "$numero" in
  '' | *[!0-9]*)
    echo 'Falha ao consultar a versão do servidor.' >&2
    exit 1
    ;;
esac
maior="$((numero / 10000))"

if ! docker run --rm -e PG_URL "postgres:${maior}" sh -c 'pg_dump --format=custom --no-owner --no-privileges "$PG_URL"' 2>"$erro" |
  age -r "$CHAVE_AGE" -o "$SAIDA"; then
  rm -f "$SAIDA"
  echo 'Falha ao gerar o dump.' >&2
  exit 1
fi

[ -s "$SAIDA" ] || {
  echo 'Dump cifrado vazio.' >&2
  exit 1
}
echo "Dump cifrado: $(wc -c <"$SAIDA") bytes, sha256 $(sha256sum "$SAIDA" | cut -d' ' -f1)"
