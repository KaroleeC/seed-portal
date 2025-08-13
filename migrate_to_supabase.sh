#!/bin/bash

# Supabase Database Migration Script
# This script helps migrate your Neon database to Supabase

echo "========================================"
echo "Supabase Database Migration Script"
echo "========================================"
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "ERROR: SUPABASE_DB_URL environment variable is not set"
    echo ""
    echo "Please get your Supabase database URL from:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Click on Settings > Database"
    echo "3. Copy the 'Connection string' (URI format)"
    echo "4. Run: export SUPABASE_DB_URL='your-connection-string-here'"
    echo ""
    exit 1
fi

echo "Step 1: Testing Supabase connection..."
psql "$SUPABASE_DB_URL" -c "SELECT version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: Could not connect to Supabase database"
    echo "Please check your SUPABASE_DB_URL"
    exit 1
fi
echo "✓ Connected to Supabase successfully"
echo ""

echo "Step 2: Importing schema..."
psql "$SUPABASE_DB_URL" < neon_schema.sql
if [ $? -eq 0 ]; then
    echo "✓ Schema imported successfully"
else
    echo "⚠ Schema import had some warnings (this might be normal)"
fi
echo ""

echo "Step 3: Importing data..."
psql "$SUPABASE_DB_URL" < neon_data.sql
if [ $? -eq 0 ]; then
    echo "✓ Data imported successfully"
else
    echo "⚠ Data import had some warnings (check for circular foreign keys)"
    echo "  If you see foreign key errors, try running:"
    echo "  psql \$SUPABASE_DB_URL < neon_full_backup.sql"
fi
echo ""

echo "Step 4: Verifying migration..."
echo "Checking tables..."
psql "$SUPABASE_DB_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | head -20

echo ""
echo "========================================"
echo "Migration complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Verify your data in the Supabase dashboard"
echo "2. Update your Doppler DATABASE_URL to use Supabase"
echo "3. Test your application with the new database"
echo ""