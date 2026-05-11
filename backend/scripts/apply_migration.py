"""One-shot script to apply a SQL migration file to the Supabase Postgres
database via the `DATABASE_URL` env var. Each statement runs inside a
single transaction (the migration files already have BEGIN/COMMIT, so we
just hand the whole file to psycopg as one execute call).

Usage:
    python scripts/apply_migration.py db/migrations/012_secure_exposed_tables.sql
"""
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: apply_migration.py <path-to-sql-file>", file=sys.stderr)
        return 2

    sql_path = Path(sys.argv[1])
    if not sql_path.exists():
        # Tolerate paths relative to the repo root.
        sql_path = Path(__file__).resolve().parents[2] / sql_path
    if not sql_path.exists():
        print(f"Migration not found: {sys.argv[1]}", file=sys.stderr)
        return 2

    sql = sql_path.read_text(encoding="utf-8")
    print(f"Applying {sql_path.name} ({len(sql)} bytes)...")

    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
