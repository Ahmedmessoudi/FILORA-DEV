# Implementation Plan — FILORA-OCR-agentV2 with Chandra OCR 2

This plan details the addition of the new microservice `FILORA-OCR-agentV2` implemented with **Chandra OCR 2** (`chandra-ocr`) instead of Tesseract. The service preserves the exact same FastAPI routers, schemas, invoice classification, and callback systems as the original `FILORA-OCR-agent` to ensure drop-in compatibility.

It will reside in the [FILORA-OCR-agentV2](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2) directory and include its own `docker-compose.yml` for isolated testing.

---

## User Review Required

> [!IMPORTANT]
> **Chandra OCR Resource Requirements**: 
> - **Local Inference (HuggingFace)**: Running Chandra OCR locally via HuggingFace (`method="hf"`) will download model weights from HuggingFace Hub (several gigabytes) and runs best on a GPU with at least 16GB VRAM. It can run on a CPU, but processing times will be slow.
> - **Remote/Production Inference (vLLM)**: Using `method="vllm"` connects to a separate running vLLM server. 
> We have made the method highly configurable via `OCR_METHOD` and connection endpoints via `VLLM_API_BASE`.

> [!WARNING]
> **Port Mapping**:
> To prevent conflicts with the original `FILORA-OCR-agent` running on port `8000`, the new V2 agent will expose port **`8001`** in its standalone `docker-compose.yml`.

---

## Open Questions

> [!NOTE]
> There are no blocking open questions. We will use `OCR_METHOD=hf` as the default fallback, but provide configuration parameters for `vllm` compatibility.

---

## Proposed Changes

### [Component] FILORA-OCR-agentV2 Infrastructure

Set up dependencies and container configuration.

#### [NEW] [requirements.txt](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/requirements.txt)
- FastAPI, Uvicorn, and standard packages.
- Replace `pytesseract` with `chandra-ocr`.
- Include `pdf2image`, `python-docx`, `openpyxl`, `httpx`, `python-magic`, `pydantic`, `pydantic-settings`.

#### [NEW] [Dockerfile](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/Dockerfile)
- Python 3.11-slim base image.
- Installs `poppler-utils` (needed by `pdf2image` for PDF processing), `libmagic1`, and building tools.
- Installs Python dependencies without Tesseract OCR packages (as Chandra OCR replaces it).
- Copies app folder and sets entrypoint to port `8000` inside the container.

#### [NEW] [docker-compose.yml](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/docker-compose.yml)
- Define a standalone service `filora-ocr-agent-v2` mapping port `8001:8000`.
- Environment variables:
  - `OCR_METHOD`: `"hf"` or `"vllm"`
  - `VLLM_API_BASE`: `"http://host.docker.internal:8000/v1"` (to easily connect to a local vLLM server if run outside Docker)
  - `VLLM_MODEL_NAME`: `"datalab-to/chandra"`
  - `BACKEND_URL`: URL of the main Spring Boot app for callbacks.

---

### [Component] App Initialization & Schemas

#### [NEW] [main.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/main.py)
- FastAPI instance, CORS middleware, and health check router.
- Startup lifespan function: Imports `InferenceManager` from `chandra.model` and pre-instantiates it as a singleton. This downloads model weights at startup if using HuggingFace mode, ensuring the container is ready before serving requests.
- Custom `/health` check returning status and engine details:
  ```json
  {
      "status": "online",
      "ocr_engine": "Chandra OCR V2",
      "ocr_method": "hf",
      "ocr_engine_status": "healthy"
  }
  ```

#### [NEW] [schemas.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/models/schemas.py)
- Identical Pydantic models: `LineItem`, `ExtractedData`, and `OcrResult` to preserve API compatibility.

---

### [Component] API Routers & Services

#### [NEW] [ocr.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/routers/ocr.py)
- FastAPI router handling `POST /ocr/process`, `GET /ocr/status/{document_id}`, and `POST /ocr/reprocess/{document_id}`.
- Handles file validation, saves uploaded files to `/tmp/ocr_uploads` directory, queues background tasks, and manages jobs status.

#### [NEW] [ocr_service.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/services/ocr_service.py)
- Performs document processing using the Chandra OCR singleton:
  - **Images**: Reads the image, wraps it in `BatchInputItem(image=img, prompt_type="ocr_layout")`, and generates markdown text.
  - **PDFs**: Converts the pages to PIL images via `pdf2image`, batches them together as `BatchInputItem` items, and generates text in a single batch inference call for performance.
  - **DOCX / XLSX**: Extracts text using `python-docx` and `openpyxl` (same logic as V1).
- Includes language detection heuristic (French vs English).

#### [NEW] [classifier.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/services/classifier.py)
- Invoice classification and metadata regex parsing (same logic as V1).

#### [NEW] [callback.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agentV2/app/services/callback.py)
- Asynchronous callback delivery with retry logic and exponential backoff to notify the main backend (same logic as V1).

---

## Verification Plan

### Automated Tests
- Run Python linting and verify module imports in the environment:
  ```bash
  python -m py_compile app/main.py
  ```

### Manual Verification
- Spin up the V2 container:
  ```bash
  cd FILORA-OCR-agentV2
  docker compose up --build
  ```
- Send a request to the health endpoint:
  ```bash
  curl http://localhost:8001/health
  ```
- Upload an image file or PDF to test the OCR processing queue:
  ```bash
  curl -X POST "http://localhost:8001/ocr/process" -F "file=@/path/to/invoice.pdf"
  ```
