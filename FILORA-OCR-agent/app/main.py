from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import pytesseract
import logging
from app.routers import ocr

# Configure Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("filora_ocr_agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation: Verify Tesseract OCR availability
    logger.info("Initializing Filora OCR Agent...")
    try:
        tesseract_version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract OCR is available! Version: {tesseract_version}")
    except Exception as e:
        logger.critical(f"Tesseract OCR is NOT found or misconfigured: {str(e)}. "
                        "Please verify Tesseract installation on host/container system.")
    yield
    logger.info("Shutting down Filora OCR Agent...")

app = FastAPI(
    title="Filora OCR Agent",
    description="Microservice for OCR and Invoice Classification using Tesseract OCR",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. Restrict to backend/frontend in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ocr.router)

@app.get("/health")
async def health_check():
    try:
        tesseract_ver = str(pytesseract.get_tesseract_version())
        ocr_status = "healthy"
    except Exception:
        tesseract_ver = "unknown"
        ocr_status = "degraded"
        
    return {
        "status": "online",
        "ocr_engine": "Tesseract",
        "ocr_engine_status": ocr_status,
        "ocr_engine_version": tesseract_ver
    }
