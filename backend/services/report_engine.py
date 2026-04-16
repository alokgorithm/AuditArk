"""Report generation — vendor, monthly, hostel, yearly reports."""

import sqlite3
from services.query_engine import query_receipts


def vendor_report(
    conn: sqlite3.Connection, vendor: str, month: int | None = None, year: int | None = None
) -> dict:
    """Generate vendor report with all entries, monthly summaries, and final total."""
    _, entries = query_receipts(conn, vendor=vendor, month=month, year=year)

    # Section A: All entries (already sorted by date)
    all_entries = []
    for e in entries:
        all_entries.append({
            "date": e["date"],
            "invoice_no": e["invoice_no"],
            "hostel_no": e["hostel_no"],
            "amount": e["amount"] or 0,
            "tax": e["tax"] or 0,
            "total": e["total"] or 0,
        })

    # Section B: Monthly summaries
    monthly = {}
    for e in entries:
        if not e["date"]:
            continue
        key = e["date"][:7]  # YYYY-MM
        if key not in monthly:
            monthly[key] = {"month": key, "total_amount": 0, "total_tax": 0, "grand_total": 0, "entries": 0}
        monthly[key]["total_amount"] += e["amount"] or 0
        monthly[key]["total_tax"] += e["tax"] or 0
        monthly[key]["grand_total"] += e["total"] or 0
        monthly[key]["entries"] += 1

    monthly_summary = sorted(monthly.values(), key=lambda x: x["month"])

    # Section C: Final summary
    total_amount = sum(e["amount"] or 0 for e in entries)
    total_tax = sum(e["tax"] or 0 for e in entries)
    grand_total = sum(e["total"] or 0 for e in entries)

    return {
        "vendor": vendor,
        "all_entries": all_entries,
        "monthly_summary": monthly_summary,
        "final_summary": {
            "total_amount": round(total_amount, 2),
            "total_tax": round(total_tax, 2),
            "grand_total": round(grand_total, 2),
            "total_entries": len(entries),
        },
    }


def monthly_report(conn: sqlite3.Connection, month: int, year: int) -> dict:
    """Monthly all-vendors report."""
    _, entries = query_receipts(conn, month=month, year=year)

    vendor_totals = {}
    for e in entries:
        v = e["normalized_vendor"] or "UNKNOWN"
        if v not in vendor_totals:
            vendor_totals[v] = {"vendor": v, "total_amount": 0, "total_tax": 0, "grand_total": 0, "count": 0}
        vendor_totals[v]["total_amount"] += e["amount"] or 0
        vendor_totals[v]["total_tax"] += e["tax"] or 0
        vendor_totals[v]["grand_total"] += e["total"] or 0
        vendor_totals[v]["count"] += 1

    vendors = sorted(vendor_totals.values(), key=lambda x: x["vendor"])
    grand_total = sum(v["grand_total"] for v in vendors)

    return {
        "month": month,
        "year": year,
        "vendors": vendors,
        "grand_total": round(grand_total, 2),
        "total_entries": len(entries),
    }


def hostel_report(conn: sqlite3.Connection, hostel_no: int, month: int, year: int) -> dict:
    """Hostel institutional report."""
    _, entries = query_receipts(conn, hostel_no=hostel_no, month=month, year=year)

    # Aggregate by vendor for the institutional format
    vendor_agg = {}
    for e in entries:
        v = e["normalized_vendor"] or "UNKNOWN"
        if v not in vendor_agg:
            vendor_agg[v] = {
                "vendor": v,
                "account_no": e["account_no"],
                "ifsc": e["ifsc"],
                "total": 0,
                "remarks": e.get("remarks") or "",
            }
        vendor_agg[v]["total"] += e["total"] or 0
        # Use latest account/IFSC if available
        if e["account_no"]:
            vendor_agg[v]["account_no"] = e["account_no"]
        if e["ifsc"]:
            vendor_agg[v]["ifsc"] = e["ifsc"]

    rows = []
    for i, v in enumerate(sorted(vendor_agg.values(), key=lambda x: x["vendor"]), 1):
        rows.append({
            "sr": i,
            "vendor_name": v["vendor"],
            "account_no": v["account_no"],
            "ifsc": v["ifsc"],
            "amount": round(v["total"], 2),
            "remarks": v["remarks"],
        })

    grand_total = sum(r["amount"] for r in rows)

    return {
        "hostel_no": hostel_no,
        "month": month,
        "year": year,
        "rows": rows,
        "grand_total": round(grand_total, 2),
    }


def yearly_report(conn: sqlite3.Connection, year: int) -> dict:
    """Yearly summary — vendor totals, category totals, monthly trend."""
    _, entries = query_receipts(conn, year=year)

    # Vendor-wise annual totals
    vendor_totals = {}
    for e in entries:
        v = e["normalized_vendor"] or "UNKNOWN"
        if v not in vendor_totals:
            vendor_totals[v] = {"vendor": v, "total_amount": 0, "total_tax": 0, "grand_total": 0, "count": 0}
        vendor_totals[v]["total_amount"] += e["amount"] or 0
        vendor_totals[v]["total_tax"] += e["tax"] or 0
        vendor_totals[v]["grand_total"] += e["total"] or 0
        vendor_totals[v]["count"] += 1

    # Category breakdown
    category_totals = {}
    for e in entries:
        c = e["category"] or "Uncategorized"
        if c not in category_totals:
            category_totals[c] = {"category": c, "total": 0, "count": 0}
        category_totals[c]["total"] += e["total"] or 0
        category_totals[c]["count"] += 1

    # Monthly trend
    monthly_trend = {}
    for e in entries:
        if not e["date"]:
            continue
        m = int(e["date"][5:7])
        if m not in monthly_trend:
            monthly_trend[m] = {"month": m, "total_amount": 0, "total_tax": 0, "grand_total": 0, "entries": 0}
        monthly_trend[m]["total_amount"] += e["amount"] or 0
        monthly_trend[m]["total_tax"] += e["tax"] or 0
        monthly_trend[m]["grand_total"] += e["total"] or 0
        monthly_trend[m]["entries"] += 1

    grand_total = sum(e["total"] or 0 for e in entries)

    return {
        "year": year,
        "vendor_summary": sorted(vendor_totals.values(), key=lambda x: x["vendor"]),
        "category_summary": sorted(category_totals.values(), key=lambda x: x["category"]),
        "monthly_trend": sorted(monthly_trend.values(), key=lambda x: x["month"]),
        "grand_total": round(grand_total, 2),
        "total_entries": len(entries),
    }
