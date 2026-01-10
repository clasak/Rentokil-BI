-- Create user_profiles table for alpha testers
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('exec', 'market_director', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician')),
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create alpha_feedback table to store feedback from testers
CREATE TABLE IF NOT EXISTS alpha_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike', 'bug', 'idea')),
  department TEXT NOT NULL,
  page TEXT NOT NULL,
  message TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for feedback
ALTER TABLE alpha_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert feedback
CREATE POLICY "Users can submit feedback"
  ON alpha_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON alpha_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_alpha_feedback_user ON alpha_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_alpha_feedback_type ON alpha_feedback(feedback_type);
