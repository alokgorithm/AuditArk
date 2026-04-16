"""Pydantic models for request/response validation."""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


# --- Batches ---

class BatchCreate(BaseModel):
    name: str
    source_folder: Optional[str] = None


class BatchResponse(BaseModel):
    id: int
    name: str
    source_folder: Optional[str]
    receipt_count: int
    created_at: str


# --- Receipts ---

class ReceiptCreate(BaseModel):
    batch_id: int
    vendor: Optional[str] = None
    date: Optional[str] = None
    invoice_no: Optional[str] = None
    amount: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    category: Optional[str] = None
    hostel_no: Optional[int] = None
    account_no: Optional[str] = None
    ifsc: Optional[str] = None
    remarks: Optional[str] = None
    confidence: Optional[float] = None
    image_path: Optional[str] = None


class ReceiptUpdate(BaseModel):
    vendor: Optional[str] = None
    date: Optional[str] = None
    invoice_no: Optional[str] = None
    amount: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    category: Optional[str] = None
    hostel_no: Optional[int] = None
    account_no: Optional[str] = None
    ifsc: Optional[str] = None
    remarks: Optional[str] = None


class ReceiptResponse(BaseModel):
    id: int
    batch_id: int
    vendor: Optional[str]
    normalized_vendor: Optional[str]
    date: Optional[str]
    invoice_no: Optional[str]
    amount: Optional[float]
    tax: Optional[float]
    total: Optional[float]
    category: Optional[str]
    hostel_no: Optional[int]
    account_no: Optional[str]
    ifsc: Optional[str]
    remarks: Optional[str]
    confidence: Optional[float]
    image_path: Optional[str]
    image_hash: Optional[str] = None
    status: Optional[str] = "extracted"
    created_at: str
    updated_at: str


class EditRecord(BaseModel):
    id: int
    receipt_id: int
    batch_id: Optional[int]
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    edited_at: str


# --- Vendors ---

class VendorResponse(BaseModel):
    id: int
    name: str
    normalized_name: str
    canonical_name: str
    aliases: Optional[str]
    account_no: Optional[str]
    ifsc: Optional[str]
    bank_name: Optional[str] = None
    default_amount: Optional[float] = 0
    remarks: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class VendorCreate(BaseModel):
    name: str
    account_no: Optional[str] = None
    ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    default_amount: Optional[float] = 0
    remarks: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    account_no: Optional[str] = None
    ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    default_amount: Optional[float] = None
    remarks: Optional[str] = None


class VendorMergeRequest(BaseModel):
    source_vendor_id: int
    target_vendor_id: int


# --- Query ---

class QueryParams(BaseModel):
    vendor: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    hostel_no: Optional[int] = None
    batch_id: Optional[int] = None
    category: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class QueryResult(BaseModel):
    count: int
    receipts: list[ReceiptResponse]


# --- Reports ---

class ReportRequest(BaseModel):
    vendor: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    hostel_no: Optional[int] = None
    report_type: str  # "vendor", "monthly", "hostel", "yearly"
