CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'completed', 'missed', 'cancelled')),
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX one_active_booking_per_slot
ON bookings(starts_at)
WHERE status != 'cancelled';

CREATE INDEX bookings_created_at ON bookings(created_at DESC);
CREATE INDEX bookings_email ON bookings(email);

CREATE TABLE email_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX email_events_booking_id ON email_events(booking_id, created_at DESC);
