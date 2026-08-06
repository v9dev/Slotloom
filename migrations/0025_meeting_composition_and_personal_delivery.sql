ALTER TABLE booking_links
ADD COLUMN allow_custom_meeting_title INTEGER NOT NULL DEFAULT 0;

ALTER TABLE booking_links
ADD COLUMN allow_additional_attendees INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bookings
ADD COLUMN meeting_title TEXT;

ALTER TABLE workspace_users
ADD COLUMN email_provider_preference TEXT NOT NULL DEFAULT 'auto'
CHECK (email_provider_preference IN ('auto', 'google', 'microsoft'));

CREATE TABLE booking_attendees (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  source TEXT NOT NULL CHECK (source IN ('visitor', 'organizer')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (booking_id, email)
);

CREATE INDEX booking_attendees_booking
ON booking_attendees(booking_id, created_at);

INSERT INTO workspace_settings (
  setting_key,
  setting_value,
  updated_at
)
SELECT
  'email_fallback_method',
  CASE
    WHEN setting_value IN ('worker', 'google', 'microsoft') THEN setting_value
    ELSE 'worker'
  END,
  datetime('now')
FROM workspace_settings
WHERE setting_key = 'email_delivery_method'
ON CONFLICT(setting_key) DO NOTHING;

INSERT INTO workspace_settings (
  setting_key,
  setting_value,
  updated_at
) VALUES
  ('email_fallback_method', 'worker', datetime('now')),
  ('calendar_owner_fallback_enabled', 'true', datetime('now'))
ON CONFLICT(setting_key) DO NOTHING;
