import os
import pytesseract
from PIL import Image
import io
from pdf2image import convert_from_path, convert_from_bytes
import docx
import openpyxl
from typing import Tuple

class OcrService:
    @staticmethod
    def extract_text(file_path: str, mime_type: str) -> Tuple[str, str]:
        """
        Extracts plain text from the file and returns (extracted_text, detected_lang).
        Handles PDF, images, Word (docx), Excel (xlsx).
        """
        extracted_text = ""
        lang = "fra" # default French

        try:
            # ─── 1. PDF Documents ───
            if "pdf" in mime_type or file_path.lower().endswith(".pdf"):
                # Convert PDF to images
                images = convert_from_path(file_path)
                pages_text = []
                for i, img in enumerate(images):
                    text = pytesseract.image_to_string(img, lang="fra+eng")
                    pages_text.append(text)
                extracted_text = "\n--- PAGE BREAK ---\n".join(pages_text)

            # ─── 2. Images ───
            elif any(t in mime_type for t in ["image", "jpeg", "png", "tiff", "bmp", "webp"]):
                img = Image.open(file_path)
                extracted_text = pytesseract.image_to_string(img, lang="fra+eng")

            # ─── 3. Word (docx) ───
            elif "docx" in mime_type or "word" in mime_type or file_path.lower().endswith(".docx"):
                doc = docx.Document(file_path)
                full_text = []
                for para in doc.paragraphs:
                    full_text.append(para.text)
                extracted_text = "\n".join(full_text)

            # ─── 4. Excel (xlsx) ───
            elif "xlsx" in mime_type or "excel" in mime_type or "sheet" in mime_type or file_path.lower().endswith(".xlsx"):
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                sheets_text = []
                for sheet in wb.worksheets:
                    sheet_lines = []
                    for row in sheet.iter_rows(values_only=True):
                        row_str = " | ".join([str(cell) for cell in row if cell is not None])
                        if row_str.strip():
                            sheet_lines.append(row_str)
                    sheets_text.append(f"Sheet: {sheet.title}\n" + "\n".join(sheet_lines))
                extracted_text = "\n\n".join(sheets_text)

            else:
                raise ValueError(f"Unsupported mime-type: {mime_type}")

        except Exception as e:
            # Return error trace as text so backend knows why it failed
            extracted_text = f"OCR Extraction Error: {str(e)}"
            raise e

        # Simple heuristic to detect language based on common French vs English keywords
        french_score = sum(1 for word in ["le", "la", "les", "et", "de", "pour", "dans", "facture", "tva", "ttc"] if word in extracted_text.lower())
        english_score = sum(1 for word in ["the", "and", "of", "for", "in", "invoice", "vat", "tax", "total"] if word in extracted_text.lower())
        detected_lang = "fr" if french_score >= english_score else "en"

        return extracted_text.strip(), detected_lang
