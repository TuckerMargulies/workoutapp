-- ============================================================
-- Migration 002: User profiles table
-- Stores AI trainer memory / user profile built during onboarding
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fitness_level TEXT NOT NULL DEFAULT 'intermediate',
  goals JSONB DEFAULT '[]',
  trainer_name TEXT NOT NULL DEFAULT 'Coach',
  voice_input_preference TEXT NOT NULL DEFAULT 'push-to-talk',
  training_days_per_week INTEGER NOT NULL DEFAULT 3,
  location_profiles JSONB DEFAULT '[]',
  chronic_injuries JSONB DEFAULT '[]',
  short_term_injuries JSONB DEFAULT '[]',
  recent_session_summaries JSONB DEFAULT '[]',
  total_sessions_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile"
  ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- Also add debrief columns to workout_logs that are missing
ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS debrief_transcript TEXT,
  ADD COLUMN IF NOT EXISTS debrief_summary TEXT,
  ADD COLUMN IF NOT EXISTS effort_level TEXT,
  ADD COLUMN IF NOT EXISTS pain_notes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS completed_exercise_names JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skipped_exercise_names JSONB DEFAULT '[]';
