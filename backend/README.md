# Receipt Processor Pro — Backend

Offline Financial Data & Reporting Engine built with FastAPI + SQLite.

## Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server starts on `http://127.0.0.1:8741`.

## API Endpoints

| Method | Endpoint                      | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | /api/health                   | Health check                         |
| GET    | /api/batches                  | List all batches                     |
| POST   | /api/batches                  | Create a new batch                   |
| POST   | /api/batches/{id}/upload      | Upload receipts from OCR CSV         |
| GET    | /api/receipts                 | Query receipts (all filters)         |
| GET    | /api/receipts/{id}            | Get single receipt                   |
| PUT    | /api/receipts/{id}            | Update receipt (triggers audit log)  |
| GET    | /api/receipts/{id}/edits      | Get audit log for a receipt          |
| GET    | /api/vendors                  | List canonical vendors               |
| POST   | /api/vendors/merge            | Merge two vendor entries             |
| GET    | /api/reports/vendor           | Vendor report                        |
| GET    | /api/reports/monthly          | Monthly all-vendors report           |
| GET    | /api/reports/hostel           | Hostel institutional report          |
| GET    | /api/reports/yearly           | Yearly summary report                |
| GET    | /api/export/excel             | Download Excel workbook              |
| GET    | /api/export/pdf               | Download PDF report                  |

## Query Filters

All receipt queries and exports accept these optional params:
`vendor`, `month`, `year`, `hostel_no`, `batch_id`, `category`, `date_from`, `date_to`

## Testing

```bash
# Start server in one terminal
python main.py

# Run tests in another
python test_api.py
```

## Project Structure

```
backend/
├── main.py                  # FastAPI entry point
├── config.py                # Paths, constants
├── database/
│   ├── schema.sql           # CREATE TABLE statements
│   ├── connection.py        # SQLite connection manager (WAL mode)
│   └── init_db.py           # Schema initialization
├── models/
│   └── schemas.py           # Pydantic request/response models
├── routes/
│   ├── batches.py           # Batch CRUD
│   ├── receipts.py          # Receipt CRUD + query
│   ├── vendors.py           # Vendor list + merge
│   ├── reports.py           # Report generation
│   └── exports.py           # Excel/PDF downloads
├── services/
│   ├── receipt_service.py   # Receipt logic + audit logging
│   ├── vendor_service.py    # Fuzzy matching + normalization
│   ├── query_engine.py      # Dynamic SQL query builder
│   ├── report_engine.py     # Report aggregation
│   ├── excel_export.py      # Multi-sheet workbook (openpyxl)
│   └── pdf_export.py        # Print-ready PDF (ReportLab)
├── requirements.txt
└── test_api.py              # Integration test script
```
