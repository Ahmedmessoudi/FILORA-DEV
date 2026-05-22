# Filora DMS — Master AI Agent Prompt

> **Usage:** Paste this entire prompt as the system/context message to an AI coding agent (e.g. Claude Code, Cursor, Copilot Workspace, etc.) at the start of a new session. It gives the agent the full picture of the project, architecture, DB schema, UI/UX rules, and all constraints so it can build each service without repeated explanations.

---

## 0. Project Identity

**Product name:** Filora
**Current environment name (from .env):** `FiloraDEV`
**Languages supported:** French (fr) and English (en) — user-selectable at login, persisted in their profile/session.
**Currency:** Configurable by the super-user from the Settings page (default: TND). Must be stored in the `.env` as `CURRENCY` and reflected everywhere monetary values are displayed (HT, TVA, TTC).

---

## 1. Architecture — 4 Dockerised Services

| Service | Technology | Role |
|---|---|---|
| `Filora-frontend` | Angular (latest LTS) | SPA — all UI/UX |
| `Filora-backend` | Spring Boot 3 (Java 17+) | REST API, business logic, auth, SMTP, file management |
| `Filora-db` | PostgreSQL 16 | Persistent storage (migrate schema below from MySQL to Postgres) |
| `Filora-OCR-agent` | FastAPI + Chandra OCR | OCR pipeline, invoice detection, data extraction, JSON/TXT indexing |

Each service has its own `Dockerfile`. A root `docker-compose.yml` orchestrates all four with the env variables injected from the `.env` file listed in Section 2.

---

## 2. Environment Configuration (`.env`)

All environment parameters live **only** in `.env`. They are **read-only at runtime** everywhere except the **Settings page**, which is accessible only to the `superuser` role. Changes made through Settings are written back to `.env` and trigger a config reload (no restart required for non-DB params; show a warning for DB params).

```
SYSTEM_ENABLED=True
SYSTEM_NAME=FiloraDEV
SYSTEM_DB_HOST=localhost         # Filora-db container host
SYSTEM_DB_USERNAME=root
SYSTEM_DB_PASSWORD=
SYSTEM_MAX_USERS=12
SYSTEM_MAX_ENTITIES=4
SYSTEM_MAX_EXTERNAL_ENTITIES=4
SYSTEM_MAX_FILE_SIZE=1024        # KB
SYSTEM_LOGS_PATH=../../logs
ENTITIES_DATA_PATH=../../dms-data/upload
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=<configured email>
SMTP_PASSWORD=<configured password>
CURRENCY=TND
```

Add to `.env` (new keys needed by the full solution):
```
JWT_SECRET=<random 256-bit secret>
JWT_EXPIRY_MINUTES=60
TWO_FACTOR_ENABLED=True
TWO_FACTOR_METHOD=EMAIL           # EMAIL or TOTP
OCR_SERVICE_URL=http://filora-ocr-agent:8000
OCR_CONFIDENCE_THRESHOLD=0.75
SUPPORTED_LANGUAGES=fr,en
DEFAULT_LANGUAGE=fr
```

---

## 3. Database Schema (PostgreSQL)

> Migrate the existing MySQL schema to PostgreSQL. The following is the **authoritative, optimised** schema — use it as the single source of truth. Key optimisations over the original `db.py`:
> - `phone` fields changed from `INT` to `VARCHAR(20)` (phone numbers are not integers).
> - Duplicate `CREATE TABLE doctype` removed.
> - `ocr_text` and `extracted_text` changed from `VARCHAR(500/5000)` to `TEXT` (OCR output can be large).
> - `rapport` changed from `VARCHAR(500)` to `TEXT`.
> - Added `file_type VARCHAR(50)` and `mime_type VARCHAR(100)` to `documents` and `temp_documents` for multi-format support.
> - Added `ocr_status ENUM('pending','processing','done','failed')` to `documents`.
> - Added `language VARCHAR(5)` to `users` for per-user language preference.
> - Added `two_fa_secret VARCHAR(255)` and `two_fa_enabled BOOLEAN` to `users`.
> - Added `password_reset_token VARCHAR(255)` and `password_reset_expires TIMESTAMP` to `users`.
> - Added `login_attempts INT DEFAULT 0` and `locked_until TIMESTAMP` to `users` (brute-force protection).
> - Added `tva_rate DECIMAL(5,2)` to `documents` (store the rate used, not just the amount).
> - `documents.flag` soft-delete renamed to `is_deleted BOOLEAN DEFAULT FALSE` for clarity (keep `flag` as alias view for backward compat).
> - Added `audit_logs` table.
> - Added `app_settings` table (key-value store for dynamic settings).
> - `groups` table: add `description TEXT` and `is_active BOOLEAN DEFAULT TRUE`.
> - `temp_documents`: add `file_size INT`, `file_type VARCHAR(50)`, `mime_type VARCHAR(100)`.

