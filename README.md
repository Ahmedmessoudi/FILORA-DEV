<p align="center">
  <strong> FILORA — Document Management System</strong>
</p>

<p align="center">
  <em>A multi-service DMS with OCR-powered invoice detection, built with Angular · Spring Boot · FastAPI · PostgreSQL</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21-red?logo=angular" alt="Angular 21" />
  <img src="https://img.shields.io/badge/Spring_Boot-3-green?logo=springboot" alt="Spring Boot 3" />
  <img src="https://img.shields.io/badge/FastAPI-latest-teal?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker" alt="Docker Compose" />
</p>

---

## 📖 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Prerequisites](#-prerequisites)
- [Quick Start — Run with Docker Compose](#-quick-start--run-with-docker-compose)
- [Accessing the Application](#-accessing-the-application)
- [Accessing Filora OCR Service — Swagger Docs](#-accessing-filora-ocr-service--swagger-docs)
- [Environment Configuration (.env)](#-environment-configuration-env)
- [Services Breakdown](#-services-breakdown)
- [Default Credentials](#-default-credentials)
- [Useful Docker Commands](#-useful-docker-commands)
- [Project Structure](#-project-structure)
- [API Reference (Backend)](#-api-reference-backend)
- [Troubleshooting](#-troubleshooting)

---

## 🏗 Architecture Overview

Filora is composed of **4 Dockerised services** orchestrated via `docker-compose.yml`:

```
┌──────────────────────────────────────────────────────────────┐
│                      Docker Network (filora-net)             │
│                                                              │
│  ┌─────────────────┐      ┌───────────────── ┐               │
│  │  filora-frontend │     │  filora-backend  │               │
│  │  (Angular/Nginx) │───▶│  (Spring Boot)   │               │
│  │   Port: 4200     │     │   Port: 8080     │               │
│  └─────────────────┘      └───────┬──────────┘               │
│                                   │                          │
│                      ┌────────────┼────────────┐             │
│                      ▼                          ▼            │
│          ┌─────────────────┐     ┌──────────────────┐        │
│          │    filora-db    │     │ filora-ocr-agent │        │
│          │  (PostgreSQL 16)│     │    (FastAPI)     │        │
│          │   Port: 5432    │     │   Port: 8000     │        │
│          └─────────────────┘     └──────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

| Service             | Technology              | Role                                                       |
|---------------------|-------------------------|-------------------------------------------------------------|
| `filora-frontend`   | Angular 21 + Nginx      | SPA — all UI/UX                                             |
| `filora-backend`    | Spring Boot 3 (Java 17) | REST API, business logic, auth, SMTP, file management       |
| `filora-db`         | PostgreSQL 16 (Alpine)  | Persistent relational storage                               |
| `filora-ocr-agent`  | FastAPI + Tesseract OCR  | OCR pipeline, invoice classification, data extraction       |

---

## ✅ Prerequisites

Before you begin, make sure you have:

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** installed and running (includes Docker Compose)
- **Minimum 4 GB RAM** allocated to Docker
- **Ports available:** `4200`, `8080`, `8000`, `5432` (ensure they are not already in use)

---

## 🚀 Quick Start — Run with Docker Compose

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd FILORA
```

### 2. Review / customize the environment file

The project ships with a pre-configured `.env` file at the project root. Review it and update values if needed (see the [Environment Configuration](#-environment-configuration-env) section below).

### 3. Build and start all services

```bash
docker-compose up -d --build
```

This command will:
- 📦 **Build** Docker images for the frontend, backend, and OCR agent from their respective `Dockerfile`s
- 🗄️ **Pull** the `postgres:16-alpine` image for the database
- 🌐 **Create** a shared Docker bridge network (`filora-net`)
- ▶️ **Start** all 4 containers in detached mode (`-d`)

> **First build** may take several minutes (Maven dependency downloads, npm install, Tesseract OCR installation). Subsequent builds are much faster due to Docker layer caching.

### 4. Verify all containers are running

```bash
docker-compose ps
```

Expected output:

| Name                 | Status               | Port Mapping          |
|----------------------|----------------------|-----------------------|
| `filora-db`          | Up (healthy)         | `0.0.0.0:5432→5432`  |
| `filora-backend`     | Up                   | `0.0.0.0:8080→8080`  |
| `filora-ocr-agent`   | Up                   | `0.0.0.0:8000→8000`  |
| `filora-frontend`    | Up                   | `0.0.0.0:4200→80`    |

### 5. Check logs (optional)

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f filora-backend
docker-compose logs -f filora-ocr-agent
```

---

## 🌐 Accessing the Application

Once all containers are running, open your browser:

| What                        | URL                                                        | Description                              |
|-----------------------------|------------------------------------------------------------|------------------------------------------|
| **🖥 Filora App (Frontend)** | [http://localhost:4200](http://localhost:4200)               | Main web application (Angular SPA)       |
| **⚙️ Backend API**           | [http://localhost:8080/api](http://localhost:8080/api)       | Spring Boot REST API                     |
| **🔍 OCR Service — Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs)     | FastAPI interactive API documentation    |
| **🔍 OCR Service — ReDoc**   | [http://localhost:8000/redoc](http://localhost:8000/redoc)   | Alternative API docs (read-only format)  |
| **❤️ OCR Health Check**      | [http://localhost:8000/health](http://localhost:8000/health) | OCR service health status (JSON)         |

> **Note:** The frontend Nginx proxy automatically forwards all `/api/*` requests to the backend (`filora-backend:8080`), so from the browser you only need to interact with `localhost:4200`.

---

## 🔍 Accessing Filora OCR Service — Swagger Docs

The OCR Agent is a **FastAPI** application that automatically generates interactive API documentation.

### 📘 Swagger UI (Interactive)

Navigate to: **[http://localhost:8000/docs](http://localhost:8000/docs)**

From the Swagger UI you can:
- **Try out** any endpoint directly in the browser
- **Upload files** for OCR processing via the `/ocr/process` endpoint
- **Check processing status** via `/ocr/status/{document_id}`
- **Trigger reprocessing** via `/ocr/reprocess/{document_id}`

### OCR API Endpoints

| Method | Endpoint                      | Description                                                   |
|--------|-------------------------------|---------------------------------------------------------------|
| `POST` | `/ocr/process`                | Upload a file for OCR processing. Accepts `multipart/form-data` with `file` (required) and `document_id` (optional). |
| `GET`  | `/ocr/status/{document_id}`   | Poll the processing status and progress of an OCR job.        |
| `POST` | `/ocr/reprocess/{document_id}`| Re-trigger OCR on an existing document.                       |
| `GET`  | `/health`                     | Health check — returns Tesseract OCR engine status and version.|

### Supported File Types for OCR

| Format   | MIME Type                                                                    |
|----------|------------------------------------------------------------------------------|
| PDF      | `application/pdf`                                                            |
| JPEG     | `image/jpeg`                                                                 |
| PNG      | `image/png`                                                                  |
| TIFF     | `image/tiff`                                                                 |
| BMP      | `image/bmp`                                                                  |
| WebP     | `image/webp`                                                                 |
| HEIC     | `image/heic`                                                                 |
| DOCX     | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`     |
| XLSX     | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`           |

### Example: Process a document via cURL

```bash
curl -X POST http://localhost:8000/ocr/process \
  -F "file=@/path/to/invoice.pdf" \
  -F "document_id=42"
```

### Example Response (OcrResult)

```json
{
  "document_id": 42,
  "ocr_status": "processing",
  "is_invoice": false,
  "confidence": 0.0,
  "extracted_text": "Document is queued for processing...",
  "extracted_data": null,
  "search_index": "txt",
  "language_detected": "fr"
}
```

After processing completes, poll `/ocr/status/42` for the final result:

```json
{
  "status": "done",
  "progress": 100,
  "result": {
    "document_id": 42,
    "ocr_status": "done",
    "is_invoice": true,
    "confidence": 0.94,
    "extracted_text": "FACTURE N° FAC-2024-00123 ...",
    "extracted_data": {
      "invoice_number": "FAC-2024-00123",
      "document_date": "2024-03-15",
      "due_date": "2024-04-15",
      "total_ht": 200.00,
      "tva_rate": 19.0,
      "tva": 38.00,
      "total_ttc": 238.00,
      "currency": "TND"
    },
    "search_index": "txt",
    "language_detected": "fr"
  }
}
```

---

## 🔐 Environment Configuration (.env)

All configuration lives in the **`.env`** file at the project root. This is the **single source of truth** — no values are hardcoded in the application code.

### Full Variable Reference

#### System

| Variable                      | Default Value           | Description                                      |
|-------------------------------|-------------------------|--------------------------------------------------|
| `SYSTEM_ENABLED`              | `True`                  | Global system kill switch                        |
| `SYSTEM_NAME`                 | `FiloraDEV`             | Environment/instance name                        |
| `SYSTEM_MAX_USERS`            | `12`                    | Maximum number of user accounts                  |
| `SYSTEM_MAX_ENTITIES`         | `4`                     | Maximum number of entities (companies)           |
| `SYSTEM_MAX_EXTERNAL_ENTITIES`| `4`                     | Maximum external entities                        |
| `SYSTEM_MAX_FILE_SIZE`        | `1024`                  | Maximum upload file size (in KB)                 |
| `SYSTEM_LOGS_PATH`            | `/app/logs`             | Container path for log files                     |
| `ENTITIES_DATA_PATH`          | `/app/dms-data/upload`  | Container path for uploaded document storage     |

#### Database (PostgreSQL)

| Variable             | Default Value           | Description                    |
|----------------------|-------------------------|--------------------------------|
| `SYSTEM_DB_HOST`     | `filora-db`             | Database host (Docker service) |
| `SYSTEM_DB_PORT`     | `5432`                  | Database port                  |
| `SYSTEM_DB_NAME`     | `filora_db`             | Database name                  |
| `SYSTEM_DB_USERNAME` | `filora`                | Database username              |
| `SYSTEM_DB_PASSWORD` | `filora_secret_2026`    | Database password              |

#### Authentication & Security

| Variable              | Default Value                                              | Description                              |
|-----------------------|------------------------------------------------------------|------------------------------------------|
| `JWT_SECRET`          | `c29tZVN1cGV...` (base64)                                 | JWT signing secret (≥256-bit)            |
| `JWT_EXPIRY_MINUTES`  | `60`                                                       | JWT token expiry duration                |
| `TWO_FACTOR_ENABLED`  | `True`                                                     | Enable 2FA on login                      |
| `TWO_FACTOR_METHOD`   | `EMAIL`                                                    | 2FA method: `EMAIL` or `TOTP`           |

#### SMTP (Email)

| Variable        | Default Value               | Description                  |
|-----------------|------------------------------|------------------------------|
| `SMTP_HOST`     | `smtp.gmail.com`             | SMTP server hostname         |
| `SMTP_PORT`     | `587`                        | SMTP server port (TLS)       |
| `SMTP_EMAIL`    | *(configured in .env)*       | Sender email address         |
| `SMTP_PASSWORD` | *(configured in .env)*       | SMTP app password            |

#### OCR Agent

| Variable                   | Default Value                      | Description                       |
|----------------------------|------------------------------------|-----------------------------------|
| `OCR_SERVICE_URL`          | `http://filora-ocr-agent:8000`     | Internal URL for OCR service      |
| `OCR_CONFIDENCE_THRESHOLD` | `0.75`                             | Minimum confidence for classification |

#### Internationalisation & Currency

| Variable              | Default Value | Description                              |
|-----------------------|---------------|------------------------------------------|
| `SUPPORTED_LANGUAGES` | `fr,en`       | Supported languages (comma-separated)    |
| `DEFAULT_LANGUAGE`    | `fr`          | Default UI language                      |
| `CURRENCY`            | `TND`         | System-wide currency (ISO 4217)          |

#### Frontend

| Variable       | Default Value            | Description                      |
|----------------|--------------------------|----------------------------------|
| `FRONTEND_URL` | `http://localhost:4200`  | Frontend URL (used for CORS)     |

> ⚠️ **Important:** If you change database-related variables (`SYSTEM_DB_*`), the containers will need a full restart. For non-DB variables, changes can be applied via the **Settings** page in the UI (superuser only).

---

## 🧩 Services Breakdown

### 1. `filora-db` — PostgreSQL Database

- **Image:** `postgres:16-alpine`
- **Port:** `5432`
- **Health check:** `pg_isready` (the backend waits for DB to be healthy before starting)
- **Data persistence:** Named volume `pgdata` → data survives container restarts
- **Schema:** Managed via Flyway migrations in the Spring Boot backend

### 2. `filora-backend` — Spring Boot REST API

- **Build:** Multi-stage Dockerfile (Maven build → JRE runtime)
- **Port:** `8080`
- **Depends on:** `filora-db` (healthy)
- **Volumes:**
  - `./dms-data/upload` → `/app/dms-data/upload` (document file storage)
  - `./logs` → `/app/logs` (application logs)
- **Key features:** JWT auth, 2FA, role-based access (superuser/admin/user), SMTP email, file management, OCR integration

### 3. `filora-ocr-agent` — FastAPI OCR Service

- **Build:** Python 3.11 slim + Tesseract OCR (French + English language packs)
- **Port:** `8000`
- **Volumes:** `./dms-data/upload` → `/app/dms-data/upload` (shared file access with backend)
- **Key features:** OCR text extraction, invoice classification, structured data extraction, callback to backend
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. `filora-frontend` — Angular SPA

- **Build:** Multi-stage Dockerfile (Node 22 build → Nginx serve)
- **Port:** `4200` → maps to Nginx on port `80` inside the container
- **Depends on:** `filora-backend`
- **Nginx features:**
  - SPA fallback (all routes → `index.html`)
  - API proxy (`/api/*` → `filora-backend:8080`)
  - Gzip compression
  - Static asset caching (1 year)

---

## 🔑 Default Credentials

| Role        | Email / Username | Password     |
|-------------|------------------|--------------|
| Superuser   | `slim`           | `slim123`    |
| Admin       | `admin`          | `admin123`   |

> 🔒 **Change these immediately** in a production environment.

---

## 🛠 Useful Docker Commands

```bash
# Build and start all services (detached)
docker-compose up -d --build

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data!)
docker-compose down -v

# Restart a specific service
docker-compose restart filora-backend

# Rebuild a specific service
docker-compose up -d --build filora-ocr-agent

# View real-time logs
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f filora-backend

# Access a container shell
docker exec -it filora-backend sh
docker exec -it filora-ocr-agent bash
docker exec -it filora-db psql -U filora -d filora_db

# Check container resource usage
docker stats
```

---

## 📂 Project Structure

```
FILORA/
├── .env                        # ← Single source of truth for all config
├── docker-compose.yml          # ← Orchestrates all 4 services
├── Filora_DMS_Master_Prompt.md # ← Full project specification
│
├── FILORA-frontend/            # Angular 21 SPA
│   ├── Dockerfile              #   Multi-stage: Node build → Nginx
│   ├── nginx.conf              #   Nginx config (SPA + API proxy)
│   ├── src/                    #   Angular source code
│   └── package.json
│
├── FILORA-backend/             # Spring Boot 3 REST API
│   ├── Dockerfile              #   Multi-stage: Maven build → JRE
│   ├── pom.xml                 #   Maven dependencies
│   └── src/                    #   Java source code
│
├── FILORA-OCR-agent/           # FastAPI OCR Microservice
│   ├── Dockerfile              #   Python 3.11 + Tesseract OCR
│   ├── requirements.txt        #   Python dependencies
│   └── app/
│       ├── main.py             #   FastAPI app entry point
│       ├── routers/ocr.py      #   OCR API endpoints
│       ├── services/           #   OCR, classifier, callback logic
│       └── models/             #   Pydantic schemas
│
├── dms-data/                   # Shared volume — uploaded documents
│   └── upload/
│
└── logs/                       # Shared volume — application logs
```

---

## 📡 API Reference (Backend)

The Spring Boot backend exposes the following REST API groups at `http://localhost:8080`:

<details>
<summary><strong>🔐 Authentication</strong></summary>

| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| POST   | `/api/auth/login`           | Login with email/password |
| POST   | `/api/auth/verify-2fa`      | Verify 2FA OTP code       |
| POST   | `/api/auth/refresh`         | Refresh JWT token         |
| POST   | `/api/auth/forgot-password` | Request password reset    |
| POST   | `/api/auth/reset-password`  | Reset password with token |
| POST   | `/api/auth/logout`          | Logout                    |
| GET    | `/api/auth/me`              | Get current user info     |

</details>

<details>
<summary><strong>👤 Users</strong> (admin, superuser)</summary>

| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| GET    | `/api/users`                      | List all users        |
| POST   | `/api/users`                      | Create user           |
| GET    | `/api/users/{id}`                 | Get user by ID        |
| PUT    | `/api/users/{id}`                 | Update user           |
| DELETE | `/api/users/{id}`                 | Delete user           |
| PUT    | `/api/users/{id}/toggle-active`   | Toggle active status  |
| PUT    | `/api/users/{id}/reset-password`  | Reset user password   |

</details>

<details>
<summary><strong>🏢 Entities</strong></summary>

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/entities`                   | List all entities        |
| POST   | `/api/entities`                   | Create entity            |
| GET    | `/api/entities/{id}`              | Get entity by ID         |
| PUT    | `/api/entities/{id}`              | Update entity            |
| DELETE | `/api/entities/{id}`              | Delete entity            |
| GET    | `/api/entities/{id}/doctypes`     | Get entity doc types     |
| GET    | `/api/entities/{id}/documents`    | Get entity documents     |

</details>

<details>
<summary><strong>📄 Documents</strong></summary>

| Method | Endpoint                              | Description                     |
|--------|---------------------------------------|---------------------------------|
| GET    | `/api/documents`                      | List documents (with filters)   |
| POST   | `/api/documents/upload`               | Upload document (triggers OCR)  |
| PUT    | `/api/documents/{id}`                 | Update document metadata        |
| DELETE | `/api/documents/{id}`                 | Delete document                 |
| POST   | `/api/documents/delete-bulk`          | Bulk delete                     |
| GET    | `/api/documents/{id}/preview`         | Preview file in browser         |
| POST   | `/api/documents/{id}/share`           | Share via email                 |
| GET    | `/api/documents/{id}/download`        | Download original file          |
| GET    | `/api/documents/{id}/download-ocr`    | Download OCR-processed PDF      |
| GET    | `/api/documents/{id}/download-json`   | Download extracted data JSON    |
| POST   | `/api/documents/{id}/reprocess-ocr`   | Re-run OCR on document          |

</details>

<details>
<summary><strong>📂 Temp Documents</strong></summary>

| Method | Endpoint                              | Description                     |
|--------|---------------------------------------|---------------------------------|
| GET    | `/api/temp-documents`                 | List temp documents             |
| POST   | `/api/temp-documents/upload`          | Upload to temp (no OCR)         |
| DELETE | `/api/temp-documents/{id}`            | Delete temp document            |
| POST   | `/api/temp-documents/{id}/promote`    | Promote to entity (triggers OCR)|
| POST   | `/api/temp-documents/delete-bulk`     | Bulk delete                     |

</details>

<details>
<summary><strong>🤝 Partners & Partner Types</strong></summary>

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/partners`           | List partners            |
| POST   | `/api/partners`           | Create partner           |
| GET    | `/api/partners/{id}`      | Get partner by ID        |
| PUT    | `/api/partners/{id}`      | Update partner           |
| DELETE | `/api/partners/{id}`      | Delete partner           |
| GET    | `/api/partner-types`      | List partner types       |
| POST   | `/api/partner-types`      | Create partner type      |
| PUT    | `/api/partner-types/{id}` | Update partner type      |
| DELETE | `/api/partner-types/{id}` | Delete partner type      |

</details>

<details>
<summary><strong>⚙️ Settings</strong> (superuser only)</summary>

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | `/api/settings`  | Get all settings         |
| PUT    | `/api/settings`  | Update settings          |

</details>

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs for the failing service
docker-compose logs filora-backend
```

### Backend can't connect to database

- Ensure `filora-db` is healthy: `docker-compose ps`
- The backend uses `depends_on: condition: service_healthy` — it waits for PostgreSQL to be ready
- Verify DB credentials in `.env` match across `SYSTEM_DB_*` variables

### Port already in use

```bash
# Find what's using the port (Windows)
netstat -ano | findstr :8080

# Kill the process
taskkill /PID <PID> /F
```

Or change the port mapping in `docker-compose.yml` (e.g., `"9090:8080"`).

### OCR agent returns errors

- Check Tesseract is installed: `docker exec filora-ocr-agent tesseract --version`
- Verify health: [http://localhost:8000/health](http://localhost:8000/health)
- Check logs: `docker-compose logs -f filora-ocr-agent`

### Rebuild from scratch

```bash
docker-compose down -v --rmi all
docker-compose up -d --build
```

> ⚠️ This removes all volumes (database data) and images. Use with caution.

---

## 📜 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Made with ❤️ by the Filora team
</p>
