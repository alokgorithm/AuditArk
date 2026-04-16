"""Vendor list, merge, normalize endpoints."""

import re
import sqlite3

from fastapi import APIRouter, HTTPException

from database.connection import get_db
from models.schemas import VendorResponse, VendorMergeRequest, VendorCreate, VendorUpdate
from services.vendor_service import merge_vendors

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


def _normalize_name(name: str) -> str:
    normalized = name.strip().upper()
    normalized = re.sub(r"[.,;:!@#$%^&*()_+=\[\]{}<>~`|\\]", " ", normalized)
    normalized = re.sub(r"\bBROS?\b", "BROTHERS", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


@router.get("", response_model=list[VendorResponse])
def list_vendors():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM vendors ORDER BY normalized_name"
        ).fetchall()
        return [dict(r) for r in rows]


@router.post("", response_model=VendorResponse)
def create_vendor(body: VendorCreate):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Vendor name is required")

    normalized_name = _normalize_name(name)

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM vendors WHERE normalized_name = ?",
            (normalized_name,),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Vendor already exists")

        try:
            cursor = conn.execute(
                """
                INSERT INTO vendors (
                    name, normalized_name, canonical_name, aliases,
                    account_no, ifsc, bank_name, default_amount, remarks,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    name,
                    normalized_name,
                    normalized_name,
                    "[]",
                    body.account_no,
                    body.ifsc,
                    body.bank_name,
                    body.default_amount if body.default_amount is not None else 0,
                    body.remarks,
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Vendor already exists")

        row = conn.execute("SELECT * FROM vendors WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)


@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, body: VendorUpdate):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Vendor not found")

        payload = body.model_dump(exclude_unset=True)
        if not payload:
            return dict(existing)

        next_name = (payload.get("name") or existing["name"] or "").strip()
        if not next_name:
            raise HTTPException(status_code=400, detail="Vendor name is required")

        normalized_name = _normalize_name(next_name)

        duplicate = conn.execute(
            "SELECT id FROM vendors WHERE normalized_name = ? AND id != ?",
            (normalized_name, vendor_id),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="Vendor already exists")

        try:
            conn.execute(
                """
                UPDATE vendors SET
                    name = ?,
                    normalized_name = ?,
                    canonical_name = ?,
                    account_no = ?,
                    ifsc = ?,
                    bank_name = ?,
                    default_amount = ?,
                    remarks = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    next_name,
                    normalized_name,
                    normalized_name,
                    payload.get("account_no", existing["account_no"]),
                    payload.get("ifsc", existing["ifsc"]),
                    payload.get("bank_name", existing["bank_name"]),
                    payload.get("default_amount", existing["default_amount"]),
                    payload.get("remarks", existing["remarks"]),
                    vendor_id,
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Vendor already exists")

        row = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        return dict(row)


@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Vendor not found")

        conn.execute("DELETE FROM vendors WHERE id = ?", (vendor_id,))
        return {"deleted": True, "id": vendor_id}


@router.post("/merge")
def merge_vendor_entries(req: VendorMergeRequest):
    with get_db() as conn:
        try:
            count = merge_vendors(conn, req.source_vendor_id, req.target_vendor_id)
            return {"merged": True, "receipts_updated": count}
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
