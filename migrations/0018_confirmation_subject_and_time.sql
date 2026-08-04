UPDATE email_templates
SET subject = 'Your meeting is confirmed: {{meeting_title}}',
    text_body = 'Hi {{name}},

Great news, {{meeting_title}} is confirmed for {{time}}. Your time has been reserved, and everything you need to join is included below.

A calendar invitation is attached, so you can add the meeting to your calendar and receive reminders from your preferred calendar app. We are looking forward to the conversation.',
    updated_at = datetime('now')
WHERE template_key = 'meeting_details';

UPDATE email_templates
SET subject = 'Your rescheduled meeting is confirmed: {{meeting_title}}',
    text_body = 'Hi {{name}},

Your new meeting time is confirmed. {{meeting_title}} has been scheduled for {{time}}.

Use the button below to join when it is time. A fresh calendar invitation is attached so you can add the updated meeting to your calendar.',
    updated_at = datetime('now')
WHERE template_key = 'rescheduled_confirmation';
