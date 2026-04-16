"""OCR service — extracts structured data from receipt images.

All extraction logic ported from Rapidocrv2.py (the working, tested version).
The RapidOCR model is loaded once and reused for all subsequent calls.
"""

import re
from pathlib import Path

import cv2
import numpy as np

# Lazy-loaded globals
_engine = None
MAX_IMAGE_DIM = 2000


def _get_engine():
    """Load the RapidOCR model once (lazy singleton)."""
    global _engine
    if _engine is None:
        import sys, os, traceback
        # Ensure onnxruntime DLLs are findable in PyInstaller bundles
        if sys.platform == "win32" and getattr(sys, "frozen", False):
            meipass = getattr(sys, "_MEIPASS", "")
            ort_capi = os.path.join(meipass, "onnxruntime", "capi")
            if os.path.isdir(ort_capi):
                try:
                    os.add_dll_directory(ort_capi)
                except OSError:
                    pass
                os.environ["PATH"] = ort_capi + os.pathsep + os.environ.get("PATH", "")
        try:
            from rapidocr import RapidOCR
            _engine = RapidOCR(params={"Global.log_level": "warning"})
        except Exception:
            traceback.print_exc()
            raise
    return _engine


# =====================================================
# IMAGE → TEXT (from Rapidocrv2.py)
# =====================================================

def _resize_if_needed(img, max_dim=MAX_IMAGE_DIM):
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _extract_text_from_image(image_path: str) -> tuple[list[str], str]:
    """Run OCR on an image file. Returns (sorted_lines, full_text)."""
    engine = _get_engine()
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    img = _resize_if_needed(img)
    result = engine(img)

    if result is None or not result:
        return [], ""

    text_with_pos = []

    # Try v3 API
    if hasattr(result, "boxes") and result.boxes is not None:
        boxes = result.boxes
        txts = result.txts
        scores = result.scores
        for i, txt in enumerate(txts):
            if not txt or not txt.strip():
                continue
            y_pos = float(boxes[i][0][1]) if boxes is not None and i < len(boxes) else float(i)
            conf = float(scores[i]) if scores is not None and i < len(scores) else 0.0
            text_with_pos.append((y_pos, txt.strip(), conf))
    else:
        # Older API fallback
        try:
            for item in result:
                if item and len(item) >= 2:
                    bbox = item[0]
                    txt = item[1]
                    conf = item[2] if len(item) > 2 else 0.0
                    if not txt or not str(txt).strip():
                        continue
                    y_pos = float(bbox[0][1]) if bbox else 0.0
                    text_with_pos.append((y_pos, str(txt).strip(), float(conf)))
        except (TypeError, IndexError):
            pass

    text_with_pos.sort(key=lambda x: x[0])
    sorted_lines = [item[1] for item in text_with_pos]
    full_text = " ".join(sorted_lines)

    return sorted_lines, full_text


# =====================================================
# FIELD EXTRACTION (from Rapidocrv2.py — exact logic)
# =====================================================

def _extract_vendor_name(sorted_lines, flat):
    known = [(r"(PARKASH\s*BROTHERS)", "PARKASH BROTHERS")]
    for pattern, name in known:
        if re.search(pattern, flat, re.IGNORECASE):
            return name
    skip_headers = r"^(TAX\s*INVOICE|ORIGINAL|DUPLICATE|COPY|INVOICE|RECEIPT|STATEMENT|BILL|SAMPLE|MAKE\s*CHECK)"
    skip_content = r"(road|street|tel|email|pan\s*:|mob|phone|\+91|www|gst|railway|po\s*box|address|city|state|zip)"
    for line in sorted_lines[:15]:
        cleaned = re.sub(r"<[^>]+>", "", line).strip()
        if len(cleaned) < 3:
            continue
        if re.match(skip_headers, cleaned, re.IGNORECASE):
            continue
        if re.search(skip_content, cleaned, re.IGNORECASE):
            continue
        if re.match(r"^\d+$", cleaned) or re.match(r"^[\W]+$", cleaned):
            continue
        letter_ratio = sum(1 for c in cleaned if c.isalpha()) / max(len(cleaned), 1)
        if letter_ratio > 0.5 and len(cleaned) >= 3:
            return cleaned.upper()
    return None


