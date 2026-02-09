# Project Structure - ListMgr1 (Sales Quote Template Manager)

A collaborative web application for managing sales quote templates, built with a React frontend and Node.js/Express backend.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite 5, Tailwind CSS 3    |
| Backend  | Node.js, Express 4                  |
| Database | PostgreSQL (+ SQLite for dev)       |
| Auth     | Session-based with bcrypt           |

---

## Directory Tree

```
1_listmgr/
├── backend/                        # Express API server
│   ├── index.js                    # App entry point & middleware setup
│   ├── package.json
│   ├── .env                        # Environment config (DB credentials, port)
│   │
│   ├── data/
│   │   └── listmgr.db             # SQLite database (dev)
│   │
│   ├── db/
│   │   ├── index.js               # Database connection & query helpers
│   │   ├── schema.sql             # Full PostgreSQL schema definition
│   │   ├── seed.js                # Seed data (users, reference tables)
│   │   ├── setup.js               # SQLite setup script
│   │   ├── setup-postgresql.js    # PostgreSQL setup script
│   │   ├── migrate-105.js         # Migration: feature 105 changes
│   │   └── migrate-111.js         # Migration: feature 111 changes
│   │
│   ├── migrations/
│   │   ├── 114-database-changes.js       # Schema changes for feature 114
│   │   ├── 115-price-conversion-tables.js # Price conversion tables
│   │   ├── 116-customer-contact.js       # Customer contact table
│   │   ├── add-enabled-columns.js        # Add enabled flags to tables
│   │   ├── add-template-section-enabled.js
│   │   ├── verify-114.js                 # Migration verification
│   │   └── verify-115.js                 # Migration verification
│   │
│   ├── routes/
│   │   ├── appSettings.js         # GET/PUT app settings
│   │   ├── auth.js                # Login, logout, session check
│   │   ├── countries.js           # CRUD for countries
│   │   ├── currencies.js          # CRUD for currencies
│   │   ├── customerContacts.js    # CRUD for customer contacts
│   │   ├── documentBlobs.js       # Document upload/download
│   │   ├── priceConversion.js     # Price conversion factors & values
│   │   ├── productCategories.js   # CRUD for product categories
│   │   ├── productLines.js        # CRUD for product lines
│   │   ├── sections.js            # CRUD for template sections
│   │   ├── sectionTypes.js        # CRUD for section types
│   │   ├── templates.js           # CRUD, clone, filter templates
│   │   └── users.js               # User management (admin)
│   │
│   └── templates_docx/            # Uploaded document files
│       ├── test_upload.docx
│       ├── test_upload_v2.docx
│       └── test_upload.txt
│
├── frontend/                       # React SPA
│   ├── index.html                  # HTML entry point
│   ├── favicon.svg
│   ├── package.json
│   ├── vite.config.js              # Vite config (dev server proxy)
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── postcss.config.js           # PostCSS config
│   │
│   └── src/
│       ├── main.jsx                # App bootstrap & ReactDOM render
│       ├── App.jsx                 # Router setup & route definitions
│       ├── index.css               # Global styles & Tailwind imports
│       │
│       ├── components/
│       │   └── Layout.jsx          # App shell: sidebar nav, header, content area
│       │
│       ├── context/
│       │   ├── AuthContext.jsx      # Auth state, login/logout, role checks
│       │   └── SettingsContext.jsx  # App-wide settings (rows per page, etc.)
│       │
│       ├── pages/
│       │   ├── Login.jsx           # Login form
│       │   ├── Templates.jsx       # Template list with filters & search
│       │   ├── TemplateDetail.jsx  # Single template view with sections
│       │   ├── TemplateForm.jsx    # Create/edit template form
│       │   ├── Countries.jsx       # Country reference table management
│       │   ├── Currencies.jsx      # Currency reference table management
│       │   ├── CustomerContacts.jsx # Customer contact management
│       │   ├── PriceConversion.jsx # Price conversion factors UI
│       │   ├── ProductCategories.jsx # Product category management
│       │   ├── ProductLines.jsx    # Product line management
│       │   ├── SectionTypes.jsx    # Section type management
│       │   ├── Settings.jsx        # App settings page
│       │   ├── Users.jsx           # User management (admin only)
│       │   └── NotFound.jsx        # 404 page
│       │
│       ├── services/
│       │   └── api.js              # Axios/fetch wrapper for all API calls
│       │
│       └── utils/
│           └── colorPalette.js     # Shared color constants
│
├── docs/                           # Project documentation
│   ├── add original file names to psql_template records.txt
│   └── document_blob_versioning_guide.md
│
├── png_save/                       # Tracked screenshots (*.png exempt from .gitignore)
│
├── CLAUDE.md                       # AI assistant project instructions
├── .gitignore
├── app_spec.txt                    # Original application specification
└── assistant.db                    # Feature backlog database
```

