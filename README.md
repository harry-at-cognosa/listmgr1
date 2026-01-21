# ListMgr1 - Sales Quote Template Manager

A collaborative web application for managing sales quote templates. Users can create, edit, clone, and organize quote templates that contain multiple sections. The app serves as a community collaboration notebook for a small team managing product line sales quote templates across different countries, currencies, and product categories.

## Technology Stack

### Frontend
- **Framework:** React with Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context / useState / useReducer

### Backend
- **Runtime:** Node.js with Express
- **Database:** PostgreSQL
- **Authentication:** Session-based with bcrypt password hashing
- **API:** REST

## Prerequisites

- Node.js v18+
- PostgreSQL installed and running
- npm or yarn package manager

## Quick Start

1. **Run the setup script:**
   ```bash
   ./init.sh
   ```

2. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on http://localhost:3001

3. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on http://localhost:5173

## Default Users

The application comes with pre-seeded users:

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin    | Admin |
| harry    | harry    | User  |
| clint    | clint    | User  |

## User Roles

### Admin
- Full CRUD on all tables
- User management (add, edit, delete users)
- Can delete records (currencies, countries, templates, etc.)

### User
- Create, read, update on all data tables
- Cannot delete records
- Cannot access user management

## Features

### Reference Tables
- **Currencies:** Manage currency symbols and names
- **Countries:** Manage countries with associated currencies
- **Product Categories:** Organize products by category
- **Product Lines:** Define product lines within categories
- **Section Types:** Configure template section types

### Templates
- Create and edit quote templates
- Filter by country, product category, product line, active status
- Search by template name
- Clone templates (deep copy with all sections)
- Status workflow: not started → in process → in review → approved
- Status cascade to all sections

### Sections
- Tabbed editing interface
- Collapsible section list view
- Clone individual sections
- Section types from reference table

## Project Structure

```
listmgr1/
├── backend/           # Express.js API server
│   ├── routes/        # API route handlers
│   ├── models/        # Database models
│   ├── middleware/    # Auth and other middleware
│   └── config/        # Configuration files
├── frontend/          # React/Vite application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context providers
│   │   └── api/         # API client functions
│   └── public/        # Static assets
├── prompts/           # Agent prompts and specifications
├── init.sh            # Setup script
└── README.md          # This file
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and authentication
- `currency` - Currency reference data
- `country` - Country reference data with FK to currency
- `product_cat` - Product categories
- `product_line` - Product lines with FK to product_cat
- `plsqts_type` - Section types configuration
- `plsq_templates` - Quote templates
- `plsqt_sections` - Template sections

All tables include `last_update_datetime` and `last_update_user` audit fields.

## Development

This project is being built by autonomous AI coding agents. The feature list is tracked in `features.db` (SQLite) and serves as the single source of truth for what needs to be implemented.

### Feature Tracking

- Features are stored in the features database
- Each feature has a priority, category, name, description, and test steps
- Features are marked as passing once implemented and verified

## License

Private project for internal team use.
