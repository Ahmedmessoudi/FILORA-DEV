# Filora DMS — Implementation Plan

> Full-stack Document Management System with OCR-powered invoice classification.
> **4 services**: Angular frontend, Spring Boot backend, PostgreSQL database, FastAPI OCR agent.

## Current State

All three service directories exist but contain only scaffolded starter code:

| Service | Status |
|---|---|
| `FILORA-backend` | Spring Boot 4.0.6 skeleton — only `FiloraApplication.java` + empty `application.properties` |
| `FILORA-frontend` | Angular 21 skeleton — default `app.ts` with `RouterOutlet`, empty routes, TailwindCSS installed |
| `FILORA-OCR-agent` | Empty directory |

**Everything needs to be built from scratch.**

---

## User Review Required

> [!IMPORTANT]
> **Frontend styling approach**: The Angular project was scaffolded with TailwindCSS v4. The master prompt specifies an Azure-style design system with specific hex colours. I will use **vanilla CSS** with CSS custom properties for the design tokens (as per the colour table in Section 6.2) and remove the TailwindCSS dependency. Confirm if you want to keep Tailwind instead.

> [!IMPORTANT]
> **Spring Boot version**: The current `pom.xml` uses Spring Boot **4.0.6**. The master prompt says "Spring Boot 3". Spring Boot 4.x is recent and may have API differences. I will keep **4.0.6** since it's already scaffolded and is the newer LTS. Confirm if you want to downgrade to 3.x.

> [!WARNING]
> **Chandra OCR**: The spec references "Chandra OCR" for the OCR pipeline. This appears to be a specific OCR library. If it is not publicly available or installable via pip, I will substitute with **Tesseract OCR** (via `pytesseract`) + **pdf2image** as the OCR engine, which provides the same capabilities (text extraction from PDF/images). The invoice classification logic (regex + keyword patterns) will be identical regardless of OCR engine. Please confirm which OCR engine to use.

## Open Questions

> [!IMPORTANT]
> 1. **Chandra OCR availability** — Is `chandra-ocr` installable via pip, or should I use Tesseract as a fallback?
> 2. **SMTP credentials** — Do you have working Gmail SMTP credentials (app password) for testing email features, or should I stub the email service?
> 3. **Deployment target** — Should I optimize the Docker setup for local development only, or also include production Nginx config?
> 4. **Seed data** — The spec mentions default users `slim/slim123` (superuser) and `admin/admin123` (admin). Should I also seed sample entities, doctypes, and partners for demo purposes?

---

## Proposed Changes

The build follows the order recommended in Section 11 of the master prompt. I've split it into **8 phases** to keep each deliverable reviewable and testable.

---

### Phase 1 — Project Infrastructure & Docker Compose

Sets up the root configuration files and Docker orchestration so all services can spin up together.

#### [NEW] [.env](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/.env)
- All environment variables from Sections 2 of the spec
- JWT_SECRET, SMTP, OCR, i18n keys
- Sensible development defaults

#### [NEW] [docker-compose.yml](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/docker-compose.yml)
- 4 services: `filora-db` (Postgres 16), `filora-backend`, `filora-ocr-agent`, `filora-frontend`
- Named volumes for `pgdata`, `dms_data`, `logs_data`
- Env file injection, port mappings as specified

#### [NEW] [FILORA-backend/Dockerfile](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-backend/Dockerfile)
- Multi-stage build: Maven build → JRE 17 runtime

#### [NEW] [FILORA-frontend/Dockerfile](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/Dockerfile)
- Multi-stage build: Node build → Nginx serving the Angular dist

#### [NEW] [FILORA-frontend/nginx.conf](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/nginx.conf)
- SPA fallback routing, API proxy to backend

#### [NEW] [FILORA-OCR-agent/Dockerfile](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/Dockerfile)
- Python 3.11 + Tesseract system deps + pip requirements

#### [NEW] [FILORA-OCR-agent/requirements.txt](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/requirements.txt)
- `fastapi`, `uvicorn`, `pytesseract`, `pdf2image`, `Pillow`, `python-multipart`, `httpx`

---

### Phase 2 — Database (Filora-db)

PostgreSQL schema via Flyway migrations + seed data.

#### [NEW] [FILORA-backend/src/main/resources/db/migration/V1__init_schema.sql](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-backend/src/main/resources/db/migration/V1__init_schema.sql)
- Complete DDL from Section 3.1: `entity`, `users`, `doctype`, `user_entity`, `datatype_entity`, `partnertypes`, `partners`, `partner_entities`, `partner_partnertypes`, `documents`, `temp_documents`, `groups`, `documents_group`, `email_logs`, `audit_logs`, `app_settings`
- All indexes (GIN full-text, composite, foreign key)

