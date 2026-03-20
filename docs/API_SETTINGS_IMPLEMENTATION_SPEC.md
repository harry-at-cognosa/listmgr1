# API Settings Implementation Guide for JavaScript/Node App

## Purpose
This document provides specifications for implementing a dynamic settings system in a JavaScript/Node web app with PostgreSQL, replicating functionality from the Cognosa web app (Python/FastAPI backend, React frontend).

---

## 1. DATABASE TABLE

### Schema
```sql
CREATE TABLE public.app_settings (
    name VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Initial Data (seed values)
```json
[
  { "name": "app_version", "value": "1.0" },
  { "name": "db_version", "value": "1.0" },
  { "name": "webapp_main_color", "value": "blue" },
  { "name": "index_page", "value": "<h1>Welcome to SalesQuoteMgr</h1>" },
  { "name": "client_name", "value": "WAB Group USA" }
]
```

### Allowed Setting Names (for validation)
```javascript
const APP_SETTINGS_NAMES = [
  'app_version',
  'db_version',
  'webapp_main_color',
  'index_page',
  'client_name'
];
```

---

## 2. WEBAPP_MAIN_COLOR - UI Theming System

### A. Available Colors (22 Tailwind-style color names)
```javascript
const AVAILABLE_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',  // neutrals
  'red', 'orange', 'amber', 'yellow',            // warm
  'lime', 'green', 'emerald', 'teal',            // greens
  'cyan', 'sky', 'blue',                         // cool blues
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'  // purples/pinks
];
```

### B. Complete Color Palette (hex values for each shade)
```javascript
const COLOR_PALETTE = {
  slate: {
    50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1",
    400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155",
    800: "#1e293b", 900: "#0f172a"
  },
  gray: {
    50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db",
    400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151",
    800: "#1f2937", 900: "#111827"
  },
  zinc: {
    50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8",
    400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46",
    800: "#27272a", 900: "#18181b"
  },
  neutral: {
    50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4",
    400: "#a3a3a3", 500: "#737373", 600: "#525252", 700: "#404040",
    800: "#262626", 900: "#171717"
  },
  stone: {
    50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1",
    400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c",
    800: "#292524", 900: "#1c1917"
  },
  red: {
    50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5",
    400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c",
    800: "#991b1b", 900: "#7f1d1d"
  },
  orange: {
    50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74",
    400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c",
    800: "#9a3412", 900: "#7c2d12"
  },
  amber: {
    50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d",
    400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309",
    800: "#92400e", 900: "#78350f"
  },
  yellow: {
    50: "#fefce8", 100: "#fef9c3", 200: "#fef08a", 300: "#fde047",
    400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207",
    800: "#854d0e", 900: "#713f12"
  },
  lime: {
    50: "#f7fee7", 100: "#ecfccb", 200: "#d9f99d", 300: "#bef264",
    400: "#a3e635", 500: "#84cc16", 600: "#65a30d", 700: "#4d7c0f",
    800: "#3f6212", 900: "#365314"
  },
  green: {
    50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac",
    400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d",
    800: "#166534", 900: "#14532d"
  },
  emerald: {
    50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
    400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
    800: "#065f46", 900: "#064e3b"
  },
  teal: {
    50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4",
    400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
    800: "#115e59", 900: "#134e4a"
  },
  cyan: {
    50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9",
    400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490",
    800: "#155e75", 900: "#164e63"
  },
  sky: {
    50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc",
    400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1",
    800: "#075985", 900: "#0c4a6e"
  },
  blue: {
    50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
    400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
    800: "#1e40af", 900: "#1e3a8a"
  },
  indigo: {
    50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc",
    400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca",
    800: "#3730a3", 900: "#312e81"
  },
  violet: {
    50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
    400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
    800: "#5b21b6", 900: "#4c1d95"
  },
  purple: {
    50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe",
    400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce",
    800: "#6b21a8", 900: "#581c87"
  },
  fuchsia: {
    50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc",
    400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf",
    800: "#86198f", 900: "#701a75"
  },
  pink: {
    50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4",
    400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d",
    800: "#9d174d", 900: "#831843"
  },
  rose: {
    50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af",
    400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
    800: "#9f1239", 900: "#881337"
  }
};
```

### C. Helper Function to Get Color
```javascript
function getColor(colorName, shade) {
  const colorShades = COLOR_PALETTE[colorName];
  if (!colorShades) {
    console.warn(`Color "${colorName}" not found in palette.`);
    return "";
  }
  const hex = colorShades[shade];
  if (hex === undefined) {
    console.warn(`Shade ${shade} not available for color "${colorName}".`);
    return "";
  }
  return hex;
}
```

### D. CSS Variables (add to your main stylesheet)
```css
/* Theme color variables - set dynamically via JavaScript */
:root {
  --theme-color-100: #dbeafe;
  --theme-color-200: #bfdbfe;
  --theme-color-300: #93c5fd;
  --theme-color-400: #60a5fa;
  --theme-color-500: #3b82f6;
  --theme-color-600: #2563eb;
  --theme-color-700: #1d4ed8;
  --theme-color-800: #1e40af;
  --theme-color-900: #1e3a8a;
}

