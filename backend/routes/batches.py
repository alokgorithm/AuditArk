"""Batch CRUD + multi-format upload + push endpoints."""

import json

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from database.connection import get_db
from models.schemas import BatchCreate, BatchResponse
from services.upload_service import process_uploaded_files, save_image
from services.receipt_service import insert_receipt, compute_image_hash, check_duplicate

router = APIRouter(prefix="/api/batches", tags=["batches"])


@router.get("", response_model=list[BatchResponse])
def list_batches():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM batches ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


@router.post("", response_model=BatchResponse, status_code=201)
def create_batch(batch: BatchCreate):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO batches (name, source_folder) VALUES (?, ?)",
            (batch.name, batch.source_folder),
        )
        row = conn.execute(
            "SELECT * FROM batches WHERE id = last_insert_rowid()"
        ).fetchone()
        return dict(row)


@router.post("/{batch_id}/upload")
async def upload_files(batch_id: int, files: list[UploadFile] = File(...)):
    """Upload receipt files to a batch.

    Accepts any mix of:
    - Images (.jpg, .png, .bmp, .tiff, .webp) — OCR runs automatically, receipt created
    - ZIP files (.zip) — images extracted, OCR runs on each
    - CSV files (.csv) — OCR output imported directly (no OCR needed)
    """
    with get_db() as conn:
        batch = conn.execute("SELECT * FROM batches WHERE id = ?", (batch_id,)).fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        file_data = []
        for f in files:
            content = await f.read()
            file_data.append((f.filename or "unknown", content))

        result = process_uploaded_files(conn, batch_id, file_data)

    total = result["images"] + result["csv_receipts"] + result["zip_images"]
    return {
        "batch_id": batch_id,
        "total_imported": total,
        "images": result["images"],
        "csv_receipts": result["csv_receipts"],
        "zip_images": result["zip_images"],
        "duplicates": result.get("duplicates", []),
        "errors": result["errors"],
        "ocr_details": result.get("ocr_details", []),
    }


@router.post("/{batch_id}/push")
async def push_batch(
    batch_id: int,
    files: list[UploadFile] = File(default=[]),
    receipts_json: str = Form(...),
):
    """Push staged receipts into the main receipts table.

    Accepts:
    - receipts_json: JSON array of receipt objects (each with a `filename` key)
    - files: corresponding image files
    """
    receipts = json.loads(receipts_json)

    with get_db() as conn:
        batch = conn.execute(
            "SELECT * FROM batches WHERE id = ?", (batch_id,)
        ).fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Map uploaded files by filename for lookup
        file_contents: dict[str, bytes] = {}
        for f in files:
            content = await f.read()
            file_contents[f.filename or "unknown"] = content

        inserted = 0
        duplicates = []

        for r in receipts:
            img_path = None
            img_hash = None
            fname = r.get("filename")

            if fname and fname in file_contents:
                content = file_contents[fname]
                img_hash = compute_image_hash(content)

                # Skip duplicates
                existing = check_duplicate(conn, img_hash)
                if existing:
                    duplicates.append({
                        "file": fname,
                        "existing_receipt_id": existing["id"],
                        "existing_batch_id": existing["batch_id"],
                    })
                    continue

                abs_path = save_image(batch_id, fname, content)
                img_path = f"images/{batch_id}/{abs_path.name}"

            hostel_no = None
            if r.get("hostel_no"):
                try:
                    hostel_no = int(r["hostel_no"])
                except (ValueError, TypeError):
                    pass

            insert_receipt(conn, {
                "batch_id": batch_id,
                "vendor": r.get("vendor") or None,
                "date": r.get("date") or None,
                "invoice_no": r.get("invoice_no") or None,
                "amount": r.get("amount") or None,
                "tax": r.get("tax") or None,
                "total": r.get("total") or None,
                "hostel_no": hostel_no,
                "account_no": r.get("account_no") or None,
                "ifsc": r.get("ifsc") or None,
                "remarks": r.get("remarks") or None,
                "image_path": img_path,
                "image_hash": img_hash,
                "status": "reviewed",
            })
            inserted += 1

        return {
            "batch_id": batch_id,
            "inserted": inserted,
            "duplicates": duplicates,
        }
