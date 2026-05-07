CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS games (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  developer      TEXT        NOT NULL DEFAULT '',
  cover_url      TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'WANT',
  dev_status     TEXT        NOT NULL DEFAULT 'ONGOING',
  my_version     TEXT        NOT NULL DEFAULT '',
  latest_version TEXT        NOT NULL DEFAULT '',
  download_url   TEXT        NOT NULL DEFAULT '',
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  notes          TEXT        NOT NULL DEFAULT '',
  description    TEXT        NOT NULL DEFAULT '',
  vndb_id        TEXT,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS games_status_idx  ON games(status);
CREATE INDEX IF NOT EXISTS games_vndb_id_idx ON games(vndb_id);

-- Idempotent column additions for existing databases
ALTER TABLE games ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
