#!/bin/bash

# TCG Tracker Startup Script
# This script starts both the API server and web frontend

echo "🚀 Starting TCG Collection Tracker..."
echo ""

# Check if PostgreSQL is running
if ! psql -U mantis -d tcg_tracker -c "SELECT 1;" &> /dev/null; then
    echo "⚠️  Warning: Database connection failed!"
    echo "Make sure PostgreSQL is running and database 'tcg_tracker' exists."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Database connection OK"
echo ""

# Start both servers
echo "Starting API server (http://localhost:3001) and Frontend (http://localhost:5174)..."
echo ""

bun run dev