### 3.1 Core Tables (DDL — PostgreSQL)

```sql
-- Entities (companies)
CREATE TABLE entity (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('superuser','admin','user')),
    is_active BOOLEAN DEFAULT TRUE,
    has_temporary_password BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    language VARCHAR(5) DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document types
CREATE TABLE doctype (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User ↔ Entity access
CREATE TABLE user_entity (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, company_id)
);

-- DocType ↔ Entity assignment
CREATE TABLE datatype_entity (
    id SERIAL PRIMARY KEY,
    datatype_id INT NOT NULL REFERENCES doctype(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (datatype_id, company_id)
);

-- Partner types
CREATE TABLE partnertypes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    trade_name VARCHAR(255),
    unique_identifier VARCHAR(100) NOT NULL UNIQUE,
    mailing_address TEXT NOT NULL,
    billing_address TEXT,
    phone1 VARCHAR(20) NOT NULL UNIQUE,
    phone2 VARCHAR(20),
    phone3 VARCHAR(20),
    email VARCHAR(100) NOT NULL UNIQUE,
    payment_terms VARCHAR(255),
    billing_terms VARCHAR(255),
    bank_account_number VARCHAR(50) UNIQUE,
    bank_name VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner ↔ Entity
CREATE TABLE partner_entities (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    UNIQUE (partner_id, company_id)
);

-- Partner ↔ PartnerType
CREATE TABLE partner_partnertypes (
    id SERIAL PRIMARY KEY,
    partner_id INT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    partnertype_id INT NOT NULL REFERENCES partnertypes(id) ON DELETE CASCADE,
    UNIQUE (partner_id, partnertype_id)
);

-- Documents (fully processed / assigned)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255),
    filename VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INT REFERENCES entity(id) ON DELETE CASCADE,
    doctype_id INT REFERENCES doctype(id) ON DELETE CASCADE,
    partner_id INT REFERENCES partners(id) ON DELETE SET NULL,
    file_path VARCHAR(500),
    file_size INT DEFAULT 0,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    -- OCR fields
    ocr_status VARCHAR(20) DEFAULT 'pending' CHECK (ocr_status IN ('pending','processing','done','failed')),
    ocr_text TEXT,
    extracted_text TEXT,
    extracted_data JSONB,         -- full structured OCR payload
    rapport TEXT,
    -- Invoice classification
    is_invoice BOOLEAN DEFAULT FALSE,
    invoice_number VARCHAR(100),
    document_date DATE,
    due_date DATE,
    total_ht DECIMAL(12,2),
    tva_rate DECIMAL(5,2),
    tva DECIMAL(12,2),
    total_ttc DECIMAL(12,2),
    currency VARCHAR(10),
    -- Soft delete & timestamps
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_doctype ON documents(doctype_id);
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_is_invoice ON documents(is_invoice);
CREATE INDEX idx_documents_ocr_status ON documents(ocr_status);
-- Full-text search index on extracted content
CREATE INDEX idx_documents_fts ON documents USING GIN (to_tsvector('french', COALESCE(extracted_text,'')));

-- Temp documents (not yet assigned to entity/doctype — no OCR applied)
CREATE TABLE temp_documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT DEFAULT 0,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document groups
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    company_id INT REFERENCES entity(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents_group (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, group_id)
);

-- Email logs
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipients JSONB,
    email_type JSONB,
    status VARCHAR(10) CHECK (status IN ('sent','failed')),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application settings (key-value, managed via Settings page)
CREATE TABLE app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Filora-OCR-Agent (FastAPI + Chandra OCR)

### 4.1 Purpose
Receives documents (images, PDFs, TIFF, JPEG, PNG, BMP, HEIC, Word, etc.), runs Chandra OCR, classifies whether the document is **facturable** (an invoice/bill) or **non-facturable**, and if facturable extracts all structured financial data.

### 4.2 Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ocr/process` | Main endpoint. Accepts `multipart/form-data` with `file` + optional `document_id` (DB reference). Returns `OcrResult`. |
| `GET` | `/ocr/status/{document_id}` | Poll processing status. |
| `POST` | `/ocr/reprocess/{document_id}` | Re-run OCR on an existing document. |
| `GET` | `/health` | Health check. |

