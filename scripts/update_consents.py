#!/usr/bin/env python3
import argparse
import os
import subprocess
from datetime import datetime, timezone


def parse_args():
    parser = argparse.ArgumentParser(
        description="Upsert a consent mapping into the consents table."
    )
    parser.add_argument("--person-name", required=True, help="Google People API personName")
    parser.add_argument("--display-name", required=True, help="Human-friendly name")
    parser.add_argument("--email", required=True, help="Email address")
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Postgres connection string (defaults to DATABASE_URL env var)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if not args.database_url:
        raise SystemExit("DATABASE_URL is required (env or --database-url).")

    updated_at = datetime.now(timezone.utc).isoformat()
    sql = (
        "INSERT INTO consents (person_name, display_name, email, updated_at) "
        "VALUES (:'person_name', :'display_name', :'email', :'updated_at') "
        "ON CONFLICT (person_name) DO UPDATE SET "
        "display_name = EXCLUDED.display_name, "
        "email = EXCLUDED.email, "
        "updated_at = EXCLUDED.updated_at;"
    )

    cmd = [
        "psql",
        args.database_url,
        "-v",
        f"person_name={args.person_name}",
        "-v",
        f"display_name={args.display_name}",
        "-v",
        f"email={args.email}",
        "-v",
        f"updated_at={updated_at}",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
    ]

    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        raise SystemExit("psql not found. Install Postgres client tools.")

    print("Consent updated.")


if __name__ == "__main__":
    main()
