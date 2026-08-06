ALTER TABLE calendar_oauth_states
ADD COLUMN requested_scopes TEXT NOT NULL DEFAULT '';

ALTER TABLE calendar_oauth_states
ADD COLUMN return_target TEXT NOT NULL DEFAULT 'connections';
