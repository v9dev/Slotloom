INSERT INTO workspace_settings (
  setting_key,
  setting_value,
  updated_at
) VALUES
  ('booking_auto_reply_enabled', 'true', datetime('now')),
  ('booking_auto_reply_template', 'received', datetime('now'))
ON CONFLICT(setting_key) DO NOTHING;
