UPDATE email_templates
SET subject = 'We received your availability for {{meeting_title}}',
    text_body = 'Hi {{name}},

Thank you for taking a moment to share your availability. Now you can relax, knowing your preferred time has been recorded safely.

The organizer will review your request and contact you as soon as {{meeting_title}} is confirmed. You do not need to do anything else right now.',
    updated_at = datetime('now')
WHERE template_key = 'received';

UPDATE email_templates
SET subject = 'Your meeting is cancelled',
    text_body = 'Hi {{name}},

{{meeting_title}}, scheduled for {{time}}, has been cancelled. We are sorry for the inconvenience. No further action is required right now.

If the meeting is rescheduled, you will receive a separate email with a link to choose another time. After the organizer confirms the new time, you will receive a meeting confirmation with the joining details.',
    updated_at = datetime('now')
WHERE template_key = 'cancelled';

UPDATE email_templates
SET subject = 'We will reschedule {{meeting_title}}',
    text_body = 'Hi {{name}},

We missed you at {{meeting_title}} and hope everything is okay. We will send you a separate email with a link to choose another time.

After you select a new slot and the organizer confirms it, you will receive a meeting confirmation with the new date, time, and joining details.',
    updated_at = datetime('now')
WHERE template_key = 'missed';

UPDATE email_templates
SET subject = 'We need to reschedule {{meeting_title}}',
    text_body = 'Hi {{name}},

We need to reschedule {{meeting_title}}. Use the button below to review the available slots and select the time that works best for you.

Your selection is a new availability request. After the organizer confirms the time and adds the joining link, you will receive a separate meeting confirmation email.',
    updated_at = datetime('now')
WHERE template_key = 'reschedule';

INSERT OR IGNORE INTO email_templates
  (template_key, name, subject, text_body, enabled, created_at, updated_at)
VALUES
  ('rescheduled_confirmation', 'Rescheduled meeting confirmation',
   'Your rescheduled meeting is confirmed: {{meeting_title}}',
   'Hi {{name}},

Your new meeting time is confirmed. {{meeting_title}} has been scheduled for {{time}}.

Use the button below to join when it is time. A fresh calendar invitation is attached so you can add the updated meeting to your calendar.',
   1, datetime('now'), datetime('now'));
