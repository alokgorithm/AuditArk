# AuditArk

AuditArk is an offline financial ledger desktop application for receipt ingestion, OCR-assisted extraction, review, normalization, reporting, and export.

The application is designed to run locally end to end:

- local UI (React + Tauri)
- local API server (FastAPI)
- local data storage (SQLite)
- local OCR inference (RapidOCR + ONNX Runtime)

## Status

Current app version is `2.1.0`.

This line of releases should be treated as pre-production and validation-focused. Use in controlled environments until your team completes final QA and acceptance criteria.

## Product Objective

Convert bulk receipt images into a structured, auditable, queryable financial dataset that supports:

- receipt-level review and correction
- canonical vendor management
- batch and date based filtering
- institutional/monthly/yearly reporting
- Excel and PDF exports

## Core Capabilities

- Offline-first processing (no cloud OCR dependency)
- Staging drafts with image persistence by batch
- OCR extraction and retry for failed records
- Receipt edit audit trail (`receipt_edits`)
- Vendor normalization and merge workflow
- Flexible query engine for list views and reports
- Export endpoints for spreadsheet and print-ready PDF

## Technology Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Desktop shell: Tauri 2 (Rust)
- Backend: Python, FastAPI, Uvicorn
- Database: SQLite (WAL mode)
- OCR: RapidOCR, ONNX Runtime, OpenCV, NumPy, Pillow
- Reporting/export: openpyxl, ReportLab
- Build: Bun, PyInstaller, Tauri bundler (NSIS target)

## High-Level Architecture

```text
Tauri Desktop App (React UI)
        |
        | Local HTTP (localhost:8741)
        v
FastAPI Backend (Python sidecar)
        |
        +--> OCR/Parsing Services (RapidOCR + rules)
        +--> Query/Reporting/Export Services
        |
        v
SQLite Database (batches, staging_receipts, receipts, vendors, receipt_edits)
        |
        v
Generated artifacts (Excel/PDF exports, saved receipt images)
```

## Runtime Workflow

1. User launches the desktop app.
2. Tauri loads frontend assets and connects to local backend API.
3. Backend initializes schema (`init_db`) and serves API under `/api/*`.
4. User uploads receipts to staging.
5. Draft data and images are stored in `staging_receipts` and data staging directory.
6. User confirms/pushes staged data into `receipts` for persistent ledger records.
7. OCR extraction populates vendor/date/invoice/amount/tax/total and account fields.
8. User reviews and edits receipt records; every change is logged in `receipt_edits`.
9. Vendor normalization and report queries run against canonicalized data.
10. User exports filtered data to Excel or report PDFs.

## Detailed Functional Workflows

### 1) Batch and Staging Flow

- Batch is created/listed via `routes/batches.py`.
- Draft payloads are saved with `/api/staging/{batch_id}/save`.
- Draft retrieval is served by `/api/staging/{batch_id}/drafts`.
- Draft cleanup is done via delete staging endpoints.

Result: users can save partial progress and resume safely.

### 2) OCR and Receipt Ingestion Flow

- OCR routes process image files and parse key fields.
- Parsed rows are inserted into `receipts` with status markers (`pending`, `extracted`, `reviewed`, `locked`).
- Failed OCR records can be retried with `/api/receipts/retry-ocr`.

Result: ingestion remains resilient under mixed-quality image sets.

### 3) Review and Edit Audit Flow

- Receipt list and filters are served by `/api/receipts`.
- Single record view/update is handled by `/api/receipts/{id}`.
- Every meaningful field change is persisted in `receipt_edits` and exposed at `/api/receipts/{id}/edits`.

Result: traceable corrections and compliance-friendly history.

### 4) Vendor Normalization Flow

- Vendor data is managed via vendor routes/services.
- Normalized vendor names support cleaner aggregation and report accuracy.
- Merge operations consolidate duplicates/aliases.

Result: consistent vendor-wise reporting despite OCR variants.

### 5) Reporting and Export Flow

- Reports:
  - `/api/reports/vendor`
  - `/api/reports/monthly`
  - `/api/reports/hostel`
  - `/api/reports/yearly`
- Exports:
  - `/api/export/excel`
  - `/api/export/pdf`

Result: operational reporting and shareable outputs from filtered ledger data.

## Data Model (Current Schema)

Primary tables:

