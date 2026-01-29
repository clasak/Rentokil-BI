#!/bin/bash

# Apply Migration to Supabase
# This script applies the new migration to your remote Supabase instance

SUPABASE_URL="https://amkzaasbwdubxnmwvink.supabase.co"
MIGRATION_FILE="supabase/migrations/010_action_item_2_tables.sql"

echo "🚀 Applying migration to Supabase..."
echo "Project: $SUPABASE_URL"
echo "Migration: $MIGRATION_FILE"
echo ""

# Read the migration file
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found: $MIGRATION_FILE"
  exit 1
fi

MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "📝 Migration SQL loaded ($(wc -l < "$MIGRATION_FILE") lines)"
echo ""
echo "Please apply this migration using ONE of these methods:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "METHOD 1: Supabase Dashboard (Recommended - Easiest)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Open: https://app.supabase.com/project/amkzaasbwdubxnmwvink/sql"
echo "2. Click 'New Query'"
echo "3. Paste the contents of: $MIGRATION_FILE"
echo "4. Click 'Run' or press Cmd+Enter"
echo "5. Verify success message appears"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "METHOD 2: Using psql (if you have DB password)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get your database password from:"
echo "https://app.supabase.com/project/amkzaasbwdubxnmwvink/settings/database"
echo ""
echo "Then run:"
echo "psql postgresql://postgres.amkzaasbwdubxnmwvink:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres -f $MIGRATION_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After applying the migration, run: npm run dev"
echo "Then test the new API endpoints!"
echo ""
