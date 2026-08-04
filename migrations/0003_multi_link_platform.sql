CREATE TABLE booking_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  internal_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  days_ahead INTEGER NOT NULL DEFAULT 14,
  minimum_notice_hours INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  allow_slot_holds INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE availability_rules (
  id TEXT PRIMARY KEY,
  booking_link_id TEXT NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

CREATE INDEX availability_rules_link ON availability_rules(booking_link_id, weekday);

INSERT INTO booking_links (
  id, slug, internal_name, title, description, duration_minutes,
  slot_interval_minutes, time_zone, days_ahead, status, created_at, updated_at
) VALUES (
  'default-consultation', 'consultation', 'General consultation', 'Let’s find a time that works',
  'Choose a convenient time and we will confirm the meeting personally.', 30,
  90, 'Asia/Kolkata', 14, 'active', datetime('now'), datetime('now')
);

INSERT INTO availability_rules (id, booking_link_id, weekday, start_time, end_time) VALUES
  ('default-mon', 'default-consultation', 1, '10:00', '17:00'),
  ('default-tue', 'default-consultation', 2, '10:00', '17:00'),
  ('default-wed', 'default-consultation', 3, '10:00', '17:00'),
  ('default-thu', 'default-consultation', 4, '10:00', '17:00'),
  ('default-fri', 'default-consultation', 5, '10:00', '17:00');

ALTER TABLE bookings ADD COLUMN booking_link_id TEXT REFERENCES booking_links(id);
ALTER TABLE bookings ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE bookings ADD COLUMN phone TEXT;
ALTER TABLE bookings ADD COLUMN company TEXT;
ALTER TABLE bookings ADD COLUMN final_starts_at TEXT;
ALTER TABLE bookings ADD COLUMN meeting_url TEXT;
ALTER TABLE bookings ADD COLUMN meeting_notes TEXT;
ALTER TABLE bookings ADD COLUMN meeting_sent_at TEXT;
ALTER TABLE bookings ADD COLUMN assigned_to TEXT;

UPDATE bookings SET booking_link_id = 'default-consultation', workflow_status = status;

DROP INDEX one_active_booking_per_slot;
CREATE UNIQUE INDEX one_active_booking_per_link_slot
ON bookings(booking_link_id, starts_at)
WHERE workflow_status != 'cancelled';

CREATE INDEX bookings_link ON bookings(booking_link_id, created_at DESC);
CREATE INDEX bookings_workflow_status ON bookings(workflow_status, created_at DESC);

CREATE TABLE activity_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  booking_link_id TEXT REFERENCES booking_links(id) ON DELETE CASCADE,
  actor_email TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX activity_booking ON activity_events(booking_id, created_at DESC);
CREATE INDEX activity_link ON activity_events(booking_link_id, created_at DESC);