/* Background color utility classes */
.bg-theme-100 { background-color: var(--theme-color-100) !important; }
.bg-theme-200 { background-color: var(--theme-color-200) !important; }
.bg-theme-300 { background-color: var(--theme-color-300) !important; }
.bg-theme-400 { background-color: var(--theme-color-400) !important; }

/* Border color utility classes */
.border-theme-100 { border-color: var(--theme-color-100) !important; }
.border-theme-200 { border-color: var(--theme-color-200) !important; }
.border-theme-300 { border-color: var(--theme-color-300) !important; }
.border-theme-400 { border-color: var(--theme-color-400) !important; }

/* Button with hover states */
.btn-theme {
  background-color: var(--theme-color-200) !important;
  border-color: var(--theme-color-200) !important;
}
.btn-theme:hover {
  background-color: var(--theme-color-300) !important;
  border-color: var(--theme-color-300) !important;
}
.btn-theme:active {
  background-color: var(--theme-color-400) !important;
  border-color: var(--theme-color-400) !important;
}
```

### E. JavaScript to Apply Theme (client-side)
```javascript
function applyThemeColor(colorName) {
  const root = document.documentElement;
  const shades = [100, 200, 300, 400, 500, 600, 700, 800, 900];

  shades.forEach(shade => {
    const hex = getColor(colorName, shade);
    root.style.setProperty(`--theme-color-${shade}`, hex);
  });
}

// Call on app load after fetching settings from API
// e.g., applyThemeColor('blue');
```

---

## 3. APP_VERSION & DB_VERSION - Version Display

### Backend API Response Format
```javascript
// GET /api/app-status (authenticated)
{
  "app_version": "1.0",
  "db_version": "1.0",
  "client_name": "WAB Group USA"
}
```

### Frontend Display Example
```html
<div class="version-info">
  <span>App version: 1.0</span>
  <span>Database version: 1.0</span>
  <span>Client: WAB Group USA</span>
</div>
```

---

## 4. INDEX_PAGE - Customizable Landing Page Content

### Backend Route (public, unauthenticated)
```javascript
// GET / (root route)
// Returns HTML content stored in app_settings.index_page
// Falls back to default if not set

app.get('/', async (req, res) => {
  const result = await db.query(
    "SELECT value FROM app_settings WHERE name = 'index_page'"
  );
  const indexHtml = result.rows[0]?.value || '<h1>Welcome</h1>';
  res.send(indexHtml);
});
```

### Notes
- Stores raw HTML in the database
- Allows per-instance customization of the public landing page
- Admin can edit via settings management UI

---

## 5. CLIENT_NAME - Instance Identification

### Purpose
Displays the client/organization name prominently on the landing page and/or home screen to help identify which instance you're looking at.

### Display Locations
- Landing page (public `/` route) - visible before login
- Home screen header after login
- Optionally in the browser title bar

### Example Display
```
┌─────────────────────────────────────────┐
│  SalesQuoteMgr                          │
│  WAB Group USA                          │
│  App: 1.0 | DB: 1.0                     │
└─────────────────────────────────────────┘
```

---

## 6. BACKEND API ENDPOINTS

### A. Public Settings (unauthenticated)
```
GET /
  - Returns: HTML from index_page setting

GET /api/public-settings
  - Returns: { client_name, app_version, db_version }
  - For displaying on login page
```

### B. Authenticated Settings
```
GET /api/app-settings
  - Returns: { webapp_main_color, app_version, db_version, client_name }
  - Used to apply theme and show version info
```

### C. Admin Management (admin role required)
```
GET /api/admin/settings
  - Returns: all settings with their values

PUT /api/admin/settings/:name
  - Body: { value: "new value" }
  - Updates a setting
  - Validates name against APP_SETTINGS_NAMES list