- `batches`: batch metadata and counters
- `staging_receipts`: draft/import staging rows
- `receipts`: canonical transaction ledger rows
- `vendors`: vendor identities, normalized names, defaults
- `receipt_edits`: immutable audit log of user edits

Key `receipts` fields include:

- identity: `id`, `batch_id`
- vendor fields: `vendor`, `normalized_vendor`
- invoice/date fields: `invoice_no`, `date`
- amounts: `amount`, `tax`, `total`
- institutional tags: `hostel_no`, `category`
- payment tags: `account_no`, `ifsc`
- lifecycle: `status`, `confidence`, `remarks`
- image and integrity: `image_path`, `image_hash`
- timestamps: `created_at`, `updated_at`

## Backend Module Map

Entry and wiring:

- `backend/main.py`: app init, startup, CORS, route registration, static mount
- `backend/database/init_db.py`: schema bootstrap
- `backend/database/connection.py`: SQLite connection handling

Routes:

- `backend/routes/batches.py`
- `backend/routes/staging.py`
- `backend/routes/ocr.py`
- `backend/routes/receipts.py`
- `backend/routes/vendors.py`
- `backend/routes/reports.py`
- `backend/routes/exports.py`

Services:

- `backend/services/ocr_service.py`
- `backend/services/receipt_service.py`
- `backend/services/vendor_service.py`
- `backend/services/query_engine.py`
- `backend/services/report_engine.py`
- `backend/services/excel_export.py`
- `backend/services/pdf_export.py`
- `backend/services/pdf_file_export.py`
- `backend/services/upload_service.py`

## Frontend Module Map

Primary pages:

- `Dashboard`
- `StagingUpload`
- `BatchManager`
- `ReceiptBrowser`
- `ReceiptDetail`
- `Reports`
- `Exports`
- `VendorManager` / `VendorPage`

Primary frontend responsibilities:

- file upload and staging UI
- tabular receipt review and inline edits
- filtering, selection, and status operations
- report/export triggering
- vendor management UI flows

## API Overview

Health:

- `GET /api/health`

Batches:

- `GET /api/batches`
- `POST /api/batches`

Staging:

- `POST /api/staging/{batch_id}/save`
- `GET /api/staging/{batch_id}/drafts`
- `DELETE /api/staging/{batch_id}/drafts`

Receipts:

- `GET /api/receipts`
- `GET /api/receipts/{id}`
- `PUT /api/receipts/{id}`
- `PATCH /api/receipts/{id}/status`
- `GET /api/receipts/{id}/edits`
- `DELETE /api/receipts/{id}`
- `POST /api/receipts/bulk-delete`
- `POST /api/receipts/retry-ocr`

Vendors:

- vendor list/merge and management endpoints under `/api/vendors`

Reports:

- `GET /api/reports/vendor`
- `GET /api/reports/monthly`
- `GET /api/reports/hostel`
- `GET /api/reports/yearly`

Exports:

- `GET /api/export/excel`
- `GET /api/export/pdf`
- `POST /api/export/pdf`

## Development Setup

Prerequisites:

- Python 3.10+
- Bun
- Rust toolchain
- Windows build prerequisites for Tauri/NSIS

Install backend deps:

```bash
cd backend
pip install -r requirements.txt
```

Install frontend deps:

```bash
cd frontend
bun install
```

Run backend only:

```bash
cd backend
python main.py
```

Run frontend dev server only:

```bash
cd frontend
bun run dev
```

Run full desktop app in development mode (Tauri + frontend):

```bash
cd frontend
bun run tauri dev
```

## Build and Packaging

One-command build from repository root:

```powershell
./build_app.ps1
```

Build pipeline:

1. Build Python backend sidecar with PyInstaller (`backend/dist/backend/backend.exe`).
2. Build frontend assets with Vite.
3. Bundle desktop app with Tauri (NSIS target).

Installer output path:

```text
frontend/src-tauri/target/release/bundle/nsis/
```

## Deployed Runtime Notes

- Tauri bundle resources include the built backend sidecar from `backend/dist/backend`.
- Backend serves local HTTP on configured host/port (`config.py`, default `localhost:8741`).
- User data is stored in app-local directories (database, staging images, exports).

## Repository Structure

```text
backend/                  FastAPI API, services, schema, packaging scripts
frontend/                 React application and Tauri host project
build_app.ps1             Root build orchestrator (backend + frontend + bundle)
prd_utf8.txt              Product requirements source document
```

## License

Proprietary / Closed Source.
