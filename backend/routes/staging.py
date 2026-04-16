"""Staging receipt endpoints — save/load/delete draft receipts."""

import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel

from config import DATA_DIR
from database.connection import get_db

router = APIRouter(prefix="/api/staging", tags=["staging"])

STAGING_DIR = DATA_DIR / "staging"
STAGING_DIR.mkdir(parents=True, exist_ok=True)


def _ensure_columns():
    """Ensure account_no and ifsc columns exist (migration safety)."""
    with get_db() as conn:
        cols = {row["name"] for row in conn.execute("PRAGMA table_info(staging_receipts)").fetchall()}
        if "account_no" not in cols:
            conn.execute("ALTER TABLE staging_receipts ADD COLUMN account_no TEXT")
        if "ifsc" not in cols:
            conn.execute("ALTER TABLE staging_receipts ADD COLUMN ifsc TEXT")


_columns_checked = False


def _check_columns_once():
    global _columns_checked
    if not _columns_checked:
        _ensure_columns()
        _columns_checked = True


# =====================================================
# SAVE DRAFTS — multipart: images + metadata JSON
# =====================================================

@router.post("/{batch_id}/save")
async def save_drafts(
    batch_id: int,
    metadata: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    """Save/upsert draft receipts for a batch.

    `metadata` is a JSON string: array of objects with keys:
      { client_id, vendor, date, invoice_no, amount, tax, total,
        hostel_no, account_no, ifsc, remarks, filename }

    `files` are the images, matched by filename to the metadata entries.
    Images are saved to DATA_DIR/staging/{batch_id}/.
    """
    _check_columns_once()

    try:
        entries = json.loads(metadata)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {e}")

    if not isinstance(entries, list):
        raise HTTPException(status_code=400, detail="metadata must be a JSON array")

    # Build filename → upload file mapping
    file_map = {}
    for f in files:
        file_map[f.filename] = f

    batch_dir = STAGING_DIR / str(batch_id)
    batch_dir.mkdir(parents=True, exist_ok=True)

    saved = 0
    with get_db() as conn:
        # Clear existing drafts for this batch, then re-insert
        conn.execute("DELETE FROM staging_receipts WHERE batch_id = ?", (batch_id,))

        for entry in entries:
            filename = entry.get("filename", "")

            # Save image if provided
            image_path = ""
            if filename and filename in file_map:
                upload = file_map[filename]
                dest = batch_dir / filename
                with open(dest, "wb") as out:
                    shutil.copyfileobj(upload.file, out)
                    upload.file.seek(0)  # reset for potential re-use
                image_path = f"staging/{batch_id}/{filename}"
            elif filename:
                # Check if image already exists from previous save
                existing = batch_dir / filename
                if existing.exists():
                    image_path = f"staging/{batch_id}/{filename}"

            # Parse numeric fields safely
            def safe_float(val):
                if val is None or val == "":
                    return None
                try:
                    return float(str(val).replace(",", ""))
                except (ValueError, TypeError):
                    return None

            def safe_int(val):
                if val is None or val == "":
                    return None
                try:
                    return int(val)
                except (ValueError, TypeError):
                    return None

            conn.execute(
                """INSERT INTO staging_receipts
                   (batch_id, vendor, date, invoice_no, amount, tax, total,
                    hostel_no, account_no, ifsc, remarks, status, image_path)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)""",
                (
                    batch_id,
                    entry.get("vendor", ""),
                    entry.get("date", ""),
                    entry.get("invoice_no", ""),
                    safe_float(entry.get("amount")),
                    safe_float(entry.get("tax")),
                    safe_float(entry.get("total")),
                    safe_int(entry.get("hostel_no")),
                    entry.get("account_no", ""),
                    entry.get("ifsc", ""),
                    entry.get("remarks", ""),
                    image_path,
                ),
            )
            saved += 1

    return {"status": "ok", "saved": saved}


# =====================================================
# LOAD DRAFTS
# =====================================================

@router.get("/{batch_id}/drafts")
def load_drafts(batch_id: int):
    """Load all saved draft receipts for a batch."""
    _check_columns_once()

    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, vendor, date, invoice_no, amount, tax, total,
                      hostel_no, account_no, ifsc, remarks, status, image_path
               FROM staging_receipts
               WHERE batch_id = ?
               ORDER BY id""",
            (batch_id,),
        ).fetchall()

    drafts = []
    for row in rows:
        image_path = row["image_path"] or ""
        # Build full URL for the frontend (served via /data static mount)
        image_url = f"/data/{image_path}" if image_path else ""

        drafts.append({
            "id": row["id"],
            "vendor": row["vendor"] or "",
            "date": row["date"] or "",
            "invoice_no": row["invoice_no"] or "",
            "amount": f"{row['amount']:.2f}" if row["amount"] else "0.00",
            "tax": f"{row['tax']:.2f}" if row["tax"] else "0.00",
            "total": f"{row['total']:.2f}" if row["total"] else "0.00",
            "hostel_no": str(row["hostel_no"]) if row["hostel_no"] else "",
            "account_no": row["account_no"] or "",
            "ifsc": row["ifsc"] or "",
            "remarks": row["remarks"] or "",
            "status": row["status"] or "draft",
            "image_path": image_path,
            "image_url": image_url,
        })

    return {"batch_id": batch_id, "drafts": drafts, "count": len(drafts)}


# =====================================================
# DELETE DRAFTS
# =====================================================

class DeleteRequest(BaseModel):
    ids: list[int] = []


@router.delete("/{batch_id}/drafts")
def clear_drafts(batch_id: int):
    """Clear all drafts for a batch (called after successful push)."""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM staging_receipts WHERE batch_id = ?", (batch_id,)
        )
        count = cursor.rowcount or 0

    # Also clean up staging images
    batch_dir = STAGING_DIR / str(batch_id)
    if batch_dir.exists():
        shutil.rmtree(batch_dir, ignore_errors=True)

    return {"status": "ok", "deleted": count}


@router.delete("/receipts")
def delete_staging_receipts(body: DeleteRequest):
    if not body.ids:
        return {
            "status": "error",
            "message": "No receipt IDs provided",
            "deleted_count": 0,
        }

    placeholders = ",".join("?" for _ in body.ids)
    sql = f"DELETE FROM staging_receipts WHERE id IN ({placeholders})"

    try:
        with get_db() as conn:
            cursor = conn.execute(sql, body.ids)
            deleted_count = cursor.rowcount if cursor.rowcount is not None else 0
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "deleted_count": 0,
        }

    return {
        "status": "success",
        "message": "Staging receipts deleted",
        "deleted_count": deleted_count,
    }