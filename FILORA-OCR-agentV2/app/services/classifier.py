import re
from typing import Dict, Any, Tuple

class Classifier:
    @staticmethod
    def classify_and_extract(text: str) -> Tuple[bool, float, Dict[str, Any]]:
        """
        Classifies whether the text is an invoice and extracts structured data.
        Returns: (is_invoice, confidence, extracted_data_dict)
        """
        text_lower = text.lower()
        
        # ─── 1. Determine if it is an Invoice (Classification) ───
        invoice_keywords = [
            "facture", "invoice", "fac-", "ttc", "tva", "hors taxe", "total ht", "net à payer",
            "due date", "date de facture", "échéance", "montant ht", "taux tva"
        ]
        
        keyword_hits = sum(1 for kw in invoice_keywords if kw in text_lower)
        is_invoice = keyword_hits >= 2 or ("facture" in text_lower or "invoice" in text_lower)
        
        # Calculate confidence based on keyword hits (up to 1.0)
        confidence = min(0.95, 0.4 + (keyword_hits * 0.1)) if is_invoice else 0.0
        
        extracted_data = {
            "invoice_number": None,
            "document_date": None,
            "due_date": None,
            "supplier_name": None,
            "supplier_address": None,
            "client_name": None,
            "line_items": [],
            "total_ht": None,
            "tva_rate": None,
            "tva": None,
            "total_ttc": None,
            "currency": "TND",
            "payment_terms": None
        }

        if not is_invoice:
            return False, 0.0, extracted_data

        # ─── 2. Structured Extraction using Regex ───

        def parse_amount(raw_value):
            if raw_value is None:
                return None
            cleaned = raw_value.replace(" ", "").replace("\u00a0", "").replace(",", ".")
            cleaned = re.sub(r"[^\d.\-]", "", cleaned)
            if cleaned.count(".") > 1:
                parts = cleaned.split(".")
                cleaned = "".join(parts[:-1]) + "." + parts[-1]
            if cleaned.endswith("."):
                cleaned = cleaned[:-1]
            if not cleaned:
                return None
            try:
                return float(cleaned)
            except ValueError:
                return None
        
        # 2.1 Invoice Number
        invoice_keywords = ["facture", "invoice", "numéro", "numero", "n°", "no", "ref", "réf", "fac"]
        for line in text.splitlines():
            line_lower = line.lower()
            if not any(keyword in line_lower for keyword in invoice_keywords):
                continue

            labeled_match = re.search(r"[:#\-°]\s*([A-Za-z0-9][A-Za-z0-9\-/]*)", line)
            if labeled_match and any(char.isdigit() for char in labeled_match.group(1)):
                extracted_data["invoice_number"] = labeled_match.group(1)
                break

            digit_candidates = re.findall(r"\b[0-9][0-9A-Za-z\-/]*\b", line)
            if digit_candidates:
                extracted_data["invoice_number"] = digit_candidates[0]
                break
                
        # 2.2 Dates (Document Date & Due Date)
        date_patterns = [
            r"(\d{2}[/\-.]\d{2}[/\-.]\d{4})",   # DD/MM/YYYY
            r"(\d{4}[/\-.]\d{2}[/\-.]\d{2})"    # YYYY-MM-DD
        ]
        found_dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                # Convert DD/MM/YYYY to YYYY-MM-DD for consistency
                try:
                    if "/" in m or "-" in m or "." in m:
                        sep = "/" if "/" in m else ("-" if "-" in m else ".")
                        parts = m.split(sep)
                        if len(parts[0]) == 4: # YYYY-MM-DD
                            found_dates.append(f"{parts[0]}-{parts[1]}-{parts[2]}")
                        else: # DD/MM/YYYY
                            found_dates.append(f"{parts[2]}-{parts[1]}-{parts[0]}")
                except Exception:
                    pass
        
        if found_dates:
            extracted_data["document_date"] = found_dates[0]
            if len(found_dates) > 1:
                extracted_data["due_date"] = found_dates[1]

        # 2.3 Currency
        currency_patterns = r"\b(TND|EUR|USD|GBP|CAD|MAD|dt|dinars?)\b"
        curr_match = re.search(currency_patterns, text, re.IGNORECASE)
        if curr_match:
            code = curr_match.group(1).upper()
            if code in ["DT", "DINAR", "DINARS"]:
                extracted_data["currency"] = "TND"
            else:
                extracted_data["currency"] = code

        # 2.4 Financial Amounts (HT, TVA, TTC)
        amount_patterns = {
            "total_ht": [
                r"(?:total\s+)?ht\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"(?:prix\s+)?ht\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"hors\s+taxe(?:s)?\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)"
            ],
            "tva": [
                r"tva\s*\d+\s*%\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"tva\s*(?!\s*\d+\s*%)\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"taxe\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)"
            ],
            "total_ttc": [
                r"(?:total\s+)?ttc\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"net\s+a\s+payer\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"montant\s+ttc\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)",
                r"total\s*[:=]?\s*([\d\s,]+(?:[\.,]\d{1,2})?)"
            ]
        }

        for field, patterns in amount_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text_lower)
                if match:
                    parsed_amount = parse_amount(match.group(1))
                    if parsed_amount is not None:
                        extracted_data[field] = parsed_amount
                        break

        # 2.5 TVA Rate
        tva_rate_match = re.search(r"tva\s*(\d+(?:[\.,]\d+)?)\s*%", text_lower)
        if not tva_rate_match:
            tva_rate_match = re.search(r"taux\s*(\d+(?:[\.,]\d+)?)\s*%", text_lower)
        if tva_rate_match:
            parsed_rate = parse_amount(tva_rate_match.group(1))
            if parsed_rate is not None:
                extracted_data["tva_rate"] = parsed_rate

        # If total_ht & tva are found but total_ttc isn't, calculate total_ttc
        if extracted_data["total_ht"] is not None and extracted_data["tva"] is not None and extracted_data["total_ttc"] is None:
            extracted_data["total_ttc"] = round(extracted_data["total_ht"] + extracted_data["tva"], 2)

        # 2.6 Supplier Name (fallback to first non-empty lines)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if lines:
            extracted_data["supplier_name"] = lines[0][:100]

        return is_invoice, confidence, extracted_data
