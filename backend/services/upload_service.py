"""Upload handling — images, ZIPs, CSVs. Runs OCR, detects duplicates."""

import os
import sqlite3
import zipfile
import tempfile
from pathlib import Path

from config import IMAGES_DIR, IMAGE_EXTENSIONS
from services.receipt_service import insert_receipt, bulk_import_csv, compute_image_hash, check_duplicate
from services.ocr_service import process_receipt_image


def _ensure_batch_dir(batch_id: int) -> Path:
    batch_dir = IMAGES_DIR / str(batch_id)
    batch_dir.mkdir(parents=True, exist_ok=True)
    return batch_dir


def _save_image(batch_id: int, filename: str, content: bytes) -> Path:
    batch_dir = _ensure_batch_dir(batch_id)
    dest = batch_dir / filename
    counter = 1
    while dest.exists():
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        dest = batch_dir / f"{stem}_{counter}{suffix}"
        counter += 1
    dest.write_bytes(content)
    return dest


# Public alias for use by push endpoint
save_image = _save_image


def _process_image_with_ocr(
    conn: sqlite3.Connection, batch_id: int, abs_path: Path, original_name: str,
    image_hash: str,
) -> dict:
    """Run OCR on a saved image and create a receipt with extracted data."""
    rel_path = f"images/{batch_id}/{abs_path.name}"

    try:
        fields = process_receipt_image(str(abs_path))
    except Exception as e:
        insert_receipt(conn, {
            "batch_id": batch_id,
            "image_path": rel_path,
            "image_hash": image_hash,
            "remarks": f"OCR failed: {e}",
            "status": "pending",
        })
        return {"status": "ocr_failed", "error": str(e), "file": original_name}

    hostel_no = None
    if fields.get("hostel_number"):
        try:
            hostel_no = int(fields["hostel_number"])
        except (ValueError, TypeError):
            pass

    insert_receipt(conn, {
        "batch_id": batch_id,
        "vendor": fields.get("vendor_name"),
        "date": fields.get("date"),
        "invoice_no": fields.get("invoice_number"),
        "amount": fields.get("sub_total"),
        "tax": fields.get("total_tax"),
        "total": fields.get("grand_total"),
        "hostel_no": hostel_no,
        "account_no": fields.get("account_number"),
        "ifsc": fields.get("ifsc_code"),
        "image_path": rel_path,
        "image_hash": image_hash,
        "status": "extracted",
    })

    return {"status": "ok", "file": original_name, "vendor": fields.get("vendor_name")}


def process_uploaded_files(
    conn: sqlite3.Connection,
    batch_id: int,
    files: list[tuple[str, bytes]],
) -> dict:
    result = {
        "images": 0,
        "csv_receipts": 0,
        "zip_images": 0,
        "duplicates": [],
        "errors": [],
        "ocr_details": [],
    }

    for filename, content in files:
        ext = Path(filename).suffix.lower()
        try:
            if ext == ".csv":
                csv_text = content.decode("utf-8-sig")
                count = bulk_import_csv(conn, batch_id, csv_text)
                result["csv_receipts"] += count

            elif ext == ".zip":
                zip_count = _process_zip(conn, batch_id, content, result)
                result["zip_images"] += zip_count

            elif ext in IMAGE_EXTENSIONS:
                img_hash = compute_image_hash(content)
                existing = check_duplicate(conn, img_hash)
                if existing:
                    result["duplicates"].append({
                        "file": filename,
                        "existing_receipt_id": existing["id"],
                        "existing_batch_id": existing["batch_id"],
                    })
                    continue

                abs_path = _save_image(batch_id, filename, content)
                ocr_result = _process_image_with_ocr(conn, batch_id, abs_path, filename, img_hash)
                result["images"] += 1
                result["ocr_details"].append(ocr_result)

            else:
                result["errors"].append(f"Unsupported file type: {filename}")

        except Exception as e:
            result["errors"].append(f"{filename}: {str(e)}")

    return result


def _process_zip(
    conn: sqlite3.Connection, batch_id: int, zip_bytes: bytes, result: dict
) -> int:
    count = 0
    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = Path(tmpdir) / "upload.zip"
        zip_path.write_bytes(zip_bytes)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(tmpdir)

        for root, _dirs, filenames in os.walk(tmpdir):
            for fname in sorted(filenames):
                fpath = Path(root) / fname
                if fpath.suffix.lower() in IMAGE_EXTENSIONS:
                    img_bytes = fpath.read_bytes()
                    img_hash = compute_image_hash(img_bytes)
                    existing = check_duplicate(conn, img_hash)
                    if existing:
                        result["duplicates"].append({
                            "file": fname,
                            "existing_receipt_id": existing["id"],
                            "existing_batch_id": existing["batch_id"],
                        })
                        continue

                    abs_path = _save_image(batch_id, fname, img_bytes)
                    ocr_result = _process_image_with_ocr(conn, batch_id, abs_path, fname, img_hash)
                    count += 1
                    result["ocr_details"].append(ocr_result)

    return count