### 4.3 OcrResult Schema

```json
{
  "document_id": 42,
  "ocr_status": "done",
  "is_invoice": true,
  "confidence": 0.94,
  "extracted_text": "full plain text of document...",
  "extracted_data": {
    "invoice_number": "FAC-2024-00123",
    "document_date": "2024-03-15",
    "due_date": "2024-04-15",
    "supplier_name": "Acme Corp",
    "supplier_address": "...",
    "client_name": "...",
    "line_items": [
      { "description": "Service A", "qty": 2, "unit_price": 100.00, "total": 200.00 }
    ],
    "total_ht": 200.00,
    "tva_rate": 19.0,
    "tva": 38.00,
    "total_ttc": 238.00,
    "currency": "TND",
    "payment_terms": "30 days"
  },
  "search_index": "txt",    // "txt" or "json" — configurable
  "language_detected": "fr"
}
```

### 4.4 Invoice Classification Logic
1. Run Chandra OCR to get raw text.
2. Pass text to a lightweight classification step (regex + keyword patterns + optional LLM call) to determine `is_invoice`. Keywords: `facture`, `invoice`, `FAC-`, `TTC`, `TVA`, `HT`, `échéance`, `bon de commande`, etc.
3. If `is_invoice = True`, run structured extraction to populate all financial fields.
4. Store both `extracted_text` (plain) and `extracted_data` (JSON) in the DB for full-text and structured search.
5. Push result back to `Filora-backend` via a callback `POST /api/internal/ocr-callback` or by directly updating the `documents` table (prefer the REST callback approach for loose coupling).

### 4.5 Supported File Types
PDF, JPEG, JPG, PNG, TIFF, BMP, HEIC, WEBP, DOCX, XLSX (convert to image first for OCR). Reject unsupported types with HTTP 415.

---

## 5. Filora-Backend (Spring Boot)

### 5.1 General Rules
- **Framework:** Spring Boot 3, Spring Security 6, Spring Data JPA (Hibernate), Flyway migrations.
- **Auth:** JWT (stateless). Tokens issued on login, refreshed on demand. Secret from `JWT_SECRET` env var.
- **2FA:** On login success, if `two_fa_enabled = true` for the user, send a 6-digit OTP via SMTP. The frontend must then POST `/api/auth/verify-2fa` with the code before receiving the final JWT.
- **TOTP alternative:** Support Google Authenticator-style TOTP if `TWO_FACTOR_METHOD=TOTP`.
- **Forgot password:** `POST /api/auth/forgot-password` — sends a reset link via SMTP. `POST /api/auth/reset-password` — validates token and sets new password.
- **Brute-force protection:** After 5 failed login attempts, lock account for 15 minutes. Increment `login_attempts`, set `locked_until`.
- **Role hierarchy:** `superuser > admin > user`. Route-level `@PreAuthorize` on all management endpoints.
- **CORS:** Allow only the Angular frontend origin (configurable via env).
- **File storage:** Files stored under `ENTITIES_DATA_PATH` in the layout: `/{company_id}/{doctype_id}/{filename}`. Temp docs under `{ENTITIES_DATA_PATH}/temp/{owner_id}/{filename}`.
- **File size validation:** Reject uploads exceeding `SYSTEM_MAX_FILE_SIZE` KB.
- **Audit logging:** Every create/update/delete action on core entities is written to `audit_logs`.
- **i18n:** API error messages returned in the user's preferred language (from JWT claim `lang`).

