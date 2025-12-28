#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: HEROKU_APP=app-name $0 --person-name PERSON --display-name NAME --email EMAIL"
  exit 1
}

PERSON_NAME=""
DISPLAY_NAME=""
EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --person-name)
      PERSON_NAME="$2"
      shift 2
      ;;
    --display-name)
      DISPLAY_NAME="$2"
      shift 2
      ;;
    --email)
      EMAIL="$2"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if [[ -z "${HEROKU_APP:-}" || -z "$PERSON_NAME" || -z "$DISPLAY_NAME" || -z "$EMAIL" ]]; then
  usage
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required for heroku pg:psql."
  echo "Install it with: brew install postgresql"
  exit 1
fi

UPDATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

SQL="INSERT INTO consents (person_name, display_name, email, updated_at)
VALUES ('${PERSON_NAME}', '${DISPLAY_NAME}', '${EMAIL}', '${UPDATED_AT}')
ON CONFLICT (person_name) DO UPDATE SET
display_name = EXCLUDED.display_name,
email = EXCLUDED.email,
updated_at = EXCLUDED.updated_at;"

heroku pg:psql -a "$HEROKU_APP" -c "$SQL"
echo "Consent updated for ${PERSON_NAME}."
