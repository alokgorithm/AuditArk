"""Receipt CRUD with audit logging, vendor normalization, status tracking."""

import csv
import hashlib
import io
import re
import sqlite3
from datetime import datetime

from services.vendor_service import normalize_vendor


EDITABLE_FIELDS = {
    "vendor", "date", "invoice_no", "amount", "tax", "total",
    "category", "hostel_no", "account_no", "ifsc", "remarks",
}


def _parse_ocr_date(raw_date: str | None) -> str | None:
    if not raw_date:
        return None
    raw_date = raw_date.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y", "%d.%m.%y"):
        try:
            return datetime.strptime(raw_date, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date):
        return raw_date
    return raw_date


def _safe_float(val) -> float | None:
    if val is None or val == "":
        return None
    try:
        return round(float(str(val).replace(",", "")), 2)
    except (ValueError, TypeError):
        return None


def compute_image_hash(content: bytes) -> str:
    """SHA256 hash of image content for duplicate detection."""
    return hashlib.sha256(content).hexdigest()


def check_duplicate(conn: sqlite3.Connection, image_hash: str) -> dict | None:
    """Check if an image with this hash already exists. Returns the receipt if found."""
    row = conn.execute(
        "SELECT id, batch_id, vendor, image_path FROM receipts WHERE image_hash = ? LIMIT 1",
        (image_hash,),
    ).fetchone()
    return dict(row) if row else None


def insert_receipt(conn: sqlite3.Connection, data: dict) -> int:
    """Insert a single receipt and run vendor normalization. Returns receipt id."""
    normalized = normalize_vendor(conn, data.get("vendor"))
    status = data.get("status", "extracted")

    conn.execute(
        """INSERT INTO receipts
           (batch_id, vendor, normalized_vendor, date, invoice_no,
            amount, tax, total, category, hostel_no, account_no, ifsc,
            remarks, confidence, image_path, image_hash, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data["batch_id"],
            data.get("vendor"),
            normalized,
            _parse_ocr_date(data.get("date")),
            data.get("invoice_no"),
            _safe_float(data.get("amount")),
            _safe_float(data.get("tax")),
            _safe_float(data.get("total")),
            data.get("category"),
            data.get("hostel_no"),
            data.get("account_no"),
            data.get("ifsc"),
            data.get("remarks"),
            _safe_float(data.get("confidence")),
            data.get("image_path"),
            data.get("image_hash"),
            status,
        ),
    )
    receipt_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

    conn.execute(
        "UPDATE batches SET receipt_count = receipt_count + 1 WHERE id = ?",
        (data["batch_id"],),
    )
    return receipt_id


def update_receipt(conn: sqlite3.Connection, receipt_id: int, updates: dict) -> dict:
    """Update receipt fields, log diffs to receipt_edits. Returns the updated receipt."""
    current = conn.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
    if not current:
        raise ValueError(f"Receipt {receipt_id} not found")

    vendor_changed = False

    for field, new_value in updates.items():
        if field not in EDITABLE_FIELDS:
            continue

        old_value = current[field]

        if field in ("amount", "tax", "total"):
            new_value = _safe_float(new_value)
        elif field == "hostel_no" and new_value is not None:
            new_value = int(new_value)
        elif field == "date":
            new_value = _parse_ocr_date(str(new_value)) if new_value else None

        old_str = str(old_value) if old_value is not None else None
        new_str = str(new_value) if new_value is not None else None

        if old_str == new_str:
            continue

        conn.execute(
            """INSERT INTO receipt_edits (receipt_id, batch_id, field_name, old_value, new_value)
               VALUES (?, ?, ?, ?, ?)""",
            (receipt_id, current["batch_id"], field, old_str, new_str),
        )

        conn.execute(
            f"UPDATE receipts SET {field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_value, receipt_id),
        )

        if field == "vendor":
            vendor_changed = True

    if vendor_changed:
        updated = conn.execute("SELECT vendor FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
        normalized = normalize_vendor(conn, updated["vendor"])
        conn.execute(
            "UPDATE receipts SET normalized_vendor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (normalized, receipt_id),
        )

    return dict(conn.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,)).fetchone())


def update_receipt_status(conn: sqlite3.Connection, receipt_id: int, status: str) -> dict:
    """Update receipt status (pending/processing/extracted/reviewed/locked)."""
    conn.execute(
        "UPDATE receipts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status, receipt_id),
    )
    row = conn.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
    if not row:
        raise ValueError(f"Receipt {receipt_id} not found")
    return dict(row)


def delete_receipt(conn: sqlite3.Connection, receipt_id: int) -> bool:
    """Delete a receipt and its edit history. Returns True if deleted."""
    row = conn.execute("SELECT batch_id FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
    if not row:
        return False
    conn.execute("DELETE FROM receipt_edits WHERE receipt_id = ?", (receipt_id,))
    conn.execute("DELETE FROM receipts WHERE id = ?", (receipt_id,))
    conn.execute("UPDATE batches SET receipt_count = MAX(receipt_count - 1, 0) WHERE id = ?", (row["batch_id"],))
    return True


def delete_receipt_image(conn: sqlite3.Connection, receipt_id: int) -> bool:
    """Remove image reference from receipt (keeps receipt data)."""
    row = conn.execute("SELECT id FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        "UPDATE receipts SET image_path = NULL, image_hash = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (receipt_id,),
    )
    return True


def bulk_delete_receipts(conn: sqlite3.Connection, receipt_ids: list[int]) -> int:
    """Delete multiple receipts. Returns count deleted."""
    count = 0
    for rid in receipt_ids:
        if delete_receipt(conn, rid):
            count += 1
    return count


def get_receipt(conn: sqlite3.Connection, receipt_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,)).fetchone()
    return dict(row) if row else None


def get_receipt_edits(conn: sqlite3.Connection, receipt_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM receipt_edits WHERE receipt_id = ? ORDER BY edited_at DESC",
        (receipt_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def bulk_import_csv(conn: sqlite3.Connection, batch_id: int, csv_content: str) -> int:
    reader = csv.DictReader(io.StringIO(csv_content))
    count = 0
    for row in reader:
        data = {
            "batch_id": batch_id,
            "vendor": row.get("vendor_name"),
            "date": row.get("date"),
            "invoice_no": row.get("invoice_number"),
            "amount": row.get("sub_total"),
            "tax": row.get("total_tax"),
            "total": row.get("grand_total"),
            "hostel_no": int(row["hostel_number"]) if row.get("hostel_number") else None,
            "account_no": row.get("account_number"),
            "ifsc": row.get("ifsc_code"),
            "image_path": row.get("filename"),
            "status": "extracted",
        }
        insert_receipt(conn, data)
        count += 1
    return count