### 5.2 REST API Surface

#### Auth
```
POST   /api/auth/login
POST   /api/auth/verify-2fa
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/logout
GET    /api/auth/me
```

#### Users (admin + superuser)
```
GET    /api/users
POST   /api/users
GET    /api/users/{id}
PUT    /api/users/{id}
DELETE /api/users/{id}
PUT    /api/users/{id}/toggle-active
PUT    /api/users/{id}/reset-password
```

#### Entities
```
GET    /api/entities
POST   /api/entities                  (admin, superuser)
GET    /api/entities/{id}
PUT    /api/entities/{id}             (admin, superuser)
DELETE /api/entities/{id}             (superuser)
GET    /api/entities/{id}/doctypes
GET    /api/entities/{id}/documents
```

#### Doc Types
```
GET    /api/doctypes
POST   /api/doctypes                  (admin, superuser)
GET    /api/doctypes/{id}
PUT    /api/doctypes/{id}
DELETE /api/doctypes/{id}
POST   /api/doctypes/{id}/assign-entity
DELETE /api/doctypes/{id}/entity/{entityId}
```

#### Documents
```
GET    /api/documents                          (filtered by company/doctype/date/type via query params)
POST   /api/documents/upload                   (multipart — triggers OCR)
PUT    /api/documents/{id}
DELETE /api/documents/{id}
POST   /api/documents/delete-bulk
GET    /api/documents/{id}/preview             (stream file)
POST   /api/documents/{id}/share              (send email)
GET    /api/documents/{id}/download            (original file)
GET    /api/documents/{id}/download-ocr        (OCR PDF)
GET    /api/documents/{id}/download-json       (extracted_data JSON)
POST   /api/documents/{id}/reprocess-ocr
```

#### Temp Documents
```
GET    /api/temp-documents
POST   /api/temp-documents/upload
DELETE /api/temp-documents/{id}
POST   /api/temp-documents/{id}/promote        (move to entity/doctype, triggers OCR)
POST   /api/temp-documents/delete-bulk
```

#### Partners
```
GET    /api/partners
POST   /api/partners
GET    /api/partners/{id}
PUT    /api/partners/{id}
DELETE /api/partners/{id}
```

#### Partner Types
```
GET    /api/partner-types
POST   /api/partner-types
PUT    /api/partner-types/{id}
DELETE /api/partner-types/{id}
```

#### Groups
```
GET    /api/groups
POST   /api/groups
PUT    /api/groups/{id}
DELETE /api/groups/{id}
POST   /api/groups/{id}/add-document
DELETE /api/groups/{id}/document/{docId}
```

#### Settings (superuser only)
```
GET    /api/settings
PUT    /api/settings
```

#### Internal (called by OCR agent, not exposed externally)
```
POST   /api/internal/ocr-callback
```

---

## 6. Filora-Frontend (Angular)

### 6.1 Global Layout — Microsoft Azure Style
The shell component wraps every authenticated page:
- **Navbar (top, fixed, full-width):** Filora logo/name on the left; search bar centred; on the right: **DMS** button (navigates to main documents view) and **TOOLS** dropdown (admin/superuser only) and a settings/profile menu.
- **Sidebar (left, fixed, always visible):** Lists entities. Under each entity, collapsible list of its doctypes. Clicking an entity → shows all docs for that entity. Clicking a doctype → filters to entity + doctype. A "Temp Documents" entry at the top of the sidebar is always visible.
- **Main content area:** right of sidebar, below navbar. No page-level scroll — only table scroll with fixed headers.

### 6.2 Colour System & Button Conventions

