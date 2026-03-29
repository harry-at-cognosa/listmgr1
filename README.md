# ListMgr1 - Sales Quote Template Manager

A collaborative web application for managing sales quote templates. Users can create, edit, clone, and organize quote templates that contain multiple sections. The app serves as a community collaboration notebook for a small team managing product line sales quote templates across different countries, currencies, and product categories.

This is one half of the Sale Quote Manager solution.

The listmgr project was built entirely with Claude Code -- one half auto-built using LVZ's AutoForge project to support long-running, multi-agent solution construction, and the remainder assisted by Claude Code being used directly.

the project has two halfs - listmgr and listldr.  

The listmgr part was built first, after I used Claude Code directly to build a database schema.  with the table structures defined, I used autoForge (then AutoCoder) to build listmgr, the primary front end for administrative functions.  I also used this portion of the system to populate the database with some initial sales quote templates developed for two country, both across multiple product categories and lines, requiring the use of multiple countries and currencies. I also set up and defined other minor tables for pricing and currency conversionts and to manage those changes over time. 

the initial build created about 125 features over the period of about 4 hours, and included account creation and authentication and some other navigation and data access pages. the initial build included a single error -- it used sqlite3 after specifically having instruction to use postgresql -- but the second invocation of AutoForge told the agents to fix that, and not only did all the changes get made correctly but all the data was cleanly moved over and the conversion was flawless.

Multiple additional features and functions were added to the front end, and then work was paused for phase 2.

The second major build was all done with Python.  I first wrote batch programs to load about 130 sales quote template files across two countries and currrencies into the database, storing the docx files as blobs with a well-architected write-only blob table following best practices for this sort of application. [I also wrote a batch program that could be used to periodically purge old sales templates documents.] 

With the batch processes working well, I used claude code to generate a FastAPI web application that could invoke those jobs via menu items and api calls from the listmgr side of the application, and by refactoring the batch programs to use key routines (e.g. load this word doc into the doc storage and associate it with its corresponding sales quote template record), we have only one set of code doing the template level operations which is shared by the front end that lets end users operate on sigle templates and the back end that runs on say "all the Bead Mills sold in Switzerland". 

In summary, the listmgr code base provides Sales Quote Manager the primary user and admin interface to the application, while the listldr (or list loader) FasatAPI applicaiton implements some of the key business logic and implements the primary batch and periodic functions for the application.

more details about each portion are available at quotemgr-info http://files.cognosa.net/quotemgr-info/. This older has, in addition toa quick overview movie and two detailed PDFs describing the solution, also has a postgresql database that could be used with the system there to run a complete working version of that application.  While not shown in the inex.html web page in that folder, the database file can be downloaded from https://s3.us-east-1.amazonaws.com/files.cognosa.net/quotemgr-info/listmgr1_blue_260228_v1.7b.dump.zip 


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
