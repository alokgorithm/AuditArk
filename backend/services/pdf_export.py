"""Print-ready PDF generation using ReportLab."""

import io
import sqlite3
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from services.report_engine import vendor_report, monthly_report, hostel_report

MARGIN = 15 * mm
HEADER_BG = colors.HexColor("#1F4E79")
ALT_ROW_BG = colors.HexColor("#F2F7FB")

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _make_table(headers: list[str], rows: list[list], col_widths=None) -> Table:
    data = [headers] + rows
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    # Alternating rows
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), ALT_ROW_BG))

    # Right-align currency columns (last few typically)
    for col_idx in range(len(headers)):
        h = headers[col_idx].lower()
        if any(kw in h for kw in ("amount", "tax", "total")):
            style_cmds.append(("ALIGN", (col_idx, 1), (col_idx, -1), "RIGHT"))

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle(style_cmds))
    return t


def _fmt(val) -> str:
    if val is None:
        return ""
    if isinstance(val, float):
        return f"{val:,.2f}"
    return str(val)


def generate_vendor_pdf(conn: sqlite3.Connection, vendor: str, month=None, year=None) -> io.BytesIO:
    report = vendor_report(conn, vendor, month, year)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=16, spaceAfter=6)
    elements = []

    period = ""
    if month and year:
        period = f" — {MONTH_NAMES[month]} {year}"
    elif year:
        period = f" — {year}"

    elements.append(Paragraph(f"Vendor Report: {vendor}{period}", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    # All entries table
    if report["all_entries"]:
        elements.append(Paragraph("All Entries", styles["Heading2"]))
        headers = ["Date", "Invoice No", "Hostel", "Amount", "Tax", "Total"]
        rows = [[e["date"], e["invoice_no"], _fmt(e["hostel_no"]),
                 _fmt(e["amount"]), _fmt(e["tax"]), _fmt(e["total"])]
                for e in report["all_entries"]]
        elements.append(_make_table(headers, rows))
        elements.append(Spacer(1, 6 * mm))

    # Monthly summary
    if report["monthly_summary"]:
        elements.append(Paragraph("Monthly Summary", styles["Heading2"]))
        headers = ["Month", "Total Amount", "Total Tax", "Grand Total", "Entries"]
        rows = [[m["month"], _fmt(m["total_amount"]), _fmt(m["total_tax"]),
                 _fmt(m["grand_total"]), str(m["entries"])]
                for m in report["monthly_summary"]]
        elements.append(_make_table(headers, rows))
        elements.append(Spacer(1, 6 * mm))

    # Final summary
    fs = report["final_summary"]
    elements.append(Paragraph("Final Summary", styles["Heading2"]))
    summary_data = [
        ["Year Total", _fmt(fs["total_amount"])],
        ["Total Tax", _fmt(fs["total_tax"])],
        ["Grand Total", _fmt(fs["grand_total"])],
        ["Total Entries", str(fs["total_entries"])],
    ]
    t = Table(summary_data, colWidths=[120, 120])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    doc.build(elements)
    buf.seek(0)
    return buf


def generate_monthly_pdf(conn: sqlite3.Connection, month: int, year: int) -> io.BytesIO:
    report = monthly_report(conn, month, year)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=16, spaceAfter=6)
    elements = []

    elements.append(Paragraph(f"Monthly Report: {MONTH_NAMES[month]} {year}", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    headers = ["Vendor", "Total Amount", "Total Tax", "Grand Total", "Count"]
    rows = [[v["vendor"], _fmt(v["total_amount"]), _fmt(v["total_tax"]),
             _fmt(v["grand_total"]), str(v["count"])]
            for v in report["vendors"]]
    # Total row
    rows.append(["TOTAL", "", "", _fmt(report["grand_total"]), str(report["total_entries"])])
    elements.append(_make_table(headers, rows))

    doc.build(elements)
    buf.seek(0)
    return buf


def generate_hostel_pdf(conn: sqlite3.Connection, hostel_no: int, month: int, year: int) -> io.BytesIO:
    report = hostel_report(conn, hostel_no, month, year)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=16, spaceAfter=6)
    elements = []

    elements.append(Paragraph(
        f"Hostel {hostel_no} — {MONTH_NAMES[month]} {year}", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 8 * mm))

    headers = ["Sr", "Vendor Name", "Account No", "IFSC", "Amount", "Remarks"]
    rows = [[str(r["sr"]), r["vendor_name"], r["account_no"] or "", r["ifsc"] or "",
             _fmt(r["amount"]), r["remarks"]]
            for r in report["rows"]]
    rows.append(["", "", "", "TOTAL", _fmt(report["grand_total"]), ""])
    elements.append(_make_table(headers, rows))

    elements.append(Spacer(1, 20 * mm))
    elements.append(Paragraph("Signature: ________________________", styles["Normal"]))

    doc.build(elements)
    buf.seek(0)
    return buf