def _extract_invoice_number(flat):
    patterns = [
        r"(PB\s*[-.]?\s*B\s*[-.]?\s*\d{4,6})",
        r"(?:Invoice|Inv|Receipt|Bill)\s*(?:No|Number|#|Num)\.?\s*:?\s*(\S+)",
        r"Receipt\s*Number\s*:?\s*(\d+)",
        r"Invoice\s*#\s*(\S+)",
    ]
    skip_words = {"Party", "UIN", "Date", "Place", "Reverse", "Transport",
                  "Vehicle", "Station", "N", "Dated", "PAN", "of", "the",
                  "AAWFP0117B", "Service", "Description", "Chardon"}
    for pattern in patterns:
        match = re.search(pattern, flat, re.IGNORECASE)
        if match:
            val = match.group(1).strip().rstrip(":.,")
            if re.match(r"PB", val, re.IGNORECASE):
                val = re.sub(r"[\s.]+", "", val)
                val = re.sub(r"PB(\w)(\d)", r"PB-\1-\2", val, flags=re.IGNORECASE)
                if not val.startswith("PB-"):
                    val = "PB-" + val[2:]
                return val.upper()
            if len(val) >= 3 and val not in skip_words:
                return val
    return None


def _extract_date(flat, sorted_lines=None):
    """Extract date from OCR text using multiple pattern strategies."""
    # Strategy 1: Labeled dates (Date:, Dated:, etc.)
    labeled = [
        r"(?:Dated?|Date|Statement\s*Date|Bill\s*Date|Invoice\s*Date|Dt|DT)\s*[:.]?\s*(\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{2,4})",
        r"(?:Dated?|Date)\s*[:.]?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{2,4})",
    ]
    for pattern in labeled:
        match = re.search(pattern, flat, re.IGNORECASE)
        if match:
            return re.sub(r"\s*([/.\-])\s*", r"\1", match.group(1).strip())

    # Strategy 2: Standalone date patterns (no label required)
    standalone = [
        r"(\d{1,2}/\d{1,2}/\d{4})",          # DD/MM/YYYY or MM/DD/YYYY
        r"(\d{1,2}-\d{1,2}-\d{4})",           # DD-MM-YYYY
        r"(\d{1,2}\.\d{1,2}\.\d{4})",         # DD.MM.YYYY
        r"(\d{4}-\d{2}-\d{2})",               # YYYY-MM-DD (ISO)
        r"(\d{2}/\d{2}/\d{2})\b",             # DD/MM/YY
        r"(\d{2}-\d{2}-\d{2})\b",             # DD-MM-YY
        r"(\d{2}\.\d{2}\.\d{2})\b",           # DD.MM.YY
        r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*,?\s*\d{2,4})",  # 14 Apr 2026
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\s*,?\s*\d{2,4})",  # Apr 14, 2026
    ]
    for pattern in standalone:
        match = re.search(pattern, flat, re.IGNORECASE)
        if match:
            return re.sub(r"\s*([/.\-])\s*", r"\1", match.group(1).strip())

    # Strategy 3: Search individual lines (OCR text may have noise in flat string)
    if sorted_lines:
        for line in sorted_lines:
            for pattern in standalone:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return re.sub(r"\s*([/.\-])\s*", r"\1", match.group(1).strip())

    return None



def _extract_hostel_number(flat):
    match = re.search(r"Hostel\s*No\.?\s*:?\s*(\d+)", flat, re.IGNORECASE)
    return match.group(1).strip() if match else None


