#!/bin/bash

# ListMgr1 - Sales Quote Template Manager
# Development Environment Setup Script
# ============================================

set -e  # Exit on any error

echo "============================================"
echo "ListMgr1 - Development Environment Setup"
echo "============================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Prerequisites Check
# ============================================
echo "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Check PostgreSQL
if command_exists psql; then
    PSQL_VERSION=$(psql --version)
    print_status "PostgreSQL client found: $PSQL_VERSION"
else
    print_warning "PostgreSQL client (psql) not found in PATH."
    print_warning "Make sure PostgreSQL is installed and running."
fi

echo ""

# ============================================
# Database Setup
# ============================================
echo "Setting up database..."
echo ""

# Database configuration
DB_NAME="listmgr1"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
if pg_isready -h $DB_HOST -p $DB_PORT >/dev/null 2>&1; then
    print_status "PostgreSQL is running on $DB_HOST:$DB_PORT"
else
    print_warning "PostgreSQL may not be running. Please ensure it's started."
    echo "  On macOS with Homebrew: brew services start postgresql"
    echo "  On Ubuntu/Debian: sudo systemctl start postgresql"
fi

# Create database if it doesn't exist
echo "Creating database '$DB_NAME' if it doesn't exist..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
    print_status "Database '$DB_NAME' already exists"
else
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null && \
        print_status "Database '$DB_NAME' created" || \
        print_warning "Could not create database. You may need to create it manually."
fi

echo ""

# ============================================
# Backend Setup
# ============================================
echo "Setting up backend..."
echo ""

cd "$(dirname "$0")/backend" 2>/dev/null || {
    print_warning "Backend directory not found. It will be created during development."
    cd "$(dirname "$0")"
}

if [ -f "package.json" ]; then
    echo "Installing backend dependencies..."
    npm install
    print_status "Backend dependencies installed"

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=

# Server Configuration
PORT=3001
SESSION_SECRET=$(openssl rand -hex 32)

# Environment
NODE_ENV=development
EOF
        print_status "Created backend .env file"
    else
        print_status "Backend .env file already exists"
    fi
else
    print_warning "Backend package.json not found. Backend will be set up during development."
fi

cd "$(dirname "$0")"
echo ""

# ============================================
# Frontend Setup
# ============================================
echo "Setting up frontend..."
echo ""

cd "$(dirname "$0")/frontend" 2>/dev/null || {
    print_warning "Frontend directory not found. It will be created during development."
    cd "$(dirname "$0")"
}

if [ -f "package.json" ]; then
    echo "Installing frontend dependencies..."
    npm install
    print_status "Frontend dependencies installed"
else
    print_warning "Frontend package.json not found. Frontend will be set up during development."
fi

cd "$(dirname "$0")"
echo ""

# ============================================
# Summary
# ============================================
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "To start the development servers:"
echo ""
echo "  Backend (in /backend directory):"
echo "    npm run dev"
echo "    # Runs on http://localhost:3001"
echo ""
echo "  Frontend (in /frontend directory):"
echo "    npm run dev"
echo "    # Runs on http://localhost:5173"
echo ""
echo "Default login credentials:"
echo "  Admin:  username='admin', password='admin'"
echo "  Users:  username='harry', password='harry'"
echo "          username='clint', password='clint'"
echo ""
echo "============================================"
