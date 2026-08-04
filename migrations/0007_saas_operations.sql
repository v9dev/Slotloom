CREATE TABLE email_templates (
  template_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO email_templates (template_key,name,subject,text_body,created_at,updated_at) VALUES
('received','Availability received','We received your availability: {{time}}','Hi {{name}},\n\nThanks for sharing your availability. Your preferred time is with us, and the organizer will review it shortly.\n\nYou are all set for now. We will be in touch when the meeting is confirmed.',datetime('now'),datetime('now')),
('meeting_details','Meeting details','Your meeting is confirmed: {{time}}','Hi {{name}},\n\nGreat news, your meeting is confirmed. Everything you need is below, and a calendar invitation is attached for you.',datetime('now'),datetime('now')),
('reminder','Meeting reminder','A friendly reminder for {{time}}','Hi {{name}},\n\nJust a friendly reminder that your meeting is coming up. We are looking forward to speaking with you. Your calendar invitation is attached again for convenience.',datetime('now'),datetime('now')),
('missed','Missed meeting','We will reschedule your meeting','Hi {{name}},\n\nWe missed you at the meeting and hope everything is okay. We will arrange another meeting soon. You will receive an email as soon as the new date, time, and meeting details are ready.\n\nThere is nothing you need to do right now. If you have a preferred time, you can contact the organizer and let them know.',datetime('now'),datetime('now')),
('reschedule','Reschedule request','We need to reschedule your meeting','Hi {{name}},\n\nWe need to reschedule your meeting and choose a new time. Use the button below to review the available slots and select the time that works best for you.\n\nAfter the new time is confirmed, you will receive another email with the updated meeting details.',datetime('now'),datetime('now')),
('cancelled','Meeting cancelled','Your meeting is cancelled: {{time}}','Hi {{name}},\n\nYour meeting has been cancelled. We are sorry for the inconvenience. No further action is required.\n\nIf another meeting is arranged, you will receive a separate email with the new date, time, and joining details.',datetime('now'),datetime('now'));

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX notifications_user_created ON notifications(user_email, created_at DESC);

CREATE TABLE booking_manage_tokens (
  token_hash TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX booking_manage_tokens_booking ON booking_manage_tokens(booking_id, expires_at DESC);

CREATE TABLE link_page_views (
  id TEXT PRIMARY KEY,
  booking_link_id TEXT NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  device_type TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX link_page_views_link_created ON link_page_views(booking_link_id, created_at DESC);

CREATE TABLE workspace_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);
INSERT INTO workspace_settings (setting_key,setting_value,updated_at) VALUES
('data_retention_days','365',datetime('now')),
('turnstile_enabled','false',datetime('now'));

CREATE TABLE request_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);
