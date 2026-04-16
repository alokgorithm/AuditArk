"""OCR scanning endpoint — accepts a single image, returns extracted fields."""

import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException

from services.ocr_service import process_receipt_image

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


def _normalize_date_for_input(raw_date: str) -> str:
    """Normalize OCR date text to YYYY-MM-DD for HTML date input fields."""
    if not raw_date:
        return ""

    text = " ".join(str(raw_date).strip().replace(",", " ").split())
    if not text:
        return ""

    # Already in ISO format.
    try:
        return datetime.strptime(text, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        pass

    candidates = [
        "%d/%m/%Y",
        "%d/%m/%y",
        "%d-%m-%Y",
        "%d-%m-%y",
        "%d.%m.%Y",
        "%d.%m.%y",
        "%d %b %Y",
        "%d %B %Y",
        "%d %b %y",
        "%d %B %y",
        "%b %d %Y",
        "%B %d %Y",
        "%b %d %y",
        "%B %d %y",
    ]

    for fmt in candidates:
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    # If we cannot confidently parse it, keep it blank instead of showing an invalid date.
    return ""


@router.post("/scan")
async def scan_receipt(file: UploadFile = File(...)):
    """Run OCR on a single uploaded image and return extracted fields.

    This is used by the staging preview UI to auto-fill receipt data
    without persisting the image to the database.
    """
    allowed = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    # Write to a temp file for the OCR engine (needs a file path)
    suffix = Path(file.filename or "img.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        fields = process_receipt_image(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    # Build category remark
    category = fields.get("category")
    remarks = f"[Auto] {category}" if category else ""
    normalized_date = _normalize_date_for_input(fields.get("date") or "")

    return {
        "vendor": fields.get("vendor_name") or "",
        "invoice_no": fields.get("invoice_number") or "",
        "date": normalized_date,
        "hostel_no": fields.get("hostel_number") or "",
        "amount": fields.get("sub_total") or fields.get("grand_total") or "0.00",
        "tax": fields.get("total_tax") or "0.00",
        "total": fields.get("grand_total") or "0.00",
        "account_no": fields.get("account_number") or "",
        "ifsc": fields.get("ifsc_code") or "",
        "remarks": remarks,
        "ocr_line_count": fields.get("ocr_line_count", 0),
    }
