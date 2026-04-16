"""File-based PDF export utility for receipt rows."""

from pathlib import Path
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Table, TableStyle


def generate_pdf(path: str, receipts: List[object]):
    if not receipts:
        raise ValueError("No data to export")

    output_path = Path(path)
    if not output_path.suffix:
        output_path = output_path.with_suffix(".pdf")

    parent_dir = output_path.parent
    if not parent_dir.exists() or not parent_dir.is_dir():
        raise ValueError("Invalid path")

    doc = SimpleDocTemplate(str(output_path), pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Receipt Report", styles["Title"]))
    elements.append(Spacer(1, 12))

    table_data = [["Vendor", "Date", "Invoice", "Hostel", "Amount", "Tax", "Total"]]
    for receipt in receipts:
        table_data.append([
            str(getattr(receipt, "vendor", "") or ""),
            str(getattr(receipt, "date", "") or ""),
            str(getattr(receipt, "invoice_no", "") or ""),
            str(getattr(receipt, "hostel_no", "") or ""),
            f"{float(getattr(receipt, 'amount', 0.0) or 0.0):,.2f}",
            f"{float(getattr(receipt, 'tax', 0.0) or 0.0):,.2f}",
            f"{float(getattr(receipt, 'total', 0.0) or 0.0):,.2f}",
        ])

    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (4, 1), (6, -1), "RIGHT"),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 16))

    total_amount = sum(float(getattr(receipt, "total", 0.0) or 0.0) for receipt in receipts)
    elements.append(Paragraph(f"Total Amount: ₹{total_amount:,.2f}", styles["Heading3"]))

    doc.build(elements)
