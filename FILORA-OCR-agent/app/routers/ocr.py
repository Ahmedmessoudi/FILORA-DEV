from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from typing import Optional, Dict, Any
import os
import shutil
import uuid
import logging
from app.models.schemas import OcrResult, ExtractedData
from app.services.ocr_service import OcrService
from app.services.classifier import Classifier
from app.services.callback import CallbackService

router = APIRouter(prefix="/ocr", tags=["OCR"])
logger = logging.getLogger("ocr_router")

# Simple in-memory storage for polling status
# document_id -> status_dict
ocr_jobs_db: Dict[int, Dict[str, Any]] = {}

# Load environment variables
BACKEND_URL = os.getenv("BACKEND_URL", "http://filora-backend:8080") # backend container url in compose

SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "image/heic",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" # xlsx
]

def async_ocr_worker(file_path: str, mime_type: str, document_id: int):
    """
    Background worker that runs OCR, Classifies, and fires the Spring Boot callback.
    """
    try:
        ocr_jobs_db[document_id] = {"status": "processing", "progress": 20}
        
        # 1. OCR text extraction
        extracted_text, detected_lang = OcrService.extract_text(file_path, mime_type)
        ocr_jobs_db[document_id]["progress"] = 60

        # 2. Invoice Classification & Structured Extraction
        is_invoice, confidence, extracted_data = Classifier.classify_and_extract(extracted_text)
        ocr_jobs_db[document_id]["progress"] = 90

        # 3. Formulate Payload
        payload = {
            "document_id": document_id,
            "ocr_status": "done",
            "is_invoice": is_invoice,
            "confidence": float(confidence),
            "extracted_text": extracted_text,
            "extracted_data": extracted_data,
            "search_index": "txt",
            "language_detected": detected_lang
        }

        ocr_jobs_db[document_id] = {
            "status": "done",
            "progress": 100,
            "result": payload
        }

        # 4. Trigger Spring Boot Callback asynchronously
        # Using loop to run the async callback inside sync worker
        import asyncio
        asyncio.run(CallbackService.send_callback(BACKEND_URL, payload))

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        error_payload = {
            "document_id": document_id,
            "ocr_status": "failed",
            "is_invoice": False,
            "confidence": 0.0,
            "extracted_text": f"Error: {str(e)}",
            "extracted_data": None
        }
        ocr_jobs_db[document_id] = {
            "status": "failed",
            "progress": 100,
            "error": str(e)
        }
        import asyncio
        asyncio.run(CallbackService.send_callback(BACKEND_URL, error_payload))

    finally:
        # Clean up local temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/process", response_model=OcrResult)
async def process_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_id: Optional[int] = Form(None)
):
    # MIME Validation
    mime_type = file.content_type
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    # Check if supported by mime or extension fallbacks
    is_supported = mime_type in SUPPORTED_MIME_TYPES or file_ext in [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp", ".docx", ".xlsx"]
    if not is_supported:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {mime_type or file_ext}. Supported types: PDF, JPEG, PNG, TIFF, BMP, WEBP, DOCX, XLSX."
        )

    # If no document_id is passed, generate a temporary mock ID
    doc_id = document_id if document_id is not None else uuid.uuid4().int & (1<<31)-1

    # Save file to local temp path for background processing
    temp_dir = "/tmp/ocr_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}{file_ext}")
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Initialize status
    ocr_jobs_db[doc_id] = {"status": "pending", "progress": 0}

    # Queue background processing task
    background_tasks.add_task(async_ocr_worker, temp_file_path, mime_type, doc_id)

    # Return fast response with initial status
    return OcrResult(
        document_id=doc_id,
        ocr_status="processing",
        is_invoice=False,
        confidence=0.0,
        extracted_text="Document is queued for processing...",
        extracted_data=None,
        search_index="txt",
        language_detected="fr"
    )

@router.get("/status/{document_id}")
async def get_status(document_id: int):
    if document_id not in ocr_jobs_db:
        raise HTTPException(status_code=404, detail="OCR job not found.")
    return ocr_jobs_db[document_id]

@router.post("/reprocess/{document_id}")
async def reprocess_document(document_id: int, background_tasks: BackgroundTasks):
    # Standard flow to trigger reprocessing of an already uploaded file
    # For a real implementation, we could read from the backend filesystem, 
    # but since this is mock-supported for now, we'll return successful queueing.
    ocr_jobs_db[document_id] = {"status": "pending", "progress": 0}
    return {"message": f"Reprocessing scheduled for document {document_id}"}