```

---

## 7. DATA FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                        app_settings TABLE                        │
│  ┌──────────────────┬────────────────────────────────────────┐  │
│  │ name             │ value                                  │  │
│  ├──────────────────┼────────────────────────────────────────┤  │
│  │ app_version      │ "1.0"                                  │  │
│  │ db_version       │ "1.0"                                  │  │
│  │ webapp_main_color│ "blue"                                 │  │
│  │ index_page       │ "<h1>Welcome to SalesQuoteMgr</h1>..." │  │
│  │ client_name      │ "WAB Group USA"                        │  │
│  └──────────────────┴────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐
   │ GET /       │    │ GET /api/   │    │ GET /api/admin/ │
   │ (public)    │    │ app-settings│    │ settings        │
   │             │    │ (auth)      │    │ (admin only)    │
   │ Returns:    │    │             │    │                 │
   │ index_page  │    │ Returns:    │    │ Returns: all    │
   │ HTML        │    │ color,      │    │ settings for    │
   │             │    │ versions,   │    │ management UI   │
   │             │    │ client_name │    │                 │
   └─────────────┘    └─────────────┘    └─────────────────┘
          │                   │
          ▼                   ▼
   ┌─────────────┐    ┌─────────────────────────────────┐
   │ Landing     │    │ App Home Screen                 │
   │ Page        │    │                                 │
   │             │    │ 1. Apply CSS theme variables    │
   │ Shows:      │    │ 2. Display version info         │
   │ - HTML      │    │ 3. Display client name          │
   │   content   │    │                                 │
   └─────────────┘    └─────────────────────────────────┘
```

---

## 8. ADMIN UI FOR MANAGING SETTINGS

The admin should have a simple table/form to:
1. View all current settings
2. Edit setting values
3. For `webapp_main_color`: show a dropdown with the 22 color options (optionally with color preview swatches)
4. For `index_page`: show a textarea for HTML content
5. For `client_name`, `app_version`, `db_version`: simple text inputs

---

## 9. IMPLEMENTATION INSTRUCTIONS FOR CLAUDE CODE

### PHASE 1: Database Seed Data (REQUIRED FIRST STEP)

**Status:** The `app_settings` table has already been created in the database with this schema:

```sql
CREATE TABLE public.app_settings (
    name VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);
```

**Task:** Create a SQL file to insert the initial seed data, then instruct the user to run it.

**Output:** Create a file named `sql/seed_app_settings.sql` containing:

```sql
-- ============================================
-- Seed data for app_settings table
-- Run this script manually against your PostgreSQL database
-- ============================================

INSERT INTO public.app_settings (name, value) VALUES
    ('app_version', '1.0'),
    ('db_version', '1.0'),
    ('webapp_main_color', 'blue'),
    ('index_page', '<h1>Welcome to SalesQuoteMgr</h1>'),
    ('client_name', 'WAB Group USA')
ON CONFLICT (name) DO NOTHING;

-- Verify the data was inserted
SELECT * FROM public.app_settings;
```

**Do NOT:**
- Run this SQL directly against the database
- Modify the table schema

**Tell the user:** "The seed data SQL file has been created at `sql/seed_app_settings.sql`. Please review it and run it manually against your PostgreSQL database before proceeding to Phase 2."

---

### PHASE 2: Application Changes

**Prerequisite:** Ask the user to confirm they have run the Phase 1 seed data script before proceeding.

**Tasks:**

1. **Examine existing patterns first:**
   - How does the app currently connect to PostgreSQL? (pg, Sequelize, Prisma, etc.)
   - Where are database queries located?
   - What is the existing API route structure?
   - What frontend framework is used? (React, Vue, vanilla JS, etc.)

2. **Backend changes:**
   - Add API endpoints following existing route patterns
   - Create database query functions following existing query patterns
   - Add validation for allowed setting names

3. **Frontend changes:**
   - Add the color palette and `getColor()` helper function
   - Add CSS variables and utility classes to main stylesheet
   - Add `applyThemeColor()` function
   - Call the settings API on app load
   - Display version info and client name on home screen

4. **Admin UI:**
   - Add settings management page (admin role required)
   - Include color dropdown with preview swatches
   - Include textarea for index_page HTML

**Do NOT:**
- Create migration files (we are not using a migration system yet)
- Modify the database schema beyond what's in Phase 1
- Change existing functionality unrelated to app_settings

---

## 10. FUTURE CONSIDERATION: Database Migrations

This project does not currently use a database migration system. When future changes require modifying existing tables (not just adding new ones), consider implementing one of these Node.js migration tools:

- **Knex.js** - Query builder with built-in migrations
- **node-pg-migrate** - Lightweight, PostgreSQL-specific
- **Prisma** - Modern ORM with migrations
- **Sequelize** - Full ORM with migrations

For now, database changes are managed via standalone SQL files in the `sql/` directory.

---

This document provides specifications to implement equivalent functionality in a JavaScript/Node application with PostgreSQL.
