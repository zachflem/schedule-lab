-- Add receives_emails flag to personnel
-- Controls whether a person receives automated email notifications
-- (job scheduled, docket rejected, new enquiry etc.)
-- Defaults to 0; existing personnel with can_login = 1 are opted in
-- so existing notification behaviour is preserved.
ALTER TABLE personnel ADD COLUMN receives_emails INTEGER NOT NULL DEFAULT 0;
UPDATE personnel SET receives_emails = 1 WHERE can_login = 1;