## Database Schema (Entity Relationships)

```
users
  └── role: admin | user

currency ─────────────────────┐
                              │
country ──────────────────────┤ (currency_id FK)
  │                           │
  ├── country_conversion_pairs│ (from/to country FKs)
  │     └── pconv_factor_values (ccp_id FK, pcf_id FK)
  │
product_cat                   │
  └── product_line            │ (product_cat_id FK)
                              │
plsq_templates ───────────────┘ (country_id, currency_id,
  │                               product_cat_id, product_line_id FKs)
  └── plsqt_sections              (plsqt_id FK, section_type_id FK)
        └── plsqts_type

price_conv_factors
  └── pconv_factor_values         (pcf_id FK)

customer_contact                  (standalone)
```

## API Routes

| Method | Endpoint                         | Description                      |
|--------|----------------------------------|----------------------------------|
| POST   | `/api/auth/login`                | Login                            |
| POST   | `/api/auth/logout`               | Logout                           |
| GET    | `/api/auth/check`                | Check session                    |
| GET    | `/api/currencies`                | List currencies                  |
| POST   | `/api/currencies`                | Create currency                  |
| PUT    | `/api/currencies/:id`            | Update currency                  |
| DELETE | `/api/currencies/:id`            | Delete currency (admin)          |
| GET    | `/api/countries`                 | List countries                   |
| POST   | `/api/countries`                 | Create country                   |
| PUT    | `/api/countries/:id`             | Update country                   |
| DELETE | `/api/countries/:id`             | Delete country (admin)           |
| GET    | `/api/product-categories`        | List product categories          |
| POST   | `/api/product-categories`        | Create product category          |
| PUT    | `/api/product-categories/:id`    | Update product category          |
| DELETE | `/api/product-categories/:id`    | Delete product category (admin)  |
| GET    | `/api/product-lines`             | List product lines               |
| POST   | `/api/product-lines`             | Create product line              |
| PUT    | `/api/product-lines/:id`         | Update product line              |
| DELETE | `/api/product-lines/:id`         | Delete product line (admin)      |
| GET    | `/api/section-types`             | List section types               |
| POST   | `/api/section-types`             | Create section type              |
| PUT    | `/api/section-types/:id`         | Update section type              |
| DELETE | `/api/section-types/:id`         | Delete section type (admin)      |
| GET    | `/api/templates`                 | List/filter templates            |
| POST   | `/api/templates`                 | Create template                  |
| GET    | `/api/templates/:id`             | Get template detail              |
| PUT    | `/api/templates/:id`             | Update template                  |
| DELETE | `/api/templates/:id`             | Delete template (admin)          |
| POST   | `/api/templates/:id/clone`       | Clone template with sections     |
| GET    | `/api/templates/:id/sections`    | List template sections           |
| POST   | `/api/sections`                  | Create section                   |
| PUT    | `/api/sections/:id`              | Update section                   |
| DELETE | `/api/sections/:id`              | Delete section (admin)           |
| GET    | `/api/users`                     | List users (admin)               |
| POST   | `/api/users`                     | Create user (admin)              |
| PUT    | `/api/users/:id`                 | Update user (admin)              |
| DELETE | `/api/users/:id`                 | Delete user (admin)              |
| GET    | `/api/app-settings`              | Get app settings                 |
| PUT    | `/api/app-settings`              | Update app settings              |
| GET    | `/api/price-conversion/*`        | Price conversion endpoints       |
| GET    | `/api/customer-contacts`         | List customer contacts           |
| POST   | `/api/customer-contacts`         | Create customer contact          |
| PUT    | `/api/customer-contacts/:id`     | Update customer contact          |
| DELETE | `/api/customer-contacts/:id`     | Delete customer contact (admin)  |
| POST   | `/api/document-blobs/upload`     | Upload document                  |
| GET    | `/api/document-blobs/:id/download` | Download document              |

## Roles & Permissions

| Action              | Admin | User |
|---------------------|:-----:|:----:|
| Create/Read/Update  |  Yes  | Yes  |
| Delete records      |  Yes  |  No  |
| User management     |  Yes  |  No  |

## Running Locally

```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Frontend (port 5173, proxies to backend)
cd frontend && npm install && npm run dev
```
