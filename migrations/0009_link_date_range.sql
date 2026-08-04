ALTER TABLE booking_links ADD COLUMN valid_from TEXT;
ALTER TABLE booking_links ADD COLUMN valid_until TEXT;

CREATE INDEX booking_links_validity ON booking_links(status, valid_from, valid_until);
