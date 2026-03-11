-- ============================================================
-- Migration 001: Initial schema
-- Mirrors existing Next.js app schema + new voice/bio columns
-- ============================================================

-- User preferences (breakdown prefs + locations)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  breakdown_preferences JSONB DEFAULT '[]',
  locations JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout logs
CREATE TABLE IF NOT EXISTS workout_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  total_time_allotted_sec INTEGER NOT NULL,
  total_time_elapsed_sec INTEGER NOT NULL,
  location TEXT NOT NULL,
  equipment JSONB DEFAULT '[]',
  exercises JSONB DEFAULT '[]',
  voice_adjustments JSONB DEFAULT '[]',   -- Phase 2+
  bio_status_flags JSONB DEFAULT '[]',    -- Phase 3+
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs(user_id, date DESC);

-- Current active workout plan
CREATE TABLE IF NOT EXISTS current_plan (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB NOT NULL,
  exercise_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their preferences"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their workout logs"
  ON workout_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their current plan"
  ON current_plan FOR ALL USING (auth.uid() = user_id);