#### [NEW] [FILORA-backend/src/main/resources/db/migration/V2__seed_data.sql](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-backend/src/main/resources/db/migration/V2__seed_data.sql)
- Default superuser `slim/slim123` (bcrypt hashed)
- Default admin `admin/admin123` (bcrypt hashed)
- Default app_settings rows for all `.env` keys

#### [MODIFY] [application.properties](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-backend/src/main/resources/application.properties)
- PostgreSQL datasource config (from env vars)
- Flyway enabled
- JPA/Hibernate settings
- JWT, SMTP, file upload, CORS config

---

### Phase 3 — OCR Agent (Filora-OCR-agent)

Standalone FastAPI microservice for OCR processing and invoice classification.

#### [NEW] [FILORA-OCR-agent/app/main.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/main.py)
- FastAPI app with CORS, health check
- Lifespan event for Tesseract validation

#### [NEW] [FILORA-OCR-agent/app/routers/ocr.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/routers/ocr.py)
- `POST /ocr/process` — accepts multipart file + optional `document_id`
- `GET /ocr/status/{document_id}` — poll status
- `POST /ocr/reprocess/{document_id}` — re-run OCR
- File type validation (PDF, JPEG, PNG, TIFF, BMP, HEIC, WEBP, DOCX, XLSX → HTTP 415 for unsupported)

#### [NEW] [FILORA-OCR-agent/app/services/ocr_service.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/services/ocr_service.py)
- Tesseract-based text extraction
- PDF → image conversion via `pdf2image`
- DOCX/XLSX → text extraction via `python-docx` / `openpyxl`

#### [NEW] [FILORA-OCR-agent/app/services/classifier.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/services/classifier.py)
- Invoice classification: regex + keyword patterns (`facture`, `invoice`, `FAC-`, `TTC`, `TVA`, `HT`, `échéance`, `bon de commande`)
- Confidence scoring
- Structured data extraction (invoice number, dates, amounts, line items)

#### [NEW] [FILORA-OCR-agent/app/services/callback.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/services/callback.py)
- Async HTTP callback to `POST /api/internal/ocr-callback` on the backend
- Retry logic with exponential backoff

#### [NEW] [FILORA-OCR-agent/app/models/schemas.py](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-OCR-agent/app/models/schemas.py)
- Pydantic models: `OcrResult`, `ExtractedData`, `LineItem` matching the schema in Section 4.3

---

### Phase 4 — Backend (Filora-backend / Spring Boot)

The largest phase. Broken into sub-components.

#### 4A — Core Configuration & Security

