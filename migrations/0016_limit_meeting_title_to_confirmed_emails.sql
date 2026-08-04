UPDATE email_templates
SET subject = 'We received your availability',
    text_body = 'Hi {{name}},

Thank you for taking a moment to share your availability. Now you can relax, knowing your preferred time has been recorded safely.

The organizer will review your request and contact you as soon as the meeting is confirmed. You do not need to do anything else right now.',
    updated_at = datetime('now')
WHERE template_key = 'received';

UPDATE email_templates
SET subject = 'Your meeting is cancelled',
    text_body = 'Hi {{name}},

The meeting scheduled for {{time}} has been cancelled. We are sorry for the inconvenience. No further action is required right now.

If the meeting is rescheduled, you will receive a separate email with a link to choose another time. After the organizer confirms the new time, you will receive a meeting confirmation with the joining details.',
    updated_at = datetime('now')
WHERE template_key = 'cancelled';

UPDATE email_templates
SET subject = 'We will arrange another meeting',
    text_body = 'Hi {{name}},

We missed you at the meeting and hope everything is okay. We will send you a separate email with a link to choose another time.

After you select a new slot and the organizer confirms it, you will receive a meeting confirmation with the new date, time, and joining details.',
    updated_at = datetime('now')
WHERE template_key = 'missed';

UPDATE email_templates
SET subject = 'We need to reschedule your meeting',
    text_body = 'Hi {{name}},

We need to reschedule your meeting. Use the button below to review the available slots and select the time that works best for you.

Your selection is a new availability request. After the organizer confirms the time and adds the joining link, you will receive a separate meeting confirmation email.',
    updated_at = datetime('now')
WHERE template_key = 'reschedule';
