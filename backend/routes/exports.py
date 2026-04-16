"""Excel and PDF export endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database.connection import get_db
from services.excel_export import generate_excel
from services.pdf_file_export import generate_pdf
from services.pdf_export import generate_vendor_pdf, generate_monthly_pdf, generate_hostel_pdf

router = APIRouter(prefix="/api/export", tags=["exports"])


class Receipt(BaseModel):
    vendor: str
    date: str
    invoice_no: str
    amount: float
    tax: float
    total: float
    hostel_no: str
    remarks: str


class PDFExportRequest(BaseModel):
    path: str
    data: List[Receipt]


@router.get("/excel")
def download_excel(
    vendor: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    hostel_no: Optional[int] = Query(None),
    batch_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    filters = {k: v for k, v in dict(
        vendor=vendor, month=month, year=year, hostel_no=hostel_no,
        batch_id=batch_id, category=category, date_from=date_from, date_to=date_to,
    ).items() if v is not None}

    with get_db() as conn:
        buf = generate_excel(conn, **filters)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=receipts_export.xlsx"},
    )


@router.get("/pdf")
def download_pdf(
    report_type: str = Query(..., description="vendor, monthly, or hostel"),
    vendor: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    hostel_no: Optional[int] = Query(None),
):
    with get_db() as conn:
        if report_type == "vendor":
            if not vendor:
                return {"error": "vendor parameter required for vendor report"}
            buf = generate_vendor_pdf(conn, vendor, month, year)
            filename = f"vendor_report_{vendor}.pdf"
        elif report_type == "monthly":
            if not month or not year:
                return {"error": "month and year required for monthly report"}
            buf = generate_monthly_pdf(conn, month, year)
            filename = f"monthly_report_{year}_{month:02d}.pdf"
        elif report_type == "hostel":
            if not hostel_no or not month or not year:
                return {"error": "hostel_no, month, and year required for hostel report"}
            buf = generate_hostel_pdf(conn, hostel_no, month, year)
            filename = f"hostel_{hostel_no}_report_{year}_{month:02d}.pdf"
        else:
            return {"error": f"Unknown report_type: {report_type}"}

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/pdf")
def export_pdf(req: PDFExportRequest):
    try:
        if not req.data:
            return {"status": "error", "message": "No data to export"}
        generate_pdf(req.path, req.data)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
