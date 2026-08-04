CREATE TABLE email_replies (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  text_body TEXT,
  message_id TEXT,
  received_at TEXT NOT NULL
);

CREATE UNIQUE INDEX email_replies_message_id
ON email_replies(message_id)
WHERE message_id IS NOT NULL;

CREATE INDEX email_replies_booking_id
ON email_replies(booking_id, received_at DESC);
