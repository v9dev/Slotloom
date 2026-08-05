CREATE TABLE calendar_provider_configs (
  provider TEXT PRIMARY KEY CHECK (provider IN ('google', 'microsoft')),
  client_id TEXT NOT NULL,
  client_secret_jwe TEXT NOT NULL,
  tenant_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE calendar_connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  workspace_user_email TEXT NOT NULL COLLATE NOCASE,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  access_token_jwe TEXT NOT NULL,
  refresh_token_jwe TEXT,
  token_expires_at TEXT NOT NULL,
  scopes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error')),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (provider, workspace_user_email)
);

CREATE INDEX calendar_connections_user
ON calendar_connections(workspace_user_email, provider, status);

CREATE TABLE calendar_oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  workspace_user_email TEXT NOT NULL COLLATE NOCASE,
  code_verifier_jwe TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX calendar_oauth_states_expiry
ON calendar_oauth_states(expires_at);

INSERT INTO workspace_settings (
  setting_key,
  setting_value,
  updated_at
) VALUES (
  'calendar_provider',
  'manual',
  datetime('now')
) ON CONFLICT(setting_key) DO NOTHING;

ALTER TABLE bookings ADD COLUMN meeting_provider TEXT;
ALTER TABLE bookings ADD COLUMN meeting_provider_preference TEXT;
ALTER TABLE bookings ADD COLUMN meeting_provider_event_id TEXT;
ALTER TABLE bookings ADD COLUMN meeting_provider_connection_id TEXT;
ALTER TABLE bookings ADD COLUMN meeting_provider_synced_at TEXT;

CREATE INDEX bookings_meeting_provider_event
ON bookings(meeting_provider, meeting_provider_event_id);
