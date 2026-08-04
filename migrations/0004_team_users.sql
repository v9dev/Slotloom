CREATE TABLE workspace_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  invited_by TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX workspace_users_role_status ON workspace_users(role, status);

CREATE TABLE user_activity_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  target_user_email TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX user_activity_created_at ON user_activity_events(created_at DESC);
CREATE INDEX user_activity_actor ON user_activity_events(actor_email, created_at DESC);
