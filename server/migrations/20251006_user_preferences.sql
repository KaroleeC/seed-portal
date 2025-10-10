-- User preferences table for cross-device defaults
CREATE TABLE IF NOT EXISTS user_preferences (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  prefs jsonb NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Ensure one row per user/scope
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_preferences_user_scope
  ON user_preferences(user_id, scope);
