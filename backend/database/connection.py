"""SQLite connection manager with WAL mode and foreign keys."""

import sqlite3
from contextlib import contextmanager

from config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Create a new SQLite connection with WAL mode and foreign keys enabled."""
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """Context manager that yields a connection and commits on success."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
