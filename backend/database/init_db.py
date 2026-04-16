"""Initialize the database by running schema.sql + migrations."""

from pathlib import Path
from database.connection import get_db

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def init_db():
    """Create all tables and indexes if they don't exist, then run migrations."""
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")

    with get_db() as conn:
        # Run migrations FIRST to add missing columns before schema.sql
        # tries to create indexes on them
        _run_migrations(conn)

        # Now run schema.sql — CREATE TABLE IF NOT EXISTS is safe,
        # and CREATE INDEX IF NOT EXISTS now works because columns exist
        conn.executescript(schema_sql)

    print("Database initialized.")


def init_database():
    """Backward-compatible alias used by existing imports."""
    init_db()


def _run_migrations(conn):
    """Add columns that may be missing from older schemas."""
    # Check if the receipts table exists at all
    table_exists = conn.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='receipts'"
    ).fetchone()[0]

    if not table_exists:
        # Fresh install — schema.sql will create everything
        return

    existing = {row[1] for row in conn.execute("PRAGMA table_info(receipts)").fetchall()}

    if "status" not in existing:
        conn.execute("ALTER TABLE receipts ADD COLUMN status TEXT DEFAULT 'extracted'")
        print("  Migration: added 'status' column")

    if "image_hash" not in existing:
        conn.execute("ALTER TABLE receipts ADD COLUMN image_hash TEXT")
        print("  Migration: added 'image_hash' column")

    # Vendor table migrations for Phase 10 vendor management
    vendor_exists = conn.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='vendors'"
    ).fetchone()[0]

    if vendor_exists:
        vendor_columns = {row[1] for row in conn.execute("PRAGMA table_info(vendors)").fetchall()}

        if "name" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN name TEXT")
            print("  Migration: added 'name' column to vendors")

        if "normalized_name" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN normalized_name TEXT")
            print("  Migration: added 'normalized_name' column to vendors")

        if "canonical_name" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN canonical_name TEXT")
            print("  Migration: added 'canonical_name' column to vendors")

        if "aliases" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN aliases TEXT")
            print("  Migration: added 'aliases' column to vendors")

        if "bank_name" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN bank_name TEXT")
            print("  Migration: added 'bank_name' column to vendors")

        if "default_amount" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN default_amount REAL DEFAULT 0")
            print("  Migration: added 'default_amount' column to vendors")

        if "remarks" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN remarks TEXT")
            print("  Migration: added 'remarks' column to vendors")

        if "created_at" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN created_at TIMESTAMP")
            print("  Migration: added 'created_at' column to vendors")

        if "updated_at" not in vendor_columns:
            conn.execute("ALTER TABLE vendors ADD COLUMN updated_at TIMESTAMP")
            print("  Migration: added 'updated_at' column to vendors")

        conn.execute(
            "UPDATE vendors SET name = COALESCE(NULLIF(name, ''), canonical_name, normalized_name) "
            "WHERE name IS NULL OR name = ''"
        )
        conn.execute(
            "UPDATE vendors SET normalized_name = COALESCE(NULLIF(normalized_name, ''), canonical_name, UPPER(TRIM(name))) "
            "WHERE normalized_name IS NULL OR normalized_name = ''"
        )
        conn.execute(
            "UPDATE vendors SET canonical_name = COALESCE(NULLIF(canonical_name, ''), normalized_name) "
            "WHERE canonical_name IS NULL OR canonical_name = ''"
        )
        conn.execute(
            "UPDATE vendors SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), "
            "updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)"
        )

        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_normalized ON vendors(normalized_name)"
        )

    conn.commit()
