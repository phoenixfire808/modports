PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  github_id INTEGER PRIMARY KEY,
  github_login TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS terms_acceptances (
  github_id INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  PRIMARY KEY (github_id, terms_version)
);

CREATE TABLE IF NOT EXISTS oauth_attempts (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_hash TEXT NOT NULL,
  github_id INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  development_stage TEXT NOT NULL CHECK (development_stage IN ('prototype', 'playable', 'released')),
  repo_url TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_owner_verified INTEGER NOT NULL DEFAULT 0 CHECK (repo_owner_verified IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('submitted', 'under_review', 'changes_requested', 'approved', 'published', 'rejected', 'removed')),
  status_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS projects_public_idx ON projects(status, published_at DESC);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(github_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS selections (
  github_id INTEGER NOT NULL REFERENCES users(github_id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (github_id, project_id)
);
CREATE INDEX IF NOT EXISTS selections_project_idx ON selections(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  moderator_github_id INTEGER NOT NULL REFERENCES users(github_id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS moderation_events_project_idx ON moderation_events(project_id, created_at DESC);
