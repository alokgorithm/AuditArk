export interface Receipt {
  id: number;
  batch_id: number;
  vendor: string | null;
  normalized_vendor: string | null;
  date: string | null;
  invoice_no: string | null;
  amount: number | null;
  tax: number | null;
  total: number | null;
  category: string | null;
  hostel_no: number | null;
  account_no: string | null;
  ifsc: string | null;
  remarks: string | null;
  confidence: number | null;
  image_path: string | null;
  image_hash: string | null;
  status: 'pending' | 'processing' | 'extracted' | 'reviewed' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface QueryResponse {
  count: number;
  receipts: Receipt[];
}

export interface Batch {
  id: number;
  name: string;
  source_folder: string;
  created_at?: string;
  receipt_count?: number; 
}

export interface Vendor {
  id: number;
  name: string;
  normalized_name: string;
  canonical_name?: string;
  aliases?: string | null;
  account_no?: string | null;
  ifsc?: string | null;
  bank_name?: string | null;
  default_amount?: number | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VendorEntry {
  date: string;
  invoice_no: string;
  hostel_no: number;
  amount: number;
  tax: number;
  total: number;
}

export interface VendorMonthlySummary {
  month: string;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  entries: number;
}

export interface VendorReportResponse {
  vendor: string;
  all_entries: VendorEntry[];
  monthly_summary: VendorMonthlySummary[];
  final_summary: {
    total_amount: number;
    total_tax: number;
    grand_total: number;
    total_entries: number;
  };
}

export interface MonthlyVendorSummary {
  vendor: string;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  count: number;
}

export interface MonthlyReportResponse {
  month: number;
  year: number;
  vendors: MonthlyVendorSummary[];
  grand_total: number;
  total_entries: number;
}

export interface HostelReportRow {
  sr: number;
  vendor_name: string;
  account_no: string;
  ifsc: string;
  amount: number;
  remarks: string;
}

export interface HostelReportResponse {
  hostel_no: number;
  month: number;
  year: number;
  rows: HostelReportRow[];
  grand_total: number;
}

export interface YearlyVendorSummary {
  vendor: string;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  count: number;
}

export interface YearlyCategorySummary {
  category: string;
  total: number;
  count: number;
}

export interface YearlyMonthlyTrend {
  month: number;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  entries: number;
}

export interface YearlyReportResponse {
  year: number;
  vendor_summary: YearlyVendorSummary[];
  category_summary: YearlyCategorySummary[];
  monthly_trend: YearlyMonthlyTrend[];
  grand_total: number;
  total_entries: number;
}

export interface EditAuditRecord {
  id: number;
  receipt_id: number;
  batch_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
}
