#!/usr/bin/env node

/**
 * Apply Supabase Migration via REST API
 *
 * This script applies the migration using Supabase's SQL execution endpoint
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://amkzaasbwdubxnmwvink.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFta3phYXNid2R1YnhubXd2aW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTE4NjAsImV4cCI6MjA4MzYyNzg2MH0.A0ctOP8WXODu27FqroZvB6dSIQPn9glLrek0pjLvLLM';

async function applyMigration() {
  console.log('🚀 Applying Supabase Migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/010_action_item_2_tables.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📝 Loaded migration: ${sql.split('\n').length} lines\n`);

  // Note: The anon key typically doesn't have permissions to run DDL
  // This will only work if you have the service role key
  console.log('⚠️  Note: This requires service role key for DDL operations\n');
  console.log('Please apply the migration manually using the Supabase Dashboard:\n');
  console.log('1. Open: https://app.supabase.com/project/amkzaasbwdubxnmwvink/sql');
  console.log('2. Click "New Query"');
  console.log('3. Copy the contents of: supabase/migrations/010_action_item_2_tables.sql');
  console.log('4. Paste into the editor');
  console.log('5. Click "Run" (or press Cmd+Enter)\n');
  console.log('✅ After running, you should see: "Success. No rows returned"\n');
  console.log('📋 Tables created:');
  console.log('   - proposals');
  console.log('   - sales');
  console.log('   - new_starts');
  console.log('   - automation_rules');
  console.log('\n🔒 RLS policies and triggers will be automatically applied\n');
}

applyMigration().catch(console.error);
