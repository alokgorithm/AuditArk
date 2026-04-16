"""Report generation endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from database.connection import get_db
from services.report_engine import vendor_report, monthly_report, hostel_report, yearly_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/vendor")
def get_vendor_report(
    vendor: str = Query(...),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
):
    with get_db() as conn:
        return vendor_report(conn, vendor, month, year)


@router.get("/monthly")
def get_monthly_report(
    month: int = Query(...),
    year: int = Query(...),
):
    with get_db() as conn:
        return monthly_report(conn, month, year)


@router.get("/hostel")
def get_hostel_report(
    hostel_no: int = Query(...),
    month: int = Query(...),
    year: int = Query(...),
):
    with get_db() as conn:
        return hostel_report(conn, hostel_no, month, year)


@router.get("/yearly")
def get_yearly_report(year: int = Query(...)):
    with get_db() as conn:
        return yearly_report(conn, year)
