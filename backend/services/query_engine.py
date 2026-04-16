"""Dynamic multi-filter query builder for receipts."""

import sqlite3


def query_receipts(
    conn: sqlite3.Connection,
    vendor: str | None = None,
    month: int | None = None,
    year: int | None = None,
    hostel_no: int | None = None,
    batch_id: int | None = None,
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[int, list[dict]]:
    """Query receipts with dynamic filters. Returns (count, results)."""
    conditions = []
    params = []

    if vendor:
        conditions.append("normalized_vendor = ?")
        params.append(vendor)
    if month is not None:
        conditions.append("CAST(strftime('%m', date) AS INTEGER) = ?")
        params.append(month)
    if year is not None:
        conditions.append("CAST(strftime('%Y', date) AS INTEGER) = ?")
        params.append(year)
    if hostel_no is not None:
        conditions.append("hostel_no = ?")
        params.append(hostel_no)
    if batch_id is not None:
        conditions.append("batch_id = ?")
        params.append(batch_id)
    if category:
        conditions.append("category = ?")
        params.append(category)
    if date_from:
        conditions.append("date >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("date <= ?")
        params.append(date_to)

    where_clause = " AND ".join(conditions) if conditions else "1=1"
    sql = f"SELECT * FROM receipts WHERE {where_clause} ORDER BY date ASC"

    rows = conn.execute(sql, params).fetchall()
    results = [dict(r) for r in rows]
    return len(results), results
