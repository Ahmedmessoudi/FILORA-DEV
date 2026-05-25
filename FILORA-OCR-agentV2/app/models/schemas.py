from pydantic import BaseModel
from typing import List, Optional

class LineItem(BaseModel):
    description: str
    qty: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None

class ExtractedData(BaseModel):
    invoice_number: Optional[str] = None
    document_date: Optional[str] = None
    due_date: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_address: Optional[str] = None
    client_name: Optional[str] = None
    line_items: List[LineItem] = []
    total_ht: Optional[float] = None
    tva_rate: Optional[float] = None
    tva: Optional[float] = None
    total_ttc: Optional[float] = None
    currency: Optional[str] = "TND"
    payment_terms: Optional[str] = None

class OcrResult(BaseModel):
    document_id: Optional[int] = None
    ocr_status: str = "done"
    is_invoice: bool = False
    confidence: float = 0.0
    extracted_text: str
    extracted_data: Optional[ExtractedData] = None
    search_index: str = "txt"
    language_detected: str = "fr"
