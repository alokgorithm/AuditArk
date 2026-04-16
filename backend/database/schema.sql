-- Receipt Processor Pro - Database Schema
-- SQLite with WAL mode

CREATE TABLE IF NOT EXISTS batches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    source_folder   TEXT,
    receipt_count   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    canonical_name  TEXT,
    aliases         TEXT,            -- JSON array of known aliases (legacy compatibility)
    account_no      TEXT,
    ifsc            TEXT,
    bank_name       TEXT,
    default_amount  REAL DEFAULT 0,
    remarks         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_normalized ON vendors(normalized_name);

CREATE TABLE IF NOT EXISTS receipts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id        INTEGER NOT NULL REFERENCES batches(id),
    vendor          TEXT,
    normalized_vendor TEXT,
    date            TEXT,            -- ISO format YYYY-MM-DD
    invoice_no      TEXT,
    amount          REAL,            -- subtotal before tax
    tax             REAL,            -- total tax/GST
    total           REAL,            -- grand total
    category        TEXT,
    hostel_no       INTEGER,
    account_no      TEXT,
    ifsc            TEXT,
    remarks         TEXT,
    confidence      REAL,
    image_path      TEXT,
    image_hash      TEXT,            -- SHA256 hash for duplicate detection
    status          TEXT DEFAULT 'extracted', -- pending, processing, extracted, reviewed, locked
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON receipts(normalized_vendor);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_hostel ON receipts(hostel_no);
CREATE INDEX IF NOT EXISTS idx_receipts_batch ON receipts(batch_id);
CREATE INDEX IF NOT EXISTS idx_receipts_hash ON receipts(image_hash);

CREATE TABLE IF NOT EXISTS receipt_edits (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id      INTEGER NOT NULL REFERENCES receipts(id),
    batch_id        INTEGER,
    field_name      TEXT NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    edited_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staging_receipts (
    id              INTEGER PRIMARY KEY,
    batch_id        INTEGER,
    vendor          TEXT,
    date            TEXT,
    invoice_no      TEXT,
    amount          REAL,
    tax             REAL,
    total           REAL,
    hostel_no       INTEGER,
    account_no      TEXT,
    ifsc            TEXT,
    remarks         TEXT,
    status          TEXT DEFAULT 'pending',
    image_path      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staging_batch ON staging_receipts(batch_id);
