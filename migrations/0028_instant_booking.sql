DELETE FROM workspace_settings
WHERE setting_key IN (
  'booking_auto_reply_enabled',
  'booking_auto_reply_template'
);

DELETE FROM email_templates
WHERE template_key = 'received';

UPDATE booking_links
SET description = 'Choose a convenient time and receive your meeting invitation right away.',
    updated_at = datetime('now')
WHERE id = 'default-consultation'
  AND description = 'Choose a convenient time and we will confirm the meeting personally.';