| Element | Colour |
|---|---|
| Primary / brand | `#0078D4` (Azure blue) |
| Sidebar bg | `#1B1F23` |
| Sidebar text | `#C9D1D9` |
| Navbar bg | `#FFFFFF` with bottom border `#E1E4E8` |
| Content bg | `#F6F8FA` |
| Card/table bg | `#FFFFFF` |
| **Delete button** | `#C0392B` (muted red — not pure #FF0000) |
| **Modify / Edit button** | `#E67E22` (muted orange) |
| **Add / Confirm button** | `#27AE60` (muted green) |
| **Cancel button** | `#7F8C8D` (grey) |
| Facturable badge | `#1A7F37` green chip |
| Non-facturable badge | `#7F8C8D` grey chip |
| Overdue highlight | `#C0392B` light red row tint |

### 6.3 Table Component (reused everywhere)
Every data table must have:
- Fixed header that stays visible on scroll (only the table body scrolls).
- Column-level sorting (click header → asc/desc toggle, sort icon).
- Column-level search/filter:
  - Free-text columns → inline text input below header.
  - Enum/status columns (role, is_active, is_invoice, ocr_status, etc.) → dropdown filter.
- Checkbox on each row + "select all" checkbox in header.
- Bulk action bar appears when ≥1 rows are selected (Share, Delete).
- Pagination (configurable page size: 10/25/50).
- Responsive: horizontal scroll on small viewports (do not collapse columns).

### 6.4 Pages & Routes

| Route | Page | Accessible by |
|---|---|---|
| `/login` | Login with 2FA step | Public |
| `/forgot-password` | Forgot password | Public |
| `/reset-password?token=` | Reset password | Public |
| `/dms` | Main DMS — Temp Documents (default) | All authenticated |
| `/dms/entity/:entityId` | Entity documents view | Users with access |
| `/dms/entity/:entityId/doctype/:doctypeId` | Entity + DocType documents | Users with access |
| `/tools/users` | User management | admin, superuser |
| `/tools/entities` | Entity management | admin, superuser |
| `/tools/doctypes` | DocType management | admin, superuser |
| `/tools/partner-types` | Partner type management | admin, superuser |
| `/tools/partners` | Partner management | admin, superuser |
| `/tools/groups` | Groups management | admin, superuser |
| `/settings` | App settings | superuser only |

### 6.5 DMS Document Table Columns

**Temp Documents table:**
`#` | Filename | Owner | Upload date | File type | File size | Actions

**Entity Documents table (`/dms/entity/:id`):**
`#` | Filename | DocType | Partner | Invoice? | HT (currency) | TVA (currency) | TTC (currency) | Doc Date | Due Date | OCR Status | Owner | Actions

**Entity+DocType Documents table:**
Same as Entity Documents, minus DocType column (already filtered).

For facturable documents: highlight the HT / TVA / TTC / dates cells in a subtle blue tint. Non-facturable rows use default style. Overdue invoices (due_date < today) get a red-tinted row.

**Actions column (per row):** Preview 👁 | Edit ✏️ | Share 📧 | Delete 🗑

### 6.6 Filters Panel (above each table)
A collapsible filter bar. When viewing entity → entity field is pre-filled and greyed out. When viewing entity+doctype → both greyed out. Filter fields:
- Date range (document_date from / to)
- Partner (searchable dropdown)
- Invoice type (All / Facturable / Non-facturable) — dropdown
- OCR Status — dropdown
- Owner — dropdown (admin/superuser only)

### 6.7 Upload Modals

**Upload to Temp (from Temp Documents page):**
Drag-and-drop + file picker. Show note: "No OCR will be applied. Document will not be assigned to any entity." Fields: filename (editable). Submit → POST `/api/temp-documents/upload`.

**Upload to Entity/DocType (from entity or entity+doctype view):**
Same drag-and-drop. When file is dropped and upload begins, the backend triggers OCR. While OCR processes, show a loading state. On OCR complete, the modal transitions to the **OCR Review Form**:

**OCR Review Form Layout (two-panel modal):**
- **Left panel (40%):** PDF/image viewer with zoom in/out controls. Highlight detected regions if Chandra provides bounding boxes.
- **Right panel (60%):** Structured form in sections:
  1. **Document info:** Filename (editable), Document type (auto-filled, editable dropdown), Entity (auto-filled, greyed if uploaded from entity view).
  2. **Partner:** Searchable dropdown linked to `partners` table. Shows partner details on selection.
  3. **Billing info** (shown only if `is_invoice = true`; hidden otherwise): Invoice # | Document date | Due date | HT | TVA rate | TVA amount | TTC | Currency (from system setting, editable per-doc).
  4. **Classification:** `is_invoice` toggle (pre-set by OCR, user can override).
  5. **Notes / extracted text:** Collapsible section showing raw OCR text.
- Submit → PUT `/api/documents/{id}` with confirmed data.

**Promote Temp Document Modal:**
Same as Upload to Entity/DocType but for an existing temp doc. Adds entity/doctype selectors.

### 6.8 Share Modal

Three tabs — the user selects which version(s) to attach:
1. **Original** — raw uploaded file
2. **OCR PDF** — searchable PDF generated from OCR output
3. **JSON Export** — `extracted_data` JSON file

Email composer fields:
- To (multiple recipients, with type-ahead from partners/users emails)
- CC / BCC (collapsible)
- Subject (pre-filled: `[Filora] {document_filename}`)
- Body (rich text or plain text)
- Attachments checklist (Original / OCR PDF / JSON)

### 6.9 Management Pages

All management pages follow the same table style as Section 6.3.

**Users Management columns:**
Username | Surname | Email | Role (dropdown filter) | Active (dropdown filter) | 2FA | Entities | Created | Actions (Edit, Toggle active, Reset password, Delete)

**Form layout:** Two-column grid for all fields when form has > 4 fields to prevent scroll.

**Entities Management columns:**
Name | Email | Phone | Active | Description | Created | Actions

**DocTypes Management columns:**
Name | Status | Assigned Entities | Created | Actions

**Partner Types columns:**
Name | Status | Created | Actions

**Partners Management columns:**
Company Name | Trade Name | Identifier | Email | Phone | Payment Terms | Active | Entities | Types | Actions

**Groups Management columns:**
Name | Entity | Description | Active | Created By | Created | Actions

### 6.10 Settings Page (superuser only)

Organized in cards/sections:
- **System Info:** SYSTEM_NAME, SYSTEM_ENABLED toggle.
- **Limits:** MAX_USERS, MAX_ENTITIES, MAX_EXTERNAL_ENTITIES, MAX_FILE_SIZE.
- **Currency:** Dropdown with all ISO 4217 currencies.
- **Language defaults:** DEFAULT_LANGUAGE dropdown.
- **SMTP:** HOST, PORT, EMAIL, PASSWORD (masked).
- **OCR:** OCR_SERVICE_URL, OCR_CONFIDENCE_THRESHOLD, search index format (TXT / JSON).
- **Security:** JWT_EXPIRY_MINUTES, TWO_FACTOR_ENABLED, TWO_FACTOR_METHOD.

All edits → PUT `/api/settings`. Confirmation toast on save. Show warning banner if a restart-required key was changed.

### 6.11 Login Page

- Email + Password fields.
- "Forgot password?" link.
- Language toggle (FR/EN) — persisted in localStorage and sent in requests.
- After first credential validation, if 2FA enabled: show OTP input screen with 60-second countdown.
- If `has_temporary_password = true`: force password change screen before entering the app.
- HTTPS enforced in production (Nginx + cert in Docker).

### 6.12 Security (Frontend)
- Store JWT in `httpOnly` cookie (via Spring Boot `Set-Cookie`) OR `localStorage` — prefer `httpOnly` cookie to prevent XSS.
- Route guards (`CanActivate`) check role for every protected route.
- Sanitize all user-generated content rendered in the DOM (Angular DomSanitizer).
- CSRF token for cookie-based auth (Spring Security CSRF filter).
- Auto-logout on JWT expiry.
- No sensitive data in URL params.

---

## 7. Security Checklist (Backend)

- [ ] `BCryptPasswordEncoder` with strength ≥ 12.
- [ ] JWT signed with `HS256`, secret ≥ 256 bits, short expiry (60 min default).
- [ ] Refresh token with longer TTL stored server-side (Redis or DB).
- [ ] Role-based method security (`@PreAuthorize`).
- [ ] Input validation with Bean Validation (`@Valid`, `@NotBlank`, `@Size`, `@Email`).
- [ ] SQL injection prevention: always use parameterised queries / JPA repositories.
- [ ] File upload: validate MIME type server-side (not just extension), scan for zip-bombs.
- [ ] CORS restricted to frontend origin.
- [ ] Rate limiting on auth endpoints (Spring Boot + Bucket4j or similar).
- [ ] Secrets never logged or returned in API responses.
- [ ] HTTPS in production (Nginx reverse proxy).
- [ ] HTTP security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.

---

## 8. Search Strategy

**Metadata search:** All filter fields in the table (filename, partner, dates, invoice type, OCR status, entity, doctype) map to SQL `WHERE` clauses with indexes.

**Full-text search (extracted content):**
- Store `extracted_text` as plain text in `documents`.
- Use PostgreSQL `tsvector` GIN index (see DDL above) for fast full-text search in French/English.
- API endpoint: `GET /api/documents?q=search+term` triggers `to_tsquery` search on `extracted_text` combined with metadata filters.
- Alternative JSON path search on `extracted_data` JSONB for structured field searches (e.g., find all docs with `total_ttc > 1000`).

The choice of TXT vs JSON indexing format is a system setting configurable by the super-user.

---

## 9. Docker Compose Structure

```yaml
version: '3.9'
services:
  filora-db:
    image: postgres:16
    env_file: .env
    environment:
      POSTGRES_DB: filora_db
      POSTGRES_USER: ${SYSTEM_DB_USERNAME}
      POSTGRES_PASSWORD: ${SYSTEM_DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  filora-backend:
    build: ./filora-backend
    env_file: .env
    depends_on:
      - filora-db
      - filora-ocr-agent
    ports:
      - "8080:8080"
    volumes:
      - dms_data:${ENTITIES_DATA_PATH}
      - logs_data:${SYSTEM_LOGS_PATH}

  filora-ocr-agent:
    build: ./filora-ocr-agent
    env_file: .env
    ports:
      - "8000:8000"
    volumes:
      - dms_data:${ENTITIES_DATA_PATH}

  filora-frontend:
    build: ./filora-frontend
    ports:
      - "4200:80"     # Nginx serves Angular build
    depends_on:
      - filora-backend

volumes:
  pgdata:
  dms_data:
  logs_data:
```

---

## 10. Internationalisation (i18n)

- Angular `i18n` with `@ngx-translate/core`.
- Two translation files: `assets/i18n/fr.json` and `assets/i18n/en.json`.
- All UI strings, labels, toast messages, modal titles must be translated.
- The user selects language on the login screen. Preference saved in their profile via PUT `/api/users/{id}` (`language` field). Falls back to `DEFAULT_LANGUAGE` from env.
- Backend: error messages localised based on `Accept-Language` header derived from the JWT `lang` claim.

---

## 11. Build Order Recommendation

1. **Filora-db** — Run migrations, seed default users (superuser `slim/slim123`, admin `admin/admin123`).
2. **Filora-OCR-agent** — Implement `/ocr/process`, classification, extraction, callback. Test with sample invoices.
3. **Filora-backend** — Auth, users, entities, doctypes, documents CRUD, file upload/storage, OCR trigger, email. Integrate OCR callback.
4. **Filora-frontend** — Shell (navbar + sidebar), login, DMS pages (temp + entity + entity/doctype), management pages, settings, modals.

---

## 12. Notes & Constraints Summary

- No page-level scroll anywhere — only table-internal scroll with sticky header.
- Sidebar always visible and accessible on all authenticated pages.
- Facturable / Non-facturable distinction must be visually obvious in all document tables (badge + row tint).
- All monetary values (HT, TVA, TTC) always displayed with the system currency symbol/code.
- Currency is a system-wide setting (super-user), but can be overridden per document.
- Bulk select (select all + multi-select) for Share and Delete on all document tables.
- All management forms with many fields use a two-column layout to avoid vertical scroll.
- The filter panel greys out pre-selected context fields (entity, doctype) depending on current navigation context.
- TOOLS menu in navbar is only rendered for `admin` and `superuser` roles.
- Settings page is strictly `superuser` only.
- The `.env` file is the single source of truth for all configuration — no hardcoded values in code.
- All API keys, secrets, and credentials are loaded from environment variables only.
- OCR is only triggered when uploading directly to an entity/doctype or when promoting a temp document.
- Uploading to temp documents does NOT trigger OCR.
