from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from app.routers import ocr

# Configure Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("filora_ocr_agent_v2")

# Global InferenceManager singleton reference
inference_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global inference_manager
    logger.info("Initializing Filora OCR Agent V2...")
    ocr_method = os.getenv("OCR_METHOD", "hf").lower()
    logger.info(f"Using OCR engine method: {ocr_method}")
    try:
        from chandra.model import InferenceManager
        
        if ocr_method == "vllm":
            vllm_base = os.getenv("VLLM_API_BASE", "http://localhost:8000/v1")
            vllm_model = os.getenv("VLLM_MODEL_NAME", "datalab-to/chandra")
            logger.info(f"Connecting to vLLM server at {vllm_base} (Model: {vllm_model})")
        
        # Initialize InferenceManager
        inference_manager = InferenceManager(method=ocr_method)
        logger.info("Chandra OCR InferenceManager initialized successfully!")
    except Exception as e:
        logger.critical(f"Chandra OCR initialization failed: {str(e)}. "
                        "Please check requirements and environment configuration.")
    yield
    logger.info("Shutting down Filora OCR Agent V2...")

app = FastAPI(
    title="Filora OCR Agent V2",
    description="Microservice for OCR and Invoice Classification using Chandra OCR 2",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ocr.router)

@app.get("/health")
async def health_check():
    ocr_method = os.getenv("OCR_METHOD", "hf").lower()
    ocr_status = "healthy" if inference_manager is not None else "degraded"
    return {
        "status": "online",
        "ocr_engine": "Chandra OCR V2",
        "ocr_method": ocr_method,
        "ocr_engine_status": ocr_status
    }