#### [MODIFY] [pom.xml](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-backend/pom.xml)
- Add dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-mail`, `spring-boot-starter-validation`, `postgresql` driver, `flyway-core`, `jjwt` (io.jsonwebtoken), `lombok`, `springdoc-openapi`

#### [NEW] Core config classes under `com.Backend.FILORA.config/`:
- **SecurityConfig.java** — Spring Security 6 filter chain, JWT filter, CORS, CSRF, bcrypt encoder (strength 12), role hierarchy, HTTP security headers
- **JwtTokenProvider.java** — JWT generation/validation, claims extraction (userId, role, lang)
- **JwtAuthenticationFilter.java** — OncePerRequestFilter, extracts JWT from cookie/header
- **WebConfig.java** — CORS mapping, i18n resolver
- **AppProperties.java** — `@ConfigurationProperties` binding for all `.env` keys

#### 4B — JPA Entities & Repositories

#### [NEW] JPA entity classes under `com.Backend.FILORA.entity/`:
- `EntityCompany.java`, `User.java`, `DocType.java`, `UserEntity.java`, `DatatypeEntity.java`, `PartnerType.java`, `Partner.java`, `PartnerEntity.java`, `PartnerPartnerType.java`, `Document.java`, `TempDocument.java`, `Group.java`, `DocumentGroup.java`, `EmailLog.java`, `AuditLog.java`, `AppSetting.java`

#### [NEW] Spring Data JPA repositories under `com.Backend.FILORA.repository/`:
- One repository per entity with custom query methods (full-text search, filtered queries)

#### 4C — Service Layer

#### [NEW] Business logic services under `com.Backend.FILORA.service/`:
- **AuthService.java** — Login, 2FA (email OTP + TOTP), forgot/reset password, brute-force lockout
- **UserService.java** — CRUD, toggle active, reset password, max-users enforcement
- **EntityService.java** — CRUD, max-entities enforcement
- **DocTypeService.java** — CRUD, entity assignment
- **DocumentService.java** — Upload, OCR trigger, update, soft-delete, bulk delete, file streaming, full-text search
- **TempDocumentService.java** — Upload (no OCR), promote to entity/doctype
- **PartnerService.java** / **PartnerTypeService.java** — CRUD
- **GroupService.java** — CRUD, add/remove documents
- **EmailService.java** — SMTP email sending with attachments (original/OCR PDF/JSON)
- **OcrIntegrationService.java** — Async HTTP calls to OCR agent, callback handler
- **SettingsService.java** — Read/write app_settings, .env sync
- **AuditService.java** — Log all CUD operations
- **FileStorageService.java** — File save/retrieve under `ENTITIES_DATA_PATH/{company_id}/{doctype_id}/`

#### 4D — REST Controllers

#### [NEW] REST controllers under `com.Backend.FILORA.controller/`:
- **AuthController.java** — `/api/auth/*` (login, verify-2fa, refresh, forgot-password, reset-password, logout, me)
- **UserController.java** — `/api/users/*` (CRUD + toggle-active + reset-password)
- **EntityController.java** — `/api/entities/*` (CRUD + doctypes + documents)
- **DocTypeController.java** — `/api/doctypes/*` (CRUD + assign/remove entity)
- **DocumentController.java** — `/api/documents/*` (upload, CRUD, preview, share, download variants, reprocess-ocr, bulk delete)
- **TempDocumentController.java** — `/api/temp-documents/*` (upload, delete, promote, bulk delete)
- **PartnerController.java** — `/api/partners/*`
- **PartnerTypeController.java** — `/api/partner-types/*`
- **GroupController.java** — `/api/groups/*` (CRUD + add/remove document)
- **SettingsController.java** — `/api/settings` (GET/PUT, superuser only)
- **InternalController.java** — `/api/internal/ocr-callback` (called by OCR agent)

#### 4E — DTOs, Exception Handling, i18n

#### [NEW] DTOs under `com.Backend.FILORA.dto/`:
- Request/Response DTOs for each controller (e.g., `LoginRequest`, `LoginResponse`, `UserDto`, `DocumentDto`, `OcrCallbackPayload`, etc.)

#### [NEW] Exception handling under `com.Backend.FILORA.exception/`:
- **GlobalExceptionHandler.java** — `@RestControllerAdvice` with i18n error messages
- Custom exceptions: `ResourceNotFoundException`, `MaxLimitReachedException`, `FileValidationException`, `AccountLockedException`

#### [NEW] i18n message files:
- `messages_fr.properties`, `messages_en.properties`

---

### Phase 5 — Frontend (Filora-frontend / Angular)

The UI layer, following the Azure-style design system from Section 6.

#### 5A — Design System & Global Styles

#### [MODIFY] [styles.css](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/src/styles.css)
- CSS custom properties for the full colour palette (Section 6.2)
- Typography (Inter font from Google Fonts)
- Global resets, scrollbar styling, table base styles
- Remove TailwindCSS references

#### [MODIFY] [package.json](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/package.json)
- Add: `@ngx-translate/core`, `@ngx-translate/http-loader`, `@angular/platform-browser-dynamic`, `@angular/animations`, `ngx-toastr`
- Remove TailwindCSS dev dependencies

#### 5B — Core Services & Guards

#### [NEW] Angular services under `src/app/core/`:
- **auth.service.ts** — Login, 2FA, refresh, logout, token management
- **auth.interceptor.ts** — Attach JWT to requests, handle 401
- **auth.guard.ts** — `CanActivate` route guard checking roles
- **api.service.ts** — Base HTTP service with error handling
- **user.service.ts**, **entity.service.ts**, **document.service.ts**, **doctype.service.ts**, **partner.service.ts**, **partner-type.service.ts**, **group.service.ts**, **settings.service.ts**, **temp-document.service.ts**
- **toast.service.ts** — Notification wrapper

#### 5C — Shell Layout (Navbar + Sidebar)

#### [NEW] Shell components under `src/app/layout/`:
- **shell.component.ts** — Wrapper with fixed navbar + sidebar + content area
- **navbar.component.ts** — Logo, search bar, DMS button, TOOLS dropdown (admin/superuser only), profile menu, language toggle
- **sidebar.component.ts** — Entity list with collapsible doctype sub-lists, "Temp Documents" entry at top, active state highlighting

#### 5D — Auth Pages

#### [NEW] Auth components under `src/app/pages/auth/`:
- **login.component.ts** — Email + Password, language toggle, 2FA OTP step, force password change
- **forgot-password.component.ts** — Email input, sends reset link
- **reset-password.component.ts** — Token-based password reset form

#### 5E — DMS Pages

#### [NEW] DMS components under `src/app/pages/dms/`:
- **temp-documents.component.ts** — Temp docs table with upload modal
- **entity-documents.component.ts** — Entity docs table with full filter panel
- **entity-doctype-documents.component.ts** — Filtered by entity+doctype

#### [NEW] Shared components under `src/app/shared/`:
- **data-table.component.ts** — Reusable table with fixed header, sorting, column filters (text/dropdown), checkboxes, bulk actions, pagination (10/25/50)
- **filter-panel.component.ts** — Collapsible filter bar with date range, partner, invoice type, OCR status, owner
- **upload-modal.component.ts** — Drag-and-drop file picker + upload progress
- **ocr-review-modal.component.ts** — Two-panel layout: PDF/image viewer (left 40%) + structured form (right 60%)
- **share-modal.component.ts** — Three-tab attachment selector + email composer
- **promote-modal.component.ts** — Promote temp doc with entity/doctype selectors
- **confirm-dialog.component.ts** — Reusable confirmation modal

#### 5F — Management Pages (TOOLS)

#### [NEW] Management components under `src/app/pages/tools/`:
- **users.component.ts** — User CRUD table + form modal (two-column layout)
- **entities.component.ts** — Entity CRUD table + form modal
- **doctypes.component.ts** — DocType CRUD + entity assignment
- **partner-types.component.ts** — PartnerType CRUD
- **partners.component.ts** — Partner CRUD (two-column form)
- **groups.component.ts** — Group CRUD + document management

#### 5G — Settings Page

#### [NEW] [settings.component.ts](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/src/app/pages/settings/settings.component.ts)
- Card-based layout: System Info, Limits, Currency (ISO 4217 dropdown), Language, SMTP, OCR, Security
- Superuser-only route guard
- Warning banner for restart-required changes

#### 5H — Routing

#### [MODIFY] [app.routes.ts](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/src/app/app.routes.ts)
- All routes from Section 6.4 with lazy loading
- Auth guards with role checks
- Redirect `/` → `/dms`

---

### Phase 6 — Internationalisation (i18n)

#### [NEW] [src/assets/i18n/fr.json](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/src/assets/i18n/fr.json)
- Complete French translations for all UI strings, labels, toasts, modals

#### [NEW] [src/assets/i18n/en.json](file:///c:/Users/AHMED/OneDrive/Desktop/FILORA/FILORA-frontend/src/assets/i18n/en.json)
- Complete English translations

---

### Phase 7 — Security Hardening

Cross-cutting across backend and frontend:

- BCrypt strength ≥ 12
- JWT HS256 with ≥ 256-bit secret
- Refresh token (DB-stored)
- `@PreAuthorize` on all management endpoints
- Bean Validation on all DTOs
- MIME type validation on uploads
- CORS restricted to frontend origin
- Rate limiting on auth endpoints (Bucket4j)
- HTTP security headers (X-Content-Type-Options, X-Frame-Options, HSTS, CSP)
- Angular DomSanitizer for user content
- CSRF token for cookie-based auth
- Auto-logout on JWT expiry

---

### Phase 8 — Integration Testing & Final Polish

- Docker Compose `up` end-to-end test
- Seed data verification
- OCR pipeline test with sample invoice images
- Full login → upload → OCR → review → share flow
- Role-based access verification
- i18n toggle verification

---

## Verification Plan

### Automated Tests
```bash
# Backend — Maven tests
cd FILORA-backend && ./mvnw test

# OCR Agent — pytest
cd FILORA-OCR-agent && python -m pytest tests/

# Frontend — Angular tests
cd FILORA-frontend && npm test

# Full stack — Docker Compose
docker-compose up --build
```

### Manual Verification
- Browser walkthrough of complete flow: Login → DMS → Upload → OCR Review → Share → Management pages → Settings
- Test both FR and EN language switches
- Test all three roles (superuser, admin, user) for access control
- Test 2FA email OTP flow
- Test forgot/reset password flow
- Test bulk select + delete/share operations

---

## Estimated File Count

| Service | New Files | Modified Files |
|---|---|---|
| Root (Docker/env) | ~4 | 0 |
| FILORA-backend | ~60 | 2 (pom.xml, application.properties) |
| FILORA-OCR-agent | ~10 | 0 |
| FILORA-frontend | ~50 | 3 (styles.css, package.json, app.routes.ts) |
| **Total** | **~124** | **5** |

> [!NOTE]
> This is a large project. I recommend we execute it phase by phase, verifying each phase works before moving to the next. I'll start with **Phases 1-2** (infrastructure + database), then **Phase 3** (OCR agent), then **Phase 4** (backend), and finally **Phases 5-8** (frontend + i18n + security + testing).
