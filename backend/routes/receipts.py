"""Receipt CRUD + query + delete + status endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from config import DATA_DIR
from database.connection import get_db
from models.schemas import ReceiptUpdate, ReceiptResponse, QueryResult, EditRecord
from services.receipt_service import (
    update_receipt, get_receipt, get_receipt_edits,
    update_receipt_status, delete_receipt, delete_receipt_image, bulk_delete_receipts,
    insert_receipt,
)
from services.query_engine import query_receipts
from services.ocr_service import process_receipt_image

router = APIRouter(prefix="/api/receipts", tags=["receipts"])


@router.get("", response_model=QueryResult)
def list_receipts(
    vendor: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    hostel_no: Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    with get_db() as conn:
        count, results = query_receipts(
            conn, vendor=vendor, month=month, year=year,
            hostel_no=hostel_no, batch_id=batch_id, category=category,
            date_from=date_from, date_to=date_to,
        )
        return {"count": count, "receipts": results}


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_single_receipt(receipt_id: int):
    with get_db() as conn:
        receipt = get_receipt(conn, receipt_id)
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        return receipt


@router.put("/{receipt_id}", response_model=ReceiptResponse)
def update_single_receipt(receipt_id: int, updates: ReceiptUpdate):
    with get_db() as conn:
        try:
            updated = update_receipt(conn, receipt_id, updates.model_dump(exclude_none=True))
            return updated
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))


@router.get("/{receipt_id}/edits", response_model=list[EditRecord])
def get_edits(receipt_id: int):
    with get_db() as conn:
        return get_receipt_edits(conn, receipt_id)


# --- Status ---

class StatusUpdate(BaseModel):
    status: str  # pending, processing, extracted, reviewed, locked


@router.patch("/{receipt_id}/status")
def patch_status(receipt_id: int, body: StatusUpdate):
    with get_db() as conn:
        try:
            return update_receipt_status(conn, receipt_id, body.status)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))


# --- Delete ---

@router.delete("/{receipt_id}")
def delete_single_receipt(receipt_id: int):
    with get_db() as conn:
        if delete_receipt(conn, receipt_id):
            return {"deleted": True, "id": receipt_id}
        raise HTTPException(status_code=404, detail="Receipt not found")


@router.delete("/{receipt_id}/image")
def remove_image(receipt_id: int):
    with get_db() as conn:
        if delete_receipt_image(conn, receipt_id):
            return {"image_removed": True, "id": receipt_id}
        raise HTTPException(status_code=404, detail="Receipt not found")


class BulkDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/bulk-delete")
def bulk_delete(body: BulkDeleteRequest):
    with get_db() as conn:
        count = bulk_delete_receipts(conn, body.ids)
        return {"deleted": count}


@router.post("/retry-ocr")
def retry_failed_ocr():
    """Re-run OCR on all receipts that previously failed."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, batch_id, image_path FROM receipts "
            "WHERE status = 'pending' AND remarks LIKE 'OCR failed:%'"
        ).fetchall()

        retried = 0
        errors = []
        for row in rows:
            rid, batch_id, image_path = row["id"], row["batch_id"], row["image_path"]
            abs_path = DATA_DIR / image_path
            if not abs_path.exists():
                errors.append({"id": rid, "error": "Image file not found"})
                continue

            try:
                fields = process_receipt_image(str(abs_path))
            except Exception as e:
                errors.append({"id": rid, "error": str(e)})
                continue

            hostel_no = None
            if fields.get("hostel_number"):
                try:
                    hostel_no = int(fields["hostel_number"])
                except (ValueError, TypeError):
                    pass

            conn.execute(
                """UPDATE receipts SET
                    vendor = ?, date = ?, invoice_no = ?,
                    amount = ?, tax = ?, total = ?,
                    hostel_no = ?, account_no = ?, ifsc = ?,
                    status = 'extracted', remarks = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?""",
                (
                    fields.get("vendor_name"),
                    fields.get("date"),
                    fields.get("invoice_number"),
                    fields.get("sub_total"),
                    fields.get("total_tax"),
                    fields.get("grand_total"),
                    hostel_no,
                    fields.get("account_number"),
                    fields.get("ifsc_code"),
                    rid,
                ),
            )
            retried += 1

        return {"retried": retried, "errors": errors}
