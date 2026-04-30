-- Запусти один раз: `psql $POSTGRES_URL -f lib/db/schema.sql`
-- или вставь в Vercel Postgres → Query.

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  pixel_data JSONB NOT NULL,
  preview_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  model_url TEXT NOT NULL DEFAULT '',
  meshy_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  generation_id TEXT REFERENCES generations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (generation_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_client ON generations(client_id);
CREATE INDEX IF NOT EXISTS idx_generations_style ON generations(style_id);
CREATE INDEX IF NOT EXISTS idx_likes_generation ON likes(generation_id);
