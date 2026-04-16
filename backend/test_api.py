"""
Test script — run with: python test_api.py
Requires the server to be running: python main.py
"""

import requests
import io
import zipfile
import sys

BASE = "http://127.0.0.1:8741"


def check(label, resp):
    status = "OK" if resp.ok else "FAIL"
    print(f"  [{status}] {label} — {resp.status_code}")
    if not resp.ok:
        print(f"        {resp.text[:200]}")
    return resp


def main():
    print("=" * 60)
    print("Receipt Processor Pro — API Test Suite")
    print("=" * 60)

    # 1. Health check
    print("\n1. Health Check")
    r = check("GET /api/health", requests.get(f"{BASE}/api/health"))
    if not r.ok:
        print("\n  Server not running. Start it with: python main.py")
        sys.exit(1)

    # 2. Create a batch
    print("\n2. Create Batch")
    r = check("POST /api/batches", requests.post(f"{BASE}/api/batches", json={
        "name": "Test Batch Feb 2026",
        "source_folder": "D:\\DATAset\\images"
    }))
    batch = r.json()
    batch_id = batch["id"]
    print(f"        Created batch ID: {batch_id}")

    # 3. Upload CSV via multipart
    print("\n3. Upload CSV (multipart)")
    sample_csv = """filename,vendor_name,invoice_number,date,hostel_number,grand_total,sub_total,total_tax,account_number,ifsc_code
receipt_001.jpg,PARKASH BROTHERS,PB-B-11699,07/02/2026,2,3900.00,3536.80,363.20,161841678,HDFC0016843
receipt_002.jpg,PRAKASH BROS,PB-B-11791,09/02/2026,2,3270.00,3135.70,134.30,13846271678,HDFC2138
receipt_003.jpg,AMUL DAIRY,AD-2456,15/02/2026,1,8925.00,8500.00,425.00,1348620125,SBIN16385345
receipt_004.jpg,PARKASH BROTHERS,PB-B-11850,12/03/2026,1,4500.00,4200.00,300.00,138461238,HDFC0216832
receipt_005.jpg,AMUL DAIRY,AD-2501,20/03/2026,2,2100.00,2000.00,100.00,1348620125,HDFC00021384"""

    r = check("CSV upload", requests.post(
        f"{BASE}/api/batches/{batch_id}/upload",
        files=[("files", ("receipt_data.csv", sample_csv.encode(), "text/csv"))],
    ))
    result = r.json()
    print(f"        Total imported: {result['total_imported']}, CSV receipts: {result['csv_receipts']}")

    # 4. Upload fake images (small test PNGs)
    print("\n4. Upload Images (multipart)")
    # Create minimal valid 1x1 PNG
    png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

    r = check("Image upload (2 PNGs)", requests.post(
        f"{BASE}/api/batches/{batch_id}/upload",
        files=[
            ("files", ("test_receipt_A.png", png_header, "image/png")),
            ("files", ("test_receipt_B.png", png_header, "image/png")),
        ],
    ))
    result = r.json()
    print(f"        Total imported: {result['total_imported']}, Images: {result['images']}")

    # 5. Upload ZIP of images
    print("\n5. Upload ZIP (multipart)")
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("receipt_from_zip_1.png", png_header)
        zf.writestr("receipt_from_zip_2.png", png_header)
        zf.writestr("subfolder/receipt_from_zip_3.png", png_header)
    zip_buf.seek(0)

    r = check("ZIP upload", requests.post(
        f"{BASE}/api/batches/{batch_id}/upload",
        files=[("files", ("receipts_batch.zip", zip_buf.getvalue(), "application/zip"))],
    ))
    result = r.json()
    print(f"        Total imported: {result['total_imported']}, ZIP images: {result['zip_images']}")

    # 6. Mixed upload (image + CSV at once)
    print("\n6. Mixed Upload (image + CSV)")
    r = check("Mixed upload", requests.post(
        f"{BASE}/api/batches/{batch_id}/upload",
        files=[
            ("files", ("another_receipt.png", png_header, "image/png")),
            ("files", ("more_data.csv", sample_csv.encode(), "text/csv")),
        ],
    ))
    result = r.json()
    print(f"        Total: {result['total_imported']}, Images: {result['images']}, CSV: {result['csv_receipts']}")

    # 7. Query all receipts
    print("\n7. Query Receipts")
    r = check("GET /api/receipts", requests.get(f"{BASE}/api/receipts"))
    data = r.json()
    print(f"        Total receipts: {data['count']}")

    # 8. Filter queries
    r = check("Filter: month=2, year=2026",
              requests.get(f"{BASE}/api/receipts", params={"month": 2, "year": 2026}))
    print(f"        Feb 2026: {r.json()['count']}")

    r = check("Filter: hostel_no=1",
              requests.get(f"{BASE}/api/receipts", params={"hostel_no": 1}))
    print(f"        Hostel 1: {r.json()['count']}")

    # 9. Edit + Audit
    print("\n8. Edit Receipt + Audit Log")
    r = check("PUT /api/receipts/1", requests.put(f"{BASE}/api/receipts/1", json={
        "total": 3950.00,
        "remarks": "Price adjusted"
    }))
    r = check("GET /api/receipts/1/edits", requests.get(f"{BASE}/api/receipts/1/edits"))
    edits = r.json()
    print(f"        Edits: {len(edits)}")
    for e in edits:
        print(f"          {e['field_name']}: {e['old_value']} -> {e['new_value']}")

    # 10. Vendors
    print("\n9. Vendors")
    r = check("GET /api/vendors", requests.get(f"{BASE}/api/vendors"))
    for v in r.json():
        print(f"        {v['canonical_name']}")

    # 11. Reports
    print("\n10. Reports")
    r = check("Vendor Report", requests.get(f"{BASE}/api/reports/vendor", params={"vendor": "AMUL DAIRY"}))
    vr = r.json()
    print(f"        AMUL DAIRY: {vr['final_summary']['total_entries']} entries, total: {vr['final_summary']['grand_total']}")

    r = check("Monthly Report", requests.get(f"{BASE}/api/reports/monthly", params={"month": 2, "year": 2026}))
    print(f"        Feb 2026: {r.json()['total_entries']} entries")

    r = check("Hostel Report", requests.get(f"{BASE}/api/reports/hostel", params={"hostel_no": 2, "month": 2, "year": 2026}))
    print(f"        Hostel 2: {r.json()['grand_total']}")

    r = check("Yearly Report", requests.get(f"{BASE}/api/reports/yearly", params={"year": 2026}))
    print(f"        2026 total: {r.json()['grand_total']}")

    # 12. Exports
    print("\n11. Exports")
    r = check("Excel", requests.get(f"{BASE}/api/export/excel"))
    print(f"        Excel: {len(r.content)} bytes")

    r = check("PDF vendor", requests.get(f"{BASE}/api/export/pdf", params={"report_type": "vendor", "vendor": "AMUL DAIRY"}))
    print(f"        PDF: {len(r.content)} bytes")

    # 13. Verify image serving
    print("\n12. Static Image Serving")
    r = check("GET /data/images/...", requests.get(f"{BASE}/data/images/{batch_id}/test_receipt_A.png"))
    print(f"        Image served: {len(r.content)} bytes")

    print("\n" + "=" * 60)
    print("All tests complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
