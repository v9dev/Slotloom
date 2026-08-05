UPDATE email_templates
SET text_body = 'Hi {{name}},

Great news, {{meeting_title}} is confirmed for {{time}}. Your time has been reserved, and everything you need to join is included below.

A calendar invitation has also been sent with the meeting details. We are looking forward to the conversation.',
    updated_at = datetime('now')
WHERE template_key = 'meeting_details' AND updated_by IS NULL;

UPDATE email_templates
SET text_body = 'Hi {{name}},

Your new meeting time is confirmed. {{meeting_title}} has been scheduled for {{time}}.

Use the button below to join when it is time. Your calendar invitation has been updated with the new meeting details.',
    updated_at = datetime('now')
WHERE template_key = 'rescheduled_confirmation' AND updated_by IS NULL;

UPDATE email_templates
SET text_body = 'Hi {{name}},

Just a friendly reminder that {{meeting_title}} is coming up on {{time}}. We are looking forward to speaking with you.

Use the button below when it is time to join. Your calendar invitation contains the latest meeting details.',
    updated_at = datetime('now')
WHERE template_key = 'reminder' AND updated_by IS NULL;
