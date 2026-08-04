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
