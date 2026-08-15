CREATE TABLE IF NOT EXISTS recommendation_links (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  url      TEXT        NOT NULL,
  title    TEXT        NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
