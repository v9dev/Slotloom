INSERT OR IGNORE INTO workspace_settings (setting_key,setting_value,updated_at) VALUES
  ('app_name','Slotloom',datetime('now')),
  ('brand_tagline','Scheduling, without the overhead.',datetime('now')),
  ('brand_mark_url','/brand/mark.svg',datetime('now'));

DELETE FROM availability_rules
WHERE booking_link_id='default-consultation'
  AND NOT EXISTS (
    SELECT 1 FROM bookings WHERE booking_link_id='default-consultation'
  );

DELETE FROM booking_links
WHERE id='default-consultation'
  AND NOT EXISTS (
    SELECT 1 FROM bookings WHERE booking_link_id='default-consultation'
  );
