INSERT INTO workspace_settings (
  setting_key,
  setting_value,
  updated_at
) VALUES
  ('email_delivery_method', 'worker', datetime('now')),
  ('email_worker_fallback', 'false', datetime('now'))
ON CONFLICT(setting_key) DO NOTHING;

ALTER TABLE email_events ADD COLUMN delivery_method TEXT;
ALTER TABLE email_events ADD COLUMN sender_email TEXT;
ALTER TABLE email_events ADD COLUMN sender_connection_id TEXT;
ALTER TABLE email_events ADD COLUMN used_fallback INTEGER NOT NULL DEFAULT 0;
