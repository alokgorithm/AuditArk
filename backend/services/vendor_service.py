"""Vendor normalization — fuzzy matching, canonical mapping, merge."""

import json
import re
import sqlite3

from rapidfuzz import fuzz

from config import FUZZY_THRESHOLD


def _clean_vendor_name(name: str) -> str:
    """Strip, uppercase, remove noise characters."""
    if not name:
        return ""
    name = name.strip().upper()
    # Remove common OCR noise
    name = re.sub(r"[.,;:!@#$%^&*()_+=\[\]{}<>~`|\\]", " ", name)
    name = re.sub(r"\bBROS?\b", "BROTHERS", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def normalize_vendor(conn: sqlite3.Connection, raw_vendor: str) -> str | None:
    """Normalize a vendor name against existing canonical names.

    Returns the canonical name (existing match or newly created).
    """
    if not raw_vendor or not raw_vendor.strip():
        return None

    cleaned = _clean_vendor_name(raw_vendor)
    if not cleaned:
        return None

    # Fetch all canonical vendors
    rows = conn.execute("SELECT id, normalized_name, aliases FROM vendors").fetchall()

    # Exact normalized match first for deterministic consistency
    exact = conn.execute(
        "SELECT id, normalized_name FROM vendors WHERE normalized_name = ?",
        (cleaned,),
    ).fetchone()
    if exact:
        return exact["normalized_name"]

    best_score = 0
    best_canonical = None

    for row in rows:
        canonical = row["normalized_name"]
        score = fuzz.token_sort_ratio(cleaned, canonical)
        if score > best_score:
            best_score = score
            best_canonical = canonical

        # Also check aliases
        if row["aliases"]:
            try:
                aliases = json.loads(row["aliases"])
                for alias in aliases:
                    alias_score = fuzz.token_sort_ratio(cleaned, alias.upper())
                    if alias_score > best_score:
                        best_score = alias_score
                        best_canonical = canonical
            except (json.JSONDecodeError, TypeError):
                pass

    if best_score >= FUZZY_THRESHOLD and best_canonical:
        # Add as alias if not already there
        row = conn.execute(
            "SELECT id, aliases FROM vendors WHERE normalized_name = ?",
            (best_canonical,),
        ).fetchone()
        if row:
            aliases = json.loads(row["aliases"]) if row["aliases"] else []
            if cleaned not in aliases and cleaned != best_canonical:
                aliases.append(cleaned)
                conn.execute(
                    "UPDATE vendors SET aliases = ? WHERE id = ?",
                    (json.dumps(aliases), row["id"]),
                )
        return best_canonical

    # No match — create new vendor entry
    conn.execute(
        """
        INSERT INTO vendors (
            name, normalized_name, canonical_name, aliases,
            account_no, ifsc, bank_name, default_amount, remarks,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (cleaned, cleaned, cleaned, json.dumps([]), None, None, None, 0, None),
    )
    return cleaned


def merge_vendors(conn: sqlite3.Connection, source_id: int, target_id: int) -> int:
    """Merge source vendor into target. Returns number of receipts updated."""
    source = conn.execute("SELECT normalized_name, aliases FROM vendors WHERE id = ?", (source_id,)).fetchone()
    target = conn.execute("SELECT normalized_name, aliases FROM vendors WHERE id = ?", (target_id,)).fetchone()

    if not source or not target:
        raise ValueError("Vendor not found")

    # Merge aliases
    source_aliases = json.loads(source["aliases"]) if source["aliases"] else []
    target_aliases = json.loads(target["aliases"]) if target["aliases"] else []
    merged_aliases = list(set(target_aliases + source_aliases + [source["normalized_name"]]))
    conn.execute(
        "UPDATE vendors SET aliases = ? WHERE id = ?",
        (json.dumps(merged_aliases), target_id),
    )

    # Update all receipts pointing to source vendor
    count = conn.execute(
        "UPDATE receipts SET normalized_vendor = ? WHERE normalized_vendor = ?",
        (target["normalized_name"], source["normalized_name"]),
    ).rowcount

    # Delete source vendor
    conn.execute("DELETE FROM vendors WHERE id = ?", (source_id,))

    return count