def _extract_account_number(flat):
    patterns = [
        r"(?:Account|A/?c)\s*(?:No\.?|Number)\s*:?\s*([\d\s]{10,25})",
        r"(?:Account|A/?c)\s*(?:No\.?|Number)\s*:?\s*(\d{8,18})",
        r"Card/?Check\s*No\.?\s*:?\s*([\d\-]+)",
        r"Patient\s*Acct?\s*:?\s*(\d+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, flat, re.IGNORECASE)
        if match:
            acc = re.sub(r"\s+", "", match.group(1).strip())
            if len(acc) >= 4:
                return acc
    return None


def _extract_ifsc_code(flat):
    patterns = [
        r"IFS\s*Code\s*:?\s*([A-Z0-9O]{10,12})",
        r"IFSC\s*:?\s*([A-Z0-9O]{10,12})",
        r"IFS\s*Code\s*:?\s*(\S{10,12})",
    ]
    for pattern in patterns:
        match = re.search(pattern, flat, re.IGNORECASE)
        if match:
            ifsc = match.group(1).strip().upper()
            if len(ifsc) >= 11:
                prefix = ifsc[:4]
                rest = ifsc[4:].replace("O", "0")
                ifsc = prefix + rest
            return ifsc
    return None


def _parse_amount(value: str) -> float | None:
    try:
        cleaned = value.replace(",", "").strip()
        if not cleaned:
            return None
        return float(cleaned)
    except (TypeError, ValueError):
        return None


def _extract_amounts(flat, all_numbers_sorted, sorted_lines=None):
    grand_total = None
    sub_total = None
    total_tax = None

    total_patterns = [
        r"Grand\s*Total\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Amount\s*(?:Due|Paid)\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Total\s*(?:Due|Payable|Amount)?\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Balance\s*(?:Due)?\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Net\s*(?:Amount|Payable)\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
    ]
    for pattern in total_patterns:
        matches = re.findall(pattern, flat, re.IGNORECASE)
        if matches:
            for m in reversed(matches):
                val = m.replace(",", "").strip()
                try:
                    num = float(val)
                    if num > 0:
                        grand_total = num
                        break
                except ValueError:
                    continue
            if grand_total:
                break

    if grand_total is None and all_numbers_sorted:
        grand_total = all_numbers_sorted[0]

    subtotal_patterns = [
        r"Sub\s*[-]?\s*Total\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Subtotal\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
        r"Taxable\s*(?:Amt|Amount|Value)?\s*[₹$Rs.\s:]*\s*([\d,]+\.?\d{0,2})",
    ]
    for pattern in subtotal_patterns:
        matches = re.findall(pattern, flat, re.IGNORECASE)
        if matches:
            for m in reversed(matches):
                val = m.replace(",", "").strip()
                try:
                    num = float(val)
                    if num > 0:
                        sub_total = num
                        break
                except ValueError:
                    continue
            if sub_total:
                break

    if sub_total is None and grand_total and len(all_numbers_sorted) >= 2:
        for candidate in all_numbers_sorted[1:]:
            if 0.50 <= candidate / grand_total < 1.0:
                sub_total = candidate
                break

    explicit_tax_candidates: list[float] = []
    explicit_tax_patterns = [
        r"(?:total\s*gst|gst\s*total)\s*[₹$Rs.\s:=-]*([\d,]+\.?\d{0,2})",
        r"(?:total\s*tax|tax\s*total)\s*[₹$Rs.\s:=-]*([\d,]+\.?\d{0,2})",
        r"(?:tax\s*amount|vat\s*amount|sales\s*tax)\s*[₹$Rs.\s:=-]*([\d,]+\.?\d{0,2})",
    ]
    for pattern in explicit_tax_patterns:
        for m in re.findall(pattern, flat, re.IGNORECASE):
            num = _parse_amount(m)
            if num and num > 0:
                explicit_tax_candidates.append(num)

    # Sum component taxes such as CGST + SGST + IGST when present.
    component_tax_sum = 0.0
    component_tax_hits = 0
    component_tax_lines = sorted_lines or [line.strip() for line in flat.splitlines() if line.strip()]
    for line in component_tax_lines:
        if not re.search(r"\b(cgst|sgst|igst|utgst|vat|cess|service\s*tax|gst)\b", line, re.IGNORECASE):
            continue

        # Avoid using a summary line as a component line.
        if re.search(r"\b(total\s*(gst|tax)|tax\s*total)\b", line, re.IGNORECASE):
            continue

        amount_matches = re.findall(r"([\d,]+\.?\d{0,2})", line)
        if not amount_matches:
            continue

        # Pick the last numeric token (typically the tax amount after tax rate).
        candidate = _parse_amount(amount_matches[-1])
        if candidate and candidate > 0:
            component_tax_sum += candidate
            component_tax_hits += 1

    component_tax_candidate = round(component_tax_sum, 2) if component_tax_hits >= 1 else None

    computed_tax_candidate = None
    if grand_total and sub_total:
        computed = grand_total - sub_total
        if computed > 0:
            computed_tax_candidate = round(computed, 2)

    candidates: list[float] = []
    candidates.extend(explicit_tax_candidates)
    if component_tax_candidate is not None:
        candidates.append(component_tax_candidate)
    if computed_tax_candidate is not None:
        candidates.append(computed_tax_candidate)

    # Filter absurd candidates.
    if grand_total:
        max_allowed = grand_total * 0.40
        candidates = [c for c in candidates if 0 < c <= max_allowed]
    else:
        candidates = [c for c in candidates if c > 0]

    if candidates:
        # If we can compute (grand - subtotal), prefer the closest candidate.
        if computed_tax_candidate is not None:
            total_tax = min(candidates, key=lambda c: abs(c - computed_tax_candidate))
        else:
            # Otherwise prefer largest explicit-ish value (usually total GST over a single component).
            total_tax = max(candidates)

    return grand_total, sub_total, total_tax


def _extract_fields(sorted_lines: list[str], full_text: str) -> dict:
    """Extract all structured fields from OCR text. Exact logic from Rapidocrv2.py."""
    flat = re.sub(r"<[^>]+>", "", full_text)

    # Find all numbers for amount extraction
    all_numbers = []
    for match in re.finditer(r"\b(\d{1,3}(?:,\d{3})*\.\d{2})\b", flat):
        try:
            all_numbers.append(float(match.group(1).replace(",", "")))
        except ValueError:
            continue
    for match in re.finditer(r"\b(\d{1,3}(?:,\d{3})+)\b", flat):
        try:
            num = float(match.group(1).replace(",", ""))
            if num >= 100:
                all_numbers.append(num)
        except ValueError:
            continue
    for match in re.finditer(r"\$\s*([\d,]+\.?\d{0,2})", flat):
        try:
            all_numbers.append(float(match.group(1).replace(",", "")))
        except ValueError:
            continue

    all_numbers_sorted = sorted(set(all_numbers), reverse=True)
    grand_total, sub_total, total_tax = _extract_amounts(flat, all_numbers_sorted, sorted_lines)

    return {
        "vendor_name": _extract_vendor_name(sorted_lines, flat),
        "invoice_number": _extract_invoice_number(flat),
        "date": _extract_date(flat, sorted_lines),
        "hostel_number": _extract_hostel_number(flat),
        "grand_total": f"{grand_total:.2f}" if grand_total else None,
        "sub_total": f"{sub_total:.2f}" if sub_total else None,
        "total_tax": f"{total_tax:.2f}" if total_tax else "0.00",
        "account_number": _extract_account_number(flat),
        "ifsc_code": _extract_ifsc_code(flat),
        "category": _guess_category(flat),
    }


# =====================================================
# CATEGORY / GROCERY GUESSING
# =====================================================

_GROCERY_KEYWORDS = {
    "rice", "dal", "atta", "flour", "wheat", "sugar", "salt", "oil",
    "ghee", "milk", "butter", "curd", "paneer", "bread", "egg", "eggs",
    "tea", "coffee", "spice", "masala", "turmeric", "chilli", "pepper",
    "onion", "potato", "tomato", "vegetable", "fruit", "banana", "apple",
    "soap", "detergent", "shampoo", "toothpaste", "biscuit", "noodle",
    "pulse", "cereal", "grain", "lentil", "moong", "chana", "rajma",
    "besan", "maida", "suji", "poha", "dalia", "jaggery", "vinegar",
    "sauce", "ketchup", "pickle", "jam", "honey", "dry fruit",
    "almond", "cashew", "raisin", "peanut", "coconut",
    "grocery", "provision", "kirana", "general store", "supermarket",
    "ration", "food", "snack", "chips", "namkeen",
}

_STATIONERY_KEYWORDS = {
    "pen", "pencil", "notebook", "paper", "eraser", "stapler", "file",
    "folder", "register", "stationery", "copy", "marker", "highlighter",
    "glue", "tape", "scissor", "printing", "cartridge", "ink", "toner",
}

_HARDWARE_KEYWORDS = {
    "pipe", "wire", "cable", "switch", "bulb", "light", "cement",
    "paint", "brush", "bolt", "nut", "screw", "nail", "plumbing",
    "hardware", "fitting", "electrical", "sanitary", "tile",
}

_MEDICINE_KEYWORDS = {
    "tablet", "capsule", "syrup", "medicine", "pharmacy", "medical",
    "drug", "injection", "bandage", "ointment", "cream", "drops",
}


def _guess_category(flat: str) -> str | None:
    """Guess receipt category from OCR text based on keyword matching."""
    lower = flat.lower()
    scores = {
        "Grocery / Provisions": sum(1 for kw in _GROCERY_KEYWORDS if kw in lower),
        "Stationery / Office Supplies": sum(1 for kw in _STATIONERY_KEYWORDS if kw in lower),
        "Hardware / Electrical": sum(1 for kw in _HARDWARE_KEYWORDS if kw in lower),
        "Medicine / Pharmacy": sum(1 for kw in _MEDICINE_KEYWORDS if kw in lower),
    }
    best = max(scores, key=scores.get)
    if scores[best] >= 2:
        return best
    return None


# =====================================================
# PUBLIC API
# =====================================================

def process_receipt_image(image_path: str) -> dict:
    """Run OCR + field extraction on a single receipt image.

    Returns a dict with keys matching the CSV column names from Rapidocrv2.py:
    vendor_name, invoice_number, date, hostel_number,
    grand_total, sub_total, total_tax, account_number, ifsc_code
    """
    abs_path = str(Path(image_path).resolve())
    sorted_lines, full_text = _extract_text_from_image(abs_path)

    if not sorted_lines:
        return {
            "vendor_name": None, "invoice_number": None, "date": None,
            "hostel_number": None, "grand_total": None, "sub_total": None,
            "total_tax": None, "account_number": None, "ifsc_code": None,
            "category": None, "ocr_line_count": 0,
        }

    fields = _extract_fields(sorted_lines, full_text)
    fields["ocr_line_count"] = len(sorted_lines)
    return fields

